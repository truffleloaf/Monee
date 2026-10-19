'use client'

import { useEffect, useMemo, useState } from 'react'
import type { RateQuote } from './fx'
import { FX_CURRENCIES, pairKey } from './fx'

export interface FrankfurterRate {
  date: string
  base: string
  quote: string
  rate: number
}

export interface FrankfurterCurrency {
  code: string
  name: string
  symbol: string
}

interface RateState {
  rates: Record<string, RateQuote>
  loading: Record<string, boolean>
  errors: Record<string, string>
  stale: Record<string, boolean>
}

const rateCache = new Map<string, { quote: RateQuote; expiresAt: number }>()
const rateRequests = new Map<string, Promise<RateQuote>>()
const RATE_TTL = 6 * 60 * 60 * 1000

async function fetchRate(base: string, quote: string, force = false): Promise<RateQuote> {
  const key = pairKey(base, quote)
  const cached = rateCache.get(key)
  if (!force && cached && cached.expiresAt > Date.now()) return cached.quote
  const existing = rateRequests.get(key)
  if (existing) return existing
  const request = (async () => {
    const response = await fetch(`/api/fx/rate?base=${encodeURIComponent(base)}&quote=${encodeURIComponent(quote)}${force ? '&refresh=1' : ''}`, { signal: AbortSignal.timeout(15_000) })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : 'The reference rate is unavailable for this currency pair.'
      throw new Error(message)
    }
    if (!body || typeof body !== 'object' || !('base' in body) || !('quote' in body) || !('date' in body) || !('rate' in body)) {
      throw new Error('Frankfurter returned an incomplete rate response.')
    }
    const row = body as FrankfurterRate
    if (row.base !== base || row.quote !== quote || typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      throw new Error('Frankfurter returned an invalid rate response.')
    }
    const result: RateQuote = { rate: row.rate, source: 'frankfurter', label: 'Frankfurter reference rate', updatedAt: row.date, fetchedAt: new Date().toISOString() }
    rateCache.set(key, { quote: result, expiresAt: Date.now() + RATE_TTL })
    return result
  })()
  rateRequests.set(key, request)
  try {
    return await request
  } finally {
    rateRequests.delete(key)
  }
}

export function useFrankfurterRates(pairs: { base: string; quote: string }[]) {
  const signature = useMemo(() => [...new Set(pairs.map(({ base, quote }) => pairKey(base.toUpperCase(), quote.toUpperCase())))].sort().join('|'), [pairs])
  const normalizedPairs = useMemo(() => signature ? signature.split('|').map((key) => {
    const [base, quote] = key.split('>')
    return { base, quote, key }
  }) : [], [signature])
  const [state, setState] = useState<RateState>({ rates: {}, loading: {}, errors: {}, stale: {} })
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let active = true
    let refreshing = false
    const identity: Record<string, RateQuote> = {}
    for (const pair of normalizedPairs) {
      if (pair.base === pair.quote) {
        identity[pair.key] = { rate: 1, source: 'frankfurter', label: 'Same-currency identity rate', updatedAt: null }
      }
    }
    setState((previous) => ({ ...previous, rates: { ...previous.rates, ...identity } }))
    const load = async (force = false) => {
      if (refreshing) return
      refreshing = true
      const fetchable = normalizedPairs.filter((pair) => pair.base !== pair.quote)
      setState((previous) => {
        const loading = { ...previous.loading }
        const stale = { ...previous.stale }
        for (const pair of fetchable) {
          const cached = rateCache.get(pair.key)
          if (force || !cached || cached.expiresAt <= Date.now()) {
            loading[pair.key] = !previous.rates[pair.key]
            if (previous.rates[pair.key]) stale[pair.key] = true
          }
        }
        return { ...previous, loading, stale }
      })
      await Promise.all(fetchable.map(async (pair) => {
        try {
          const quote = await fetchRate(pair.base, pair.quote, force)
          if (active) setState((previous) => ({ ...previous, rates: { ...previous.rates, [pair.key]: quote }, loading: { ...previous.loading, [pair.key]: false }, stale: { ...previous.stale, [pair.key]: false }, errors: { ...previous.errors, [pair.key]: '' } }))
        } catch (error) {
          if (active) setState((previous) => ({ ...previous, loading: { ...previous.loading, [pair.key]: false }, stale: { ...previous.stale, [pair.key]: Boolean(previous.rates[pair.key]) }, errors: { ...previous.errors, [pair.key]: error instanceof Error ? error.message : 'Exchange rates are temporarily unavailable.' } }))
        }
      }))
      refreshing = false
    }
    void load(refreshToken > 0)
    const refreshIfExpired = () => { if (!document.hidden) void load() }
    const interval = window.setInterval(refreshIfExpired, RATE_TTL)
    document.addEventListener('visibilitychange', refreshIfExpired)
    return () => { active = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshIfExpired) }
  }, [normalizedPairs, refreshToken])

  return { ...state, refresh: () => setRefreshToken((token) => token + 1) }
}

