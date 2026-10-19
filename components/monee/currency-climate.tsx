'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, Globe2 } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addDays, formatDate, todayIso } from '@/lib/dates'
import { closestHistoricalRate, currencyStrengthChange } from '@/lib/climate'
import { FX_CURRENCIES, getCurrencyInfo } from '@/lib/fx'
import { fetchFrankfurterMultiSeries, fetchFrankfurterSeries, type FrankfurterRate } from '@/lib/frankfurter-client'
import { GLOBE_CURRENCIES } from '@/lib/currencies'
import { GlobeCanvas } from './globe-canvas'
import { Panel, PanelHeading } from './panel'

type Period = '1m' | '3m' | '6m' | '1y'
type Movement = { code: string; name: string; rate: number; date: string; change: number; points: FrankfurterRate[] }
type ClimateContextValue = {
  reference: string
  setReference: (code: string) => void
  selected: string
  setSelected: (code: string) => void
  period: Period
  setPeriod: (period: Period) => void
  movements: Movement[]
  loading: boolean
  error: string
  date: string | null
}

const ClimateContext = createContext<ClimateContextValue | null>(null)
const PERIOD_DAYS: Record<Period, number> = { '1m': 31, '3m': 92, '6m': 183, '1y': 365 }
const periods: { value: Period; label: string }[] = [
  { value: '1m', label: '1 month' }, { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' }, { value: '1y', label: '1 year' },
]
const supportedCodes = FX_CURRENCIES.map(({ code }) => code)

export function CurrencyClimateProvider({ children }: { children: React.ReactNode }) {
  const [reference, setReference] = useState('MYR')
  const [selected, setSelected] = useState('CNY')
  const [period, setPeriod] = useState<Period>('3m')
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const to = todayIso()
    const from = addDays(to, -PERIOD_DAYS[period])
    const group = period === '1y' ? 'month' : 'week'
    const quotes = supportedCodes.filter((code) => code !== reference)
    setLoading(true)
    setError('')
    setMovements([])
    fetchFrankfurterMultiSeries(reference, quotes, from, to, group).then((rows) => {
      if (!active) return
      const results = quotes.flatMap((code) => {
        const points = rows.filter((row) => row.quote === code).sort((a, b) => a.date.localeCompare(b.date))
        if (points.length < 2) return []
        const first = points[0]
        const last = points[points.length - 1]
        // Frankfurter quotes units of `code` per 1 `reference`; invert the move
        // to describe how the quote currency itself changed against the reference.
        const change = currencyStrengthChange(first.rate, last.rate)
        if (change === null) return []
        return [{ code, name: getCurrencyInfo(code).name, rate: last.rate, date: last.date, change, points }]
      })
      setMovements(results)
      if (results.length) setSelected((current) => current === reference || !results.some((item) => item.code === current) ? results.find((item) => item.code === 'CNY')?.code ?? results[0].code : current)
      setLoading(false)
    }).catch((reason: unknown) => {
      if (!active) return
      setError(reason instanceof Error ? reason.message : 'Historical reference rates are temporarily unavailable.')
      setLoading(false)
    })
    return () => { active = false }
  }, [reference, period])

  const value = useMemo(() => ({ reference, setReference, selected, setSelected, period, setPeriod, movements, loading, error, date: movements.reduce<string | null>((latest, item) => !latest || item.date > latest ? item.date : latest, null) }), [reference, selected, period, movements, loading, error])
  return <ClimateContext.Provider value={value}>{children}</ClimateContext.Provider>
}

export function useCurrencyClimate() {
  const value = useContext(ClimateContext)
  if (!value) throw new Error('useCurrencyClimate must be used inside CurrencyClimateProvider')
  return value
}

