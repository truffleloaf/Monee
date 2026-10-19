'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Compass, Info, RefreshCw } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CountryBadge, CountrySelect, CurrencyPicker } from './country-select'
import { useFinance } from './finance-provider'
import { NumberField } from './number-field'
import { Badge, Panel, PanelHeading, Stat } from './panel'
import { RouteGlobe } from './route-globe'
import { Segmented } from './segmented'
import { buildExchangeModel, PRESET_MOVES, scenarioRows, sensitivities, type ExchangeModel } from '@/lib/exchange'
import { compareCurrencyStrategies, type DecisionOption } from '@/lib/currency-decision'
import { exchangeInsight } from '@/lib/insights'
import {
  formatFxRate,
  formatMoney,
  formatPercent,
  getCountry,
  getCurrencyInfo,
  illustrativeMove,
  FX_CURRENCIES,
} from '@/lib/fx'
import { cn } from '@/lib/utils'
import { fetchFrankfurterSeries, useFrankfurterCurrencies, useFrankfurterRates, type FrankfurterRate } from '@/lib/frankfurter-client'
import { pairKey } from '@/lib/fx'

export function ExchangeWorkspace() {
  const { state, chooseCountry, setRoute, swapRoute, updateExchange, setCustomRate } = useFinance()
  const [shift, setShift] = useState(0)
  const [recenterKey, setRecenterKey] = useState(0)
  const [rateDraft, setRateDraft] = useState<string | null>(null)
  const pair = { base: state.route.sendCurrency, quote: state.route.receiveCurrency }
  const { rates, loading: ratesLoading, errors: rateErrors, stale: staleRates, refresh: refreshRates } = useFrankfurterRates([pair])
  const { currencies } = useFrankfurterCurrencies()
  const rateKey = pairKey(pair.base, pair.quote)
  const referenceRates = rates[rateKey] ? { [rateKey]: rates[rateKey] } : {}

  const model = useMemo(() => buildExchangeModel(state, shift, referenceRates), [state, shift, rates])
  const rows = useMemo(() => scenarioRows(model), [model])
  const ranked = useMemo(() => sensitivities(model), [model])
  const insight = useMemo(
    () =>
      exchangeInsight(model, state.route.sendCountry, state.route.receiveCountry, ranked),
    [model, ranked, state.route.receiveCountry, state.route.sendCountry],
  )

  const sendCountry = getCountry(state.route.sendCountry)
  const receiveCountry = getCountry(state.route.receiveCountry)
  const from = getCurrencyInfo(model.from)
  const to = getCurrencyInfo(model.to)
  const quote = model.quote
  const rateInvalid = rateDraft !== null && !(Number(rateDraft) > 0)
  const vsBase = model.current.net - model.base.net
  const quoteReady = quote.source !== 'unavailable'

  const climate = useMemo(
    () =>
      FX_CURRENCIES.map((currency) => ({
        ...currency,
        change: illustrativeMove(currency.code),
      }))
        .filter((currency) => currency.change !== 0)
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 10),
    [],
  )

  const onSwap = () => {
    swapRoute()
    setRateDraft(null)
    setRecenterKey((key) => key + 1)
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-start">
        <Panel aria-labelledby="converter-heading">
          <PanelHeading
            id="converter-heading"
            title="Conversion workspace"
            description="Choose a country, then adjust its currency if needed."
          />

          <div className="mt-8 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch md:gap-3 lg:gap-5">
            <div className="flex min-w-0 flex-col space-y-4 rounded-2xl border border-foreground/[0.08] bg-background/40 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CountryBadge code={sendCountry.code} />
                <span>Sending from</span>
              </div>
              <CountrySelect
                label="Sending country"
                value={state.route.sendCountry}
                onChange={(code) => {
                  chooseCountry('send', code)
                  setRateDraft(null)
                  setRecenterKey((key) => key + 1)
                }}
              />
              <CurrencyPicker
                label="Sending currency"
                value={state.route.sendCurrency}
                countryCode={state.route.sendCountry}
                currencies={currencies}
                onChange={(code) => {
                  setRoute({ sendCurrency: code })
                  setRateDraft(null)
                }}
              />
              <NumberField
                label="Amount sent"
                value={state.exchange.amount}
                prefix={from.symbol}
                decimals={from.decimals}
                onChange={(amount) => updateExchange({ amount })}
              />
            </div>

            <button
              type="button"
              onClick={onSwap}
              aria-label="Swap sending and receiving countries and currencies"
              className="mx-auto inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-background/80 text-foreground outline-none transition-colors hover:border-lavender/50 hover:bg-lavender/10 focus-visible:ring-2 focus-visible:ring-lavender md:my-auto"
            >
              <ArrowLeftRight className="size-4" aria-hidden />
            </button>

            <div className="flex min-w-0 flex-col space-y-4 rounded-2xl border border-foreground/[0.08] bg-background/40 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CountryBadge code={receiveCountry.code} />
                <span>Receiving in</span>
              </div>
              <CountrySelect
                label="Receiving country"
                value={state.route.receiveCountry}
                onChange={(code) => {
                  chooseCountry('receive', code)
                  setRateDraft(null)
                  setRecenterKey((key) => key + 1)
                }}
              />
              <CurrencyPicker
                label="Receiving currency"
                value={state.route.receiveCurrency}
                countryCode={state.route.receiveCountry}
                currencies={currencies}
                onChange={(code) => {
                  setRoute({ receiveCurrency: code })
                  setRateDraft(null)
                }}
              />
              <div>
                <p className="text-sm text-muted-foreground">Estimated amount received</p>
                <p
                  className="mt-2 break-words font-serif text-3xl tracking-tight text-foreground tabular-nums sm:text-4xl"
                  aria-live="polite"
                >
                  {quoteReady ? formatMoney(model.current.net, model.to) : ratesLoading[rateKey] ? 'Loading reference rate…' : 'Rate unavailable'}
                </p>
                <p
                  className={cn(
                    'mt-1 text-sm tabular-nums',
                    vsBase > 0.005 ? 'text-mint' : vsBase < -0.005 ? 'text-coral' : 'text-muted-foreground',
                  )}
                >
                  {quoteReady && (Math.abs(vsBase) < 0.005
                    ? 'Matches the baseline after fees'
                    : `${formatMoney(vsBase, model.to, { sign: true })} vs baseline`)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="base-rate" className="text-sm text-muted-foreground">
                  Exchange-rate assumption
                </label>
                {quote.source === 'custom' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRateDraft(null)
                      setCustomRate(model.from, model.to, null)
                    }}
                    className="rounded text-xs text-lavender outline-none hover:underline focus-visible:ring-2 focus-visible:ring-lavender"
                  >
                    Use Frankfurter rate
                  </button>
                )}
              </div>
              <div
                className={cn(
                  'mt-2 flex items-center rounded-2xl border bg-background/60 px-4 transition-colors focus-within:border-lavender/60',
                  rateInvalid ? 'border-coral/60' : 'border-foreground/10',
                )}
              >
                <span className="text-sm whitespace-nowrap text-muted-foreground" aria-hidden>
                  1 {from.code} =
                </span>
                <input
                  id="base-rate"
                  inputMode="decimal"
                  aria-invalid={rateInvalid}
                  value={rateDraft ?? (quoteReady ? formatFxRate(quote.rate) : '')}
                  placeholder={ratesLoading[rateKey] ? 'Loading…' : 'Unavailable'}
                  onChange={(event) => {
                    const cleaned = event.target.value.replace(/[^\d.]/g, '')
                    setRateDraft(cleaned)
                    const parsed = Number(cleaned)
                    if (Number.isFinite(parsed) && parsed > 0) {
                      setCustomRate(model.from, model.to, parsed)
                    }
                  }}
                  onBlur={() => setRateDraft(null)}
                  className="w-full min-w-0 bg-transparent px-2 py-3 text-base text-foreground tabular-nums outline-none"
                />
                <span className="text-sm text-muted-foreground">{to.code}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <p>
                  {quote.label}
                  {quote.updatedAt ? ` · rate date ${quote.updatedAt}` : ''}
                  {quote.fetchedAt ? ` · checked ${new Date(quote.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  {staleRates[rateKey] ? ' · showing last available rate' : ''}
                  {ratesLoading[rateKey] ? ' · fetching reference rate' : ''}
                  {rateErrors[rateKey] ? ` · ${rateErrors[rateKey]}` : ''}
                </p>
                <button type="button" onClick={refreshRates} disabled={Boolean(ratesLoading[rateKey])} className="inline-flex items-center gap-1.5 text-foreground/70 transition hover:text-foreground disabled:opacity-50" aria-label="Refresh reference exchange rate">
                  <RefreshCw className={`size-3 ${ratesLoading[rateKey] ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
            </div>
            <NumberField
              label="Percentage fee"
              value={state.exchange.feePct}
              suffix="%"
              max={20}
              decimals={2}
              hint="Charged on the converted amount, in the receiving currency."
              onChange={(feePct) => updateExchange({ feePct })}
            />
            <NumberField
              label="Flat fee"
              value={state.exchange.flatFee}
              prefix={to.symbol}
              decimals={to.decimals}
              hint="Also deducted in the receiving currency."
              onChange={(flatFee) => updateExchange({ flatFee })}
            />
            <div className="rounded-2xl border border-foreground/[0.08] bg-background/50 p-4">
              <p className="text-xs text-muted-foreground">Rate source</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {quote.source === 'frankfurter'
                  ? 'Frankfurter reference rate'
                  : quote.source === 'custom'
                    ? 'Your custom rate'
                    : quote.source === 'unavailable' ? 'Reference rate unavailable' : 'Illustrative, not a live market rate'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {quoteReady ? <>Converted {formatMoney(model.current.gross, model.to)} − fees {formatMoney(model.current.fee, model.to)}</> : 'Conversion is paused until a reference rate is available.'}
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="overflow-hidden" aria-labelledby="globe-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <PanelHeading
                id="globe-heading"
                title={`${from.code} to ${to.code}`}
                description={`${sendCountry.name} → ${receiveCountry.name}. Drag the globe; it recentres on the selected route.`}
              />
            </div>
            <button
              type="button"
              onClick={() => setRecenterKey((key) => key + 1)}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-1.5 text-xs text-foreground outline-none hover:border-lavender/40 focus-visible:ring-2 focus-visible:ring-lavender"
            >
              <Compass className="size-3.5" aria-hidden />
              Recentre
            </button>
          </div>
          <div className="relative mx-auto mt-4 aspect-square max-h-[420px] w-full max-w-[420px]">
            <RouteGlobe
              from={{
                code: from.code,
                name: sendCountry.name,
                lon: sendCountry.lon,
                lat: sendCountry.lat,
              }}
              to={{
                code: to.code,
                name: receiveCountry.name,
                lon: receiveCountry.lon,
                lat: receiveCountry.lat,
              }}
              rate={model.rate}
              shift={model.shift}
              recenterKey={recenterKey}
              ariaLabel={`Globe showing a ${from.code} to ${to.code} transfer from ${sendCountry.name} to ${receiveCountry.name}`}
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            The arc is a simplified visual connection, not a precise shipping route.
          </p>
          <div className="mt-5">
            <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
              Illustrative currency climate
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {climate.map((currency) => {
                const active = currency.code === from.code || currency.code === to.code
                return (
                  <li
                    key={currency.code}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs tabular-nums',
                      active ? 'border-lavender/40 bg-lavender/10' : 'border-foreground/10 bg-background/50',
                    )}
                  >
                    <span className="font-medium text-foreground">{currency.code}</span>
                    <span className={currency.change >= 0 ? 'text-mint' : 'text-coral'}>
                      {formatPercent(currency.change, 1, true)}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Green marks currencies gaining illustrative value; muted red marks those losing it. Not
              live prices.
            </p>
          </div>
        </Panel>
      </div>

      <HistoryRatesPanel base={model.from} quote={model.to} />
      <p className="text-xs text-muted-foreground"><Info className="mr-1 inline size-3.5" aria-hidden />Reference exchange rates from Frankfurter. Rates are updated periodically and may differ from the rates offered by banks and money-transfer providers.</p>

      {quoteReady ? <>
      <Panel aria-labelledby="simulator-heading">
        <PanelHeading
          id="simulator-heading"
          title="Exchange-rate simulator"
          description={`Move ${from.code} against ${to.code}. A stronger sending currency raises what the recipient receives; reversing the route reverses that effect.`}
          action={
            <Badge tone={shift > 0 ? 'mint' : shift < 0 ? 'coral' : 'neutral'}>
              {formatPercent(shift, 1, true)}
            </Badge>
          }
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Segmented<number | 'custom'>
            label="Simulated rate movement"
            size="sm"
            value={PRESET_MOVES.includes(shift as (typeof PRESET_MOVES)[number]) ? shift : 'custom'}
            onChange={(value) => {
              if (value === 'custom') return
              setShift(value)
            }}
            options={[
              ...PRESET_MOVES.map((move) => ({
                value: move as number | 'custom',
                label: move === 0 ? '0%' : formatPercent(move, 0, true),
              })),
              { value: 'custom' as const, label: 'Custom' },
            ]}
          />
        </div>

        <div className="mt-5">
          <label htmlFor="rate-shift" className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Custom movement</span>
            <span
              className={cn(
                'font-medium tabular-nums',
                shift > 0 ? 'text-mint' : shift < 0 ? 'text-coral' : 'text-foreground',
              )}
            >
              {formatPercent(shift, 1, true)}
            </span>
          </label>
          <input
            id="rate-shift"
            type="range"
            min={-10}
            max={10}
            step={0.5}
            value={shift}
            onChange={(event) => setShift(Number(event.target.value))}
            className="mt-3 w-full cursor-pointer accent-[#B8A8F8]"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>−10%</span>
            <span>0</span>
            <span>+10%</span>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">
              Comparison of simulated exchange-rate movements
            </caption>
            <thead>
              <tr className="border-b border-foreground/10 text-xs tracking-wide text-muted-foreground uppercase">
                <th className="py-3 pr-4 font-medium">Scenario</th>
                <th className="py-3 pr-4 font-medium">Movement</th>
                <th className="py-3 pr-4 font-medium">Exchange rate</th>
                <th className="py-3 pr-4 font-medium">Converted</th>
                <th className="py-3 font-medium">Vs baseline</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-foreground/[0.06]',
                    row.active && 'bg-lavender/10',
                  )}
                >
                  <td className="py-3 pr-4 text-foreground">{row.label}</td>
                  <td
                    className={cn(
                      'py-3 pr-4 tabular-nums',
                      row.move > 0 ? 'text-mint' : row.move < 0 ? 'text-coral' : 'text-muted-foreground',
                    )}
                  >
                    {formatPercent(row.move, 1, true)}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-foreground">
                    {formatFxRate(row.rate)}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-foreground">
                    {formatMoney(row.transfer.net, model.to)}
                  </td>
                  <td
                    className={cn(
                      'py-3 tabular-nums',
                      row.diff > 0.005 ? 'text-mint' : row.diff < -0.005 ? 'text-coral' : 'text-muted-foreground',
                    )}
                  >
                    {formatMoney(row.diff, model.to, { sign: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <CurrencyDecisionAssistant model={model} />

      <Panel aria-labelledby="analysis-heading">
        <div className="flex items-start gap-3">
          <Info className="mt-1 size-4 shrink-0 text-lavender" aria-hidden />
          <div>
            <h2 id="analysis-heading" className="font-serif text-2xl tracking-tight text-foreground sm:text-3xl">
              {insight.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {insight.body}
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {insight.facts.map((fact) => (
            <p
              key={fact}
              className="rounded-2xl border border-foreground/[0.08] bg-background/50 px-4 py-3 text-sm text-foreground"
            >
              {fact}
            </p>
          ))}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Stat
            label="Converted amount"
            value={formatMoney(model.current.gross, model.to)}
            note={`${formatMoney(model.amount, model.from)} × ${formatFxRate(model.rate)}`}
          />
          <Stat
            label="Transaction fees"
            value={formatMoney(model.current.fee, model.to)}
            note={`${state.exchange.feePct}% plus ${formatMoney(state.exchange.flatFee, model.to)} flat`}
          />
          <Stat
            label="Largest modelled lever"
            value={ranked[0]?.label ?? '—'}
            note={ranked[0] ? `About ${formatMoney(ranked[0].impact, model.to)} swing` : undefined}
          />
        </div>
      </Panel>
      </> : <Panel>
        <PanelHeading title={rateErrors[rateKey] ? 'Exchange simulator unavailable' : 'Loading reference rate'} description={rateErrors[rateKey] || `Fetching the Frankfurter rate for 1 ${model.from} in ${model.to}.`} />
        {ratesLoading[rateKey] && <p className="mt-3 text-sm text-muted-foreground" role="status">Loading exchange rate…</p>}
      </Panel>}
    </div>
  )
}

function isoDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function HistoryRatesPanel({ base, quote }: { base: string; quote: string }) {
  const [to, setTo] = useState(() => isoDay(new Date()))
  const [from, setFrom] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 3)
    return isoDay(date)
  })
  const [rows, setRows] = useState<FrankfurterRate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const same = base === quote

  const load = async () => {
    if (from > to) { setError('Start date must be before the end date.'); return }
    setLoading(true)
    setError('')
    try {
      const result = await fetchFrankfurterSeries(base, quote, from, to, 'week')
      setRows(result)
      setLoaded(true)
    } catch (reason) {
      setRows([])
      setLoaded(true)
      setError(reason instanceof Error ? reason.message : 'Historical rates are unavailable right now.')
    } finally { setLoading(false) }
  }

  useEffect(() => { setLoaded(false); setRows([]); setError('') }, [base, quote])
  const data = useMemo(() => [...rows].sort((a, b) => a.date.localeCompare(b.date)), [rows])

  return (
    <Panel aria-labelledby="history-heading">
      <PanelHeading id="history-heading" title="Historical reference rates" description={`Rate direction: 1 ${base} = ${quote} shown. Weekly observations from Frankfurter.`} />
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1 block rounded-xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm text-foreground" /></label>
        <label className="text-xs text-muted-foreground">To<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="mt-1 block rounded-xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm text-foreground" /></label>
        <button type="button" disabled={loading || same} onClick={load} className="rounded-full border border-lavender/30 px-4 py-2 text-sm text-foreground disabled:opacity-50">{loading ? 'Loading history…' : 'Load history'}</button>
      </div>
      {same ? <p className="mt-4 text-sm text-muted-foreground">A currency has no exchange-rate history against itself.</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-coral">{error}</p> : null}
      {!error && loaded && !loading && !same && data.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No observations were returned for this date range.</p> : null}
      {data.length > 0 && <div className="mt-5 h-64 w-full" role="img" aria-label={`Historical exchange rates, 1 ${base} to ${quote}`}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 10, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#aaa5b6', fontSize: 11 }} tickFormatter={(date: string) => date.slice(5)} minTickGap={24} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: '#aaa5b6', fontSize: 11 }} width={72} />
          <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="rounded-xl border border-foreground/10 bg-card px-3 py-2 text-xs shadow-lg"><p className="text-muted-foreground">{payload[0].payload.date}</p><p className="mt-1 text-foreground">1 {base} = {Number(payload[0].value).toLocaleString(undefined, { maximumSignificantDigits: 8 })} {quote}</p></div> : null} />
          <Line type="monotone" dataKey="rate" stroke="#B8A8F8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart></ResponsiveContainer>
      </div>}
      <p className="mt-3 text-xs text-muted-foreground">Historical rates are reference data and may differ from rates offered by banks and money-transfer providers.</p>
    </Panel>
  )
}

function CurrencyDecisionAssistant({ model }: { model: ExchangeModel }) {
  const [payment, setPayment] = useState(1800)
  const [available, setAvailable] = useState(0)
  const [reserve, setReserve] = useState(500)
  const [days, setDays] = useState(30)
  const result = useMemo(() => compareCurrencyStrategies({
    sourceAmount: model.amount,
    paymentAmount: payment,
    availableTargetFunds: available,
    emergencyReserve: reserve,
    daysUntilPayment: days,
    rate: model.quote.rate,
    feePct: model.feePct,
    flatFee: model.flatFee,
  }), [model.amount, model.quote.rate, model.feePct, model.flatFee, payment, available, reserve, days])
  const summary = (label: string, item: DecisionOption) => (
    <div className="rounded-2xl border border-foreground/[0.08] bg-background/45 p-4">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Estimated received</dt><dd className="text-foreground">{formatMoney(item.received, model.to)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Fees</dt><dd className="text-foreground">{formatMoney(item.fees, model.to)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Remaining {model.from}</dt><dd className="text-foreground">{formatMoney(item.remainingSource, model.from)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">After payment</dt><dd className={cn(item.afterPayment >= reserve ? 'text-mint' : 'text-coral')}>{formatMoney(item.afterPayment, model.to)}</dd></div>
        <p className={cn('pt-1 text-xs', item.covered ? 'text-mint' : 'text-coral')}>{item.covered ? 'Payment covered' : `Payment short by ${formatMoney(payment - available - item.received, model.to)}`}{item.reserveShortfall > 0 ? ` · reserve short by ${formatMoney(item.reserveShortfall, model.to)}` : ' · reserve intact'}</p>
      </dl>
    </div>
  )

  return <Panel>
    <PanelHeading title="Currency decision assistant" description="Compare planning options using this illustrative rate, your payment, and fees. Nothing here executes a transfer or predicts rates." />
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <NumberField label="Payment needed" value={payment} prefix={getCurrencyInfo(model.to).symbol} decimals={0} onChange={setPayment} />
      <NumberField label="Target-currency funds available" value={available} prefix={getCurrencyInfo(model.to).symbol} decimals={0} onChange={setAvailable} />
      <NumberField label="Minimum emergency reserve" value={reserve} prefix={getCurrencyInfo(model.to).symbol} decimals={0} onChange={setReserve} />
      <NumberField label="Days until payment" value={days} min={0} max={730} decimals={0} suffix="days" onChange={setDays} />
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      {summary('A · Convert now', result.now)}
      <div className="space-y-2 rounded-2xl border border-foreground/[0.08] bg-background/30 p-3">
        <p className="px-1 text-sm font-medium text-foreground">B · Convert gradually · 50 / 25 / 25</p>
        {summary('Stable rate throughout', result.gradual.stable)}
        {summary('Later rate +5% (hypothetical)', result.gradual.rateUpFive)}
        {summary('Later rate −5% (hypothetical)', result.gradual.rateDownFive)}
      </div>
      <div className="space-y-2 rounded-2xl border border-foreground/[0.08] bg-background/30 p-3">
        <p className="px-1 text-sm font-medium text-foreground">C · Wait and monitor</p>
        {summary('Sending currency strengthens 5%', result.wait.rateUpFive)}
        {summary('Sending currency weakens 5%', result.wait.rateDownFive)}
      </div>
    </div>
    <div className="mt-4 rounded-2xl border border-lavender/20 bg-lavender/5 p-4">
      <p className="text-sm font-medium text-foreground">Planning suggestion: {result.recommendation.strategy === 'now' ? 'Convert now' : result.recommendation.strategy === 'gradual' ? 'Convert gradually' : 'Wait and monitor'}</p>
      <p className="mt-1 text-sm text-muted-foreground">{result.recommendation.reason}</p>
      <p className="mt-2 text-xs text-muted-foreground">The +5% and −5% rows are what-if calculations. A more favourable rate is not guaranteed; fees apply to each instalment.</p>
    </div>
  </Panel>
}