let currencyCache: { currencies: FrankfurterCurrency[]; expiresAt: number } | null = null
let currencyRequest: Promise<FrankfurterCurrency[]> | null = null

async function loadCurrencies() {
  if (currencyCache && currencyCache.expiresAt > Date.now()) return currencyCache.currencies
  if (currencyRequest) return currencyRequest
  currencyRequest = (async () => {
    const response = await fetch('/api/fx/currencies', { signal: AbortSignal.timeout(15_000) })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok || !Array.isArray(body)) throw new Error(body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : 'Currency list is temporarily unavailable.')
    const currencies = body.filter((item): item is FrankfurterCurrency => item && typeof item.code === 'string' && typeof item.name === 'string' && typeof item.symbol === 'string')
    if (currencies.length === 0) throw new Error('Frankfurter returned an empty currency list.')
    currencyCache = { currencies, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }
    return currencies
  })()
  try { return await currencyRequest } finally { currencyRequest = null }
}

export function useFrankfurterCurrencies() {
  const [currencies, setCurrencies] = useState<FrankfurterCurrency[]>(FX_CURRENCIES.map(({ code, name, symbol }) => ({ code, name, symbol: symbol.trim() || code })))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    loadCurrencies().then((items) => { if (active) setCurrencies(items) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Currency list is temporarily unavailable.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  return { currencies, loading, error }
}

const singleSeriesCache = new Map<string, { rows: FrankfurterRate[]; expiresAt: number }>()
const singleSeriesRequests = new Map<string, Promise<FrankfurterRate[]>>()

export async function fetchFrankfurterSeries(base: string, quote: string, from: string, to: string, group?: 'week' | 'month') {
  const key = `${base.toUpperCase()}|${quote.toUpperCase()}|${from}|${to}|${group ?? 'daily'}`
  const cached = singleSeriesCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.rows
  const existing = singleSeriesRequests.get(key)
  if (existing) return existing
  const request = (async () => {
  const query = new URLSearchParams({ base, quote, from, to })
  if (group) query.set('group', group)
  const response = await fetch(`/api/fx/rates?${query.toString()}`, { signal: AbortSignal.timeout(15_000) })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : 'Historical rates are unavailable for this date range.')
  if (!Array.isArray(body)) throw new Error('Frankfurter returned invalid historical rate data.')
  const rows = body as FrankfurterRate[]
  if (rows.some((row) => !row || row.base !== base.toUpperCase() || row.quote !== quote.toUpperCase() || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(row.date) || typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0 || row.date < from || row.date > to)) throw new Error('Frankfurter returned invalid historical rate data.')
  singleSeriesCache.set(key, { rows, expiresAt: Date.now() + 6 * 60 * 60 * 1000 })
  return rows
  })()
  singleSeriesRequests.set(key, request)
  try { return await request } finally { singleSeriesRequests.delete(key) }
}

const seriesCache = new Map<string, { rows: FrankfurterRate[]; expiresAt: number }>()
const seriesRequests = new Map<string, Promise<FrankfurterRate[]>>()

export async function fetchFrankfurterMultiSeries(base: string, quotes: string[], from: string, to: string, group: 'week' | 'month') {
  const uniqueQuotes = [...new Set(quotes.map((code) => code.toUpperCase()).filter((code) => code !== base.toUpperCase()))].sort()
  const key = `${base.toUpperCase()}|${uniqueQuotes.join(',')}|${from}|${to}|${group}`
  const cached = seriesCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.rows
  const existing = seriesRequests.get(key)
  if (existing) return existing
  const request = (async () => {
    const query = new URLSearchParams({ base: base.toUpperCase(), quotes: uniqueQuotes.join(','), from, to, group })
    const response = await fetch(`/api/fx/rates?${query.toString()}`, { signal: AbortSignal.timeout(15_000) })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) throw new Error(body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : 'Historical rates are unavailable for this date range.')
    if (!Array.isArray(body) || body.some((row) => !row || row.base !== base.toUpperCase() || !uniqueQuotes.includes(row.quote) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(row.date) || typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0)) throw new Error('Frankfurter returned invalid historical rate data.')
    const rows = body as FrankfurterRate[]
    seriesCache.set(key, { rows, expiresAt: Date.now() + 6 * 60 * 60 * 1000 })
    return rows
  })()
  seriesRequests.set(key, request)
  try { return await request } finally { seriesRequests.delete(key) }
}