export function CurrencyGlobe() {
  const { reference, setReference, selected, setSelected, period, setPeriod, movements, loading } = useCurrencyClimate()
  const selectedMovement = movements.find((item) => item.code === selected)
  const movementMap = useMemo(() => Object.fromEntries(movements.map((item) => [item.code, item.change])), [movements])
  const globeOptions = GLOBE_CURRENCIES.filter(({ code }) => supportedCodes.includes(code))
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)] lg:items-center lg:py-16">
      <div className="relative mx-auto aspect-square w-full max-w-[580px] overflow-hidden rounded-full bg-[radial-gradient(circle_at_48%_45%,rgba(184,168,248,.1),transparent_65%)]">
        <div className="absolute inset-[6%] rounded-full border border-foreground/[0.06] shadow-[0_24px_80px_-24px_rgba(0,0,0,.8)]" />
        <div className="absolute inset-[7%] rounded-full">
          <GlobeCanvas selected={selected} reference={reference} movements={movementMap} onSelect={setSelected} />
        </div>
        <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-foreground/10 bg-background/80 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
          Drag to rotate · select a marker · {period.toUpperCase()} comparison
        </div>
      </div>
      <div className="max-w-xl lg:pl-4">
        <div className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em] text-lavender"><Globe2 className="size-4" aria-hidden /> Currency climate</div>
        <h2 className="font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">A clearer view of currency movement.</h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Explore historical reference rates against a currency you choose. Past movement is context, not a forecast.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">Reference currency
            <select value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-foreground/10 bg-surface px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender">
              {FX_CURRENCIES.map(({ code, name }) => <option key={code} value={code}>{code} · {name}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">Comparison period
            <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="mt-1.5 block w-full rounded-xl border border-foreground/10 bg-surface px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender">
              {periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-5 min-h-28 rounded-2xl border border-foreground/[0.08] bg-foreground/[0.025] p-4" aria-live="polite">
          {loading ? <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><span className="size-4 animate-spin rounded-full border-2 border-foreground/20 border-t-lavender" />Loading historical reference rates…</p> : selectedMovement ? <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs uppercase tracking-wide text-muted-foreground">1 {reference} =</p><p className="mt-1 font-serif text-3xl tabular-nums text-foreground">{formatRate(selectedMovement.rate)} <span className="font-sans text-base">{selected}</span></p></div>
              <MovementBadge value={selectedMovement.change} period={period} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{selectedMovement.name} · reference rate dated {formatDate(selectedMovement.date)}</p>
          </> : <p role="alert" className="py-4 text-sm text-muted-foreground">{movements.length ? 'Choose a currency with enough historical observations.' : 'No reference rate is available for this comparison.'}</p>}
        </div>
        <label className="mt-4 block max-w-sm text-xs text-muted-foreground">Explore a currency
          <select aria-label="Explore currency on globe" value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-foreground/10 bg-surface px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender">
            {globeOptions.filter(({ code }) => code !== reference).map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}
          </select>
        </label>
      </div>
    </div>
  )
}

function formatRate(value: number) {
  return new Intl.NumberFormat('en-US', { minimumSignificantDigits: 4, maximumSignificantDigits: 6 }).format(value)
}

function MovementBadge({ value, period }: { value: number; period: Period }) {
  const Icon = Math.abs(value) < 0.05 ? ArrowRight : value > 0 ? ArrowUpRight : ArrowDownRight
  const color = Math.abs(value) < 0.05 ? 'text-muted-foreground' : value > 0 ? 'text-mint' : 'text-coral'
  return <span className={`inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2.5 py-1.5 text-sm tabular-nums ${color}`}><Icon className="size-4" aria-hidden />{value > 0 ? '+' : ''}{value.toFixed(2)}% <span className="text-xs text-muted-foreground">{period.toUpperCase()}</span></span>
}

function ClimateChartTooltip({ active, payload, reference, selected }: { active?: boolean; payload?: { payload: FrankfurterRate }[]; reference: string; selected: string }) {
  if (!active || !payload?.[0]) return null
  const row = payload[0].payload
  return <div className="rounded-lg border border-foreground/10 bg-popover px-3 py-2 text-xs shadow-xl"><p className="text-muted-foreground">{formatDate(row.date)}</p><p className="mt-1 tabular-nums text-foreground">1 {reference} = {formatRate(row.rate)} {selected}</p></div>
}

export function CurrencyClimate() {
  const { reference, selected, setSelected, period, movements, loading, error, date } = useCurrencyClimate()
  const selectedMovement = movements.find((item) => item.code === selected)
  const sorted = [...movements].sort((a, b) => b.change - a.change)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]
  const stable = [...movements].sort((a, b) => Math.abs(a.change) - Math.abs(b.change)).slice(0, 3)
  return (
    <section id="currency-climate" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:pb-24" aria-labelledby="climate-title">
      <div className="border-t border-foreground/[0.08] pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[.18em] text-lavender">Historical context</p><h2 id="climate-title" className="mt-2 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">Currency Climate</h2></div><p className="text-xs text-muted-foreground">{date ? `Latest observed rate: ${formatDate(date)}` : 'Historical rate dates shown when available'}</p></div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Changes compare each currency with {reference} over {period}. A positive change means that currency strengthened against {reference}; a negative change means it weakened.</p>
        {error ? <p role="alert" className="mt-5 rounded-xl border border-coral/20 bg-coral/5 p-4 text-sm text-muted-foreground">Historical currency data is unavailable right now. Please try again later.</p> : loading ? <p role="status" className="mt-5 py-8 text-sm text-muted-foreground">Loading comparable historical rates…</p> : movements.length < 2 ? <p className="mt-5 py-8 text-sm text-muted-foreground">There is not enough historical data for this comparison period.</p> : <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3"><ClimateSummary label="Strongest historical move" item={strongest} reference={reference} /><ClimateSummary label="Weakest historical move" item={weakest} reference={reference} /><div className="rounded-2xl border border-foreground/[0.08] bg-foreground/[0.025] p-4"><p className="text-xs text-muted-foreground">Least movement · {period.toUpperCase()}</p><p className="mt-2 text-sm text-foreground">{stable.map((item) => item.code).join(' · ')}</p><p className="mt-1 text-xs text-muted-foreground">Against {reference}</p></div></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
            <Panel><PanelHeading title={`${selected} against ${reference}`} description={`Historical reference-rate series · ${period}`} /><div className="mt-4 h-64" aria-label={`Historical exchange rate chart: ${selected} against ${reference}`}>
              {selectedMovement?.points.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={selectedMovement.points} margin={{ top: 10, right: 10, bottom: 0, left: 6 }}><CartesianGrid vertical={false} stroke="rgba(243,240,234,.07)"/><XAxis dataKey="date" tickFormatter={(value) => formatDate(String(value))} minTickGap={32} tick={{ fill: '#A3A6AB', fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis domain={['auto','auto']} width={68} tickFormatter={(value) => formatRate(Number(value))} tick={{ fill: '#A3A6AB', fontSize: 11 }} axisLine={false} tickLine={false}/><Tooltip content={<ClimateChartTooltip reference={reference} selected={selected} />} /><Line type="monotone" dataKey="rate" stroke="#B8A8F8" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#B8A8F8', stroke: '#17191C', strokeWidth: 2 }} /></LineChart></ResponsiveContainer> : <p className="py-12 text-sm text-muted-foreground">Not enough data to draw a historical trend.</p>}
              </div><p className="mt-2 text-xs text-muted-foreground">Frankfurter reference rates. 1 {reference} = the displayed amount of {selected}. Historical changes do not predict future rates.</p></Panel>
            <Panel><PanelHeading title="Compare currencies" description="Select a row to explore its historical rate series."/><div className="mt-3 max-h-80 overflow-auto pr-1">{sorted.map((item) => <button key={item.code} type="button" aria-pressed={selected === item.code} onClick={() => setSelected(item.code)} className={`flex w-full items-center justify-between gap-3 border-b border-foreground/[0.06] px-2 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender ${selected === item.code ? 'bg-lavender/[0.07]' : 'hover:bg-foreground/[0.025]'}`}><span className="min-w-0"><span className="block text-sm font-medium text-foreground">{item.code}<span className="ml-2 text-xs font-normal text-muted-foreground">{item.name}</span></span><span className="mt-1 block text-[11px] text-muted-foreground">1 {reference} = {formatRate(item.rate)} {item.code}</span></span><span className={`shrink-0 text-right text-sm tabular-nums ${Math.abs(item.change) < .05 ? 'text-muted-foreground' : item.change > 0 ? 'text-mint' : 'text-coral'}`}>{item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%<span className="block text-[10px] text-muted-foreground">{period.toUpperCase()}</span></span></button>)}</div></Panel>
          </div>
          <HistoricalImpact defaultReference={reference} />
        </>}
        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />Reference exchange rates from Frankfurter. Rates are updated periodically and may differ from rates offered by banks and money-transfer providers. Latest actual rate dates are shown above; data is not real-time.</p>
        <p className="mt-5 text-sm text-muted-foreground">Want to test hypothetical changes? <a href="/future-lab" className="text-lavender underline decoration-lavender/40 underline-offset-4 hover:decoration-lavender">Explore a scenario in Future Lab <ArrowRight className="inline size-3" aria-hidden /></a></p>
      </div>
    </section>
  )
}

function ClimateSummary({ label, item, reference }: { label: string; item?: Movement; reference: string }) {
  if (!item) return <div className="rounded-2xl border border-foreground/[0.08] p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-sm text-muted-foreground">Not enough data</p></div>
  return <div className="rounded-2xl border border-foreground/[0.08] bg-foreground/[0.025] p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-2 text-lg tabular-nums ${item.change >= 0 ? 'text-mint' : 'text-coral'}`}>{item.code} {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%</p><p className="mt-1 text-xs text-muted-foreground">vs {reference} · {formatDate(item.date)}</p></div>
}

function HistoricalImpact({ defaultReference }: { defaultReference: string }) {
  const [amount, setAmount] = useState('1000')
  const [from, setFrom] = useState(defaultReference)
  const [to, setTo] = useState(defaultReference === 'MYR' ? 'CNY' : 'MYR')
  const [dateA, setDateA] = useState(addDays(todayIso(), -90))
  const [dateB, setDateB] = useState(addDays(todayIso(), -30))
  const [result, setResult] = useState<{ a: { requested: string; actual: string; cost: number }; b: { requested: string; actual: string; cost: number } } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setFrom(defaultReference)
    setTo((current) => current === defaultReference ? (defaultReference === 'MYR' ? 'CNY' : 'MYR') : current)
  }, [defaultReference])

  useEffect(() => {
    setResult(null)
    setError('')
  }, [amount, from, to, dateA, dateB])
  async function compare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setResult(null)
    setError('')
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) { setError('Enter an amount greater than zero.'); return }
    if (!dateA || !dateB || dateA === dateB) { setError('Choose two different historical dates.'); return }
    if (from === to) { setError('Choose two different currencies for the historical illustration.'); return }
    setLoading(true)
    try {
      const start = addDays(dateA < dateB ? dateA : dateB, -7)
      const end = dateA > dateB ? dateA : dateB
      const points = await fetchFrankfurterSeries(from, to, start, end)
      const a = closestHistoricalRate(points, dateA)
      const b = closestHistoricalRate(points, dateB)
      if (!a || !b) throw new Error('Frankfurter does not have rates close to both dates. Try dates with published reference rates.')
      setResult({ a: { requested: dateA, actual: a.date, cost: parsed * a.rate }, b: { requested: dateB, actual: b.date, cost: parsed * b.rate } })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Historical rates are unavailable for those dates.') }
    finally { setLoading(false) }
  }

  return <Panel className="mt-5"><PanelHeading title="A historical payment illustration" description="See how a past reference-rate move would have changed a payment cost. This is historical context, not a prediction or executable quote."/><form onSubmit={compare} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
    <label className="text-xs text-muted-foreground">Amount<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground" /></label>
    <label className="text-xs text-muted-foreground">Funding currency<select value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground">{FX_CURRENCIES.map(({ code }) => <option key={code}>{code}</option>)}</select></label>
    <label className="text-xs text-muted-foreground">Payment currency<select value={to} onChange={(event) => setTo(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground">{FX_CURRENCIES.map(({ code }) => <option key={code}>{code}</option>)}</select></label>
    <label className="text-xs text-muted-foreground">First date<input type="date" value={dateA} max={todayIso()} onChange={(event) => setDateA(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground" /></label>
    <label className="text-xs text-muted-foreground">Second date<input type="date" value={dateB} max={todayIso()} onChange={(event) => setDateB(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground" /></label>
    <button disabled={loading} className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-60 sm:col-span-2 lg:col-span-5">{loading ? 'Loading historical rates…' : 'Compare historical costs'}</button>
  </form>
  {error && <p role="alert" className="mt-3 text-sm text-coral">{error}</p>}
  {result && <div className="mt-4 grid gap-3 sm:grid-cols-3"><ImpactResult title="First rate" row={result.a} from={from} to={to} amount={Number(amount)} /><ImpactResult title="Second rate" row={result.b} from={from} to={to} amount={Number(amount)} /><div className="rounded-xl border border-lavender/15 bg-lavender/[0.04] p-4"><p className="text-xs text-muted-foreground">Estimated cost difference</p><p className="mt-2 text-lg tabular-nums text-foreground">{new Intl.NumberFormat('en-US', { style: 'currency', currency: to }).format(result.b.cost - result.a.cost)}</p><p className="mt-1 text-xs text-muted-foreground">{result.b.cost >= result.a.cost ? 'Higher' : 'Lower'} at the second reference rate</p></div></div>}
  </Panel>
}

function ImpactResult({ title, row, from, to, amount }: { title: string; row: { requested: string; actual: string; cost: number }; from: string; to: string; amount: number }) {
  return <div className="rounded-xl border border-foreground/[0.08] p-4"><p className="text-xs text-muted-foreground">{title} · requested {formatDate(row.requested)}</p><p className="mt-2 text-xs text-muted-foreground">Rate date {formatDate(row.actual)}</p><p className="mt-1 text-lg tabular-nums text-foreground">{new Intl.NumberFormat('en-US', { style: 'currency', currency: to }).format(row.cost)}</p><p className="mt-1 text-xs text-muted-foreground">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)} {from} × historical {from}/{to}</p></div>
}
