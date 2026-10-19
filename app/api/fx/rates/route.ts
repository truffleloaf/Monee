import { NextRequest, NextResponse } from 'next/server'
import { isValidIso } from '@/lib/dates'
import { filterRateRange } from '@/lib/climate'

const API = 'https://api.frankfurter.dev/v2'
const codePattern = /^[A-Z]{3}$/

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const base = (params.get('base') ?? '').toUpperCase()
  const quote = (params.get('quote') ?? '').toUpperCase()
  const quotes = [...new Set((params.get('quotes') ?? quote).split(',').map((code) => code.trim().toUpperCase()).filter(Boolean))]
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const group = params.get('group')
  if (!codePattern.test(base) || quotes.length === 0 || quotes.length > 50 || quotes.some((code) => !codePattern.test(code)) || !isValidIso(from) || !isValidIso(to) || from > to) {
    return NextResponse.json({ message: 'Choose currencies and a valid date range.' }, { status: 400 })
  }
  if (group && group !== 'week' && group !== 'month') return NextResponse.json({ message: 'Group must be week or month.' }, { status: 400 })
  const url = new URL(`${API}/rates`)
  url.searchParams.set('base', base)
  url.searchParams.set('quotes', quotes.join(','))
  url.searchParams.set('from', from)
  url.searchParams.set('to', to)
  if (group) url.searchParams.set('group', group)
  try {
    const response = await fetch(url, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(12_000) })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      const message = body && typeof body.message === 'string' ? body.message : 'Historical rates are unavailable for this pair and date range.'
      return NextResponse.json({ message }, { status: response.status })
    }
    if (!Array.isArray(body) || body.some((row) => !row || row.base !== base || !quotes.includes(row.quote) || !isValidIso(row.date) || typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0)) {
      return NextResponse.json({ message: 'Frankfurter returned invalid historical rate data.' }, { status: 502 })
    }
    // Frankfurter's weekly/monthly buckets can include the observation before `from`.
    // Keep comparisons inside the requested window instead of silently widening it.
    const inRange = filterRateRange(body as { date: string }[], from, to)
    return NextResponse.json(inRange, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800' } })
  } catch {
    return NextResponse.json({ message: 'Historical rates are temporarily unavailable. Please try again.' }, { status: 502 })
  }
}
