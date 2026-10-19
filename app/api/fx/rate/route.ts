import { NextRequest, NextResponse } from 'next/server'
import { isValidIso, todayIso } from '@/lib/dates'

const API = 'https://api.frankfurter.dev/v2'
const codePattern = /^[A-Z]{3}$/

export async function GET(request: NextRequest) {
  const base = (request.nextUrl.searchParams.get('base') ?? '').toUpperCase()
  const quote = (request.nextUrl.searchParams.get('quote') ?? '').toUpperCase()
  const date = request.nextUrl.searchParams.get('date')
  const refresh = request.nextUrl.searchParams.get('refresh') === '1' && !date
  if (!codePattern.test(base) || !codePattern.test(quote)) {
    return NextResponse.json({ message: 'Choose valid three-letter currency codes.' }, { status: 400 })
  }
  if (date && !isValidIso(date)) return NextResponse.json({ message: 'Enter a valid rate date.' }, { status: 400 })
  if (base === quote) return NextResponse.json({ date: date ?? todayIso(), base, quote, rate: 1 })

  const url = new URL(`${API}/rate/${encodeURIComponent(base)}/${encodeURIComponent(quote)}`)
  if (date) url.searchParams.set('date', date)
  try {
    const response = await fetch(url, { next: { revalidate: date ? 86_400 : refresh ? 0 : 21_600 }, signal: AbortSignal.timeout(12_000) })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      const message = body && typeof body.message === 'string' ? body.message : 'Frankfurter could not find a rate for this pair.'
      return NextResponse.json({ message }, { status: response.status })
    }
    if (!body || body.base !== base || body.quote !== quote || !isValidIso(body.date) || typeof body.rate !== 'number' || !Number.isFinite(body.rate) || body.rate <= 0) {
      return NextResponse.json({ message: 'Frankfurter returned an invalid rate response.' }, { status: 502 })
    }
    return NextResponse.json(body, { headers: { 'Cache-Control': refresh ? 'no-store' : 'public, s-maxage=21600, stale-while-revalidate=86400' } })
  } catch {
    return NextResponse.json({ message: 'Exchange rates are temporarily unavailable. Please try again.' }, { status: 502 })
  }
}
