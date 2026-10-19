import { NextResponse } from 'next/server'

interface ApiCurrency {
  iso_code: string
  name: string
  symbol?: string | null
  start_date?: string | null
  end_date?: string | null
}

export async function GET() {
  try {
    const response = await fetch('https://api.frankfurter.dev/v2/currencies', { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(12_000) })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) return NextResponse.json({ message: 'The currency list is temporarily unavailable.' }, { status: response.status })
    if (!Array.isArray(body) || body.some((item) => !item || typeof item.iso_code !== 'string' || typeof item.name !== 'string')) {
      return NextResponse.json({ message: 'Frankfurter returned an invalid currency list.' }, { status: 502 })
    }
    const currencies = (body as ApiCurrency[]).map(({ iso_code, name, symbol }) => ({ code: iso_code, name, symbol: symbol ?? iso_code }))
    return NextResponse.json(currencies, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800' } })
  } catch {
    return NextResponse.json({ message: 'The currency list is temporarily unavailable.' }, { status: 502 })
  }
}
