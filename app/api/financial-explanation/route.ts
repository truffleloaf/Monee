import { NextRequest, NextResponse } from 'next/server'

const MODEL = 'gemini-3.8-flash'
const requests = new Map<string, number[]>()

interface ExplanationFacts {
  currency: string
  lowestBalance: number
  endingBalance: number
  reserve: number
  firstShortfallDate: string | null
  transferDate: string
  rateMovePct: number
}

function parseFacts(value: unknown): ExplanationFacts | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (typeof data.currency !== 'string' || !/^[A-Z]{3}$/.test(data.currency)) return null
  for (const key of ['lowestBalance', 'endingBalance', 'reserve', 'rateMovePct'] as const) {
    if (typeof data[key] !== 'number' || !Number.isFinite(data[key]) || Math.abs(data[key]) > 1e12) return null
  }
  if (typeof data.transferDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.transferDate)) return null
  const firstShortfallDate = data.firstShortfallDate === null ? null : typeof data.firstShortfallDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.firstShortfallDate) ? data.firstShortfallDate : undefined
  if (firstShortfallDate === undefined) return null
  return { currency: data.currency, lowestBalance: data.lowestBalance as number, endingBalance: data.endingBalance as number, reserve: data.reserve as number, firstShortfallDate, transferDate: data.transferDate, rateMovePct: data.rateMovePct as number }
}

function fallback(facts: ExplanationFacts) {
  const currency = facts.currency
  const message = facts.firstShortfallDate
    ? `Under the assumptions you entered, the projected balance first falls below your ${currency} safety reserve on ${facts.firstShortfallDate}. The lowest balance is ${currency} ${facts.lowestBalance.toFixed(2)}, compared with your reserve of ${currency} ${facts.reserve.toFixed(2)}. Review the transfer date, spending, or reserve before relying on this plan.`
    : `Under the assumptions you entered, the projected lowest balance is ${currency} ${facts.lowestBalance.toFixed(2)} and the ending balance is ${currency} ${facts.endingBalance.toFixed(2)}. Your ${currency} reserve is ${facts.reserve.toFixed(2)}. These are scenario calculations, not a prediction; check that the planned transfer arriving ${facts.transferDate} and upcoming payments match your situation.`
  return message
}

function withinLimit(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  const now = Date.now()
  const recent = (requests.get(ip) ?? []).filter((time) => now - time < 60_000)
  if (recent.length >= 5) return false
  requests.set(ip, [...recent, now])
  return true
}

export async function POST(request: NextRequest) {
  const facts = parseFacts(await request.json().catch(() => null))
  if (!facts) return NextResponse.json({ error: 'The scenario summary is invalid.' }, { status: 400 })
  const deterministic = fallback(facts)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ text: deterministic, source: 'fallback', reason: 'Set GEMINI_API_KEY to enable optional Gemini explanations.' })
  if (!withinLimit(request)) return NextResponse.json({ text: deterministic, source: 'fallback', reason: 'The free-tier request limit was reached. Try again in a minute.' })

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Explain these financial scenario calculations to an international student in simple English. Use only the supplied values. Do not invent rates or figures, make predictions, or guarantee outcomes. Mention that this is informational, not financial advice. Values: ${JSON.stringify(facts)}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 220 },
      }),
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    })
    if (!response.ok) return NextResponse.json({ text: deterministic, source: 'fallback', reason: 'Gemini is temporarily unavailable or its free quota was reached.' })
    const data: unknown = await response.json()
    const text = data && typeof data === 'object' && 'candidates' in data && Array.isArray(data.candidates)
      ? (data.candidates[0] as { content?: { parts?: { text?: unknown }[] } } | undefined)?.content?.parts?.map((part) => typeof part.text === 'string' ? part.text : '').join('').trim()
      : ''
    if (!text || text.length > 4000) return NextResponse.json({ text: deterministic, source: 'fallback', reason: 'Gemini returned no usable explanation.' })
    return NextResponse.json({ text, source: 'gemini' })
  } catch {
    return NextResponse.json({ text: deterministic, source: 'fallback', reason: 'Gemini is unreachable; Monee’s calculation-based explanation is shown.' })
  }
}
