'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BalanceChart } from './balance-chart'
import { CurrencyPicker } from './country-select'
import { useFinance } from './finance-provider'
import { DateField, NumberField, TextField } from './number-field'
import { Badge, Panel, PanelHeading, Stat } from './panel'
import { RouteContext } from './route-context'
import { CATEGORIES, monthlyTotal, type CategoryId } from '@/lib/finance-state'
import { formatCompact, formatFxRate, formatMoney, formatPlanMoney, getCurrencyInfo, pairKey } from '@/lib/fx'
import { formatRunway, healthInsights, healthWarnings } from '@/lib/insights'
import { buildPlan, runwayDays, simulate } from '@/lib/plan'
import { cn } from '@/lib/utils'
import { useFrankfurterCurrencies, useFrankfurterRates } from '@/lib/frankfurter-client'

export function HealthWorkspace() {
  const {
    state,
    updatePlan,
    setMonthlyExpenses,
    setCategory,
    addPayment,
    updatePayment,
    removePayment,
    addHolding,
    updateHolding,
    removeHolding,
  } = useFinance()
  const [cuts, setCuts] = useState<Partial<Record<CategoryId, number>>>({})
  const [spendingChart, setSpendingChart] = useState<'donut' | 'bars'>('donut')
  const [holdingCurrency, setHoldingCurrency] = useState('USD')
  const [cashflowView, setCashflowView] = useState<'weekly' | 'monthly'>('weekly')
  const { currencies } = useFrankfurterCurrencies()

  const spend = state.route.receiveCurrency
  const send = state.route.sendCurrency
  const spendInfo = getCurrencyInfo(spend)
  const sendInfo = getCurrencyInfo(send)
  const requiredPairs = useMemo(() => [{ base: send, quote: spend }, ...state.plan.holdings.map((holding) => ({ base: holding.currency, quote: spend }))], [send, spend, state.plan.holdings])
  const { rates, loading: ratesLoading, errors: rateErrors } = useFrankfurterRates(requiredPairs)
  const referenceRates = useMemo(() => {
    const result = { ...rates }
    requiredPairs.filter((pair) => pair.base === pair.quote).forEach((pair) => {
      result[pairKey(pair.base, pair.quote)] ??= { rate: 1, source: 'frankfurter', label: 'Same-currency identity rate', updatedAt: null }
    })
    return result
  }, [rates, requiredPairs])
  const missingPairs = requiredPairs.filter((pair) => pair.base !== pair.quote && !(state.exchange.customRates[pairKey(pair.base, pair.quote)] > 0) && !rates[pairKey(pair.base, pair.quote)])
  const rateProblem = missingPairs.map((pair) => rateErrors[pairKey(pair.base, pair.quote)]).find(Boolean)

  const baseline = useMemo(() => buildPlan(state, {}, referenceRates), [state, referenceRates])
  const build = useMemo(() => buildPlan(state, { cuts }, referenceRates), [state, cuts, referenceRates])
  const sim = useMemo(() => simulate(build.input), [build])
  const baseSim = useMemo(() => simulate(baseline.input), [baseline])
  const runway = useMemo(() => runwayDays(build.input), [build])
  const warnings = useMemo(() => healthWarnings(state, build, sim), [state, build, sim])
  const lines = useMemo(
    () => healthInsights({ state, build, sim, runway }),
    [state, build, sim, runway],
  )

  const monthly = monthlyTotal(state.plan.categories)
  const cutMonthly = build.monthlyExpenses
  const alreadyHeld = build.cash + build.holdingsTotal
  const expectedConverted = build.transfer.net
  const usingCuts = CATEGORIES.some((category) => (cuts[category.id] ?? 0) > 0)

  const spendData = CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    value: state.plan.categories[category.id],
    color: category.color,
  }))

  const weekData = sim.weeks.map((week) => ({ label: `W${week.week}`, income: week.income, expenses: week.expenses }))
  const monthData = new Map<string, { label: string; income: number; expenses: number }>()
  for (const point of sim.points.slice(1)) {
    const key = point.date.slice(0, 7)
    let item = monthData.get(key)
    if (!item) {
      item = { label: new Date(`${key}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }), income: 0, expenses: 0 }
      monthData.set(key, item)
    }
    item.income += build.input.dailyIncome
    item.expenses += build.input.dailyExpense
    for (const event of point.events) {
      if (event.delta > 0) item.income += event.delta
      else item.expenses += Math.abs(event.delta)
    }
  }
  const cashflowData = cashflowView === 'weekly' ? weekData : [...monthData.values()]

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeading
          title="Where you live and spend"
          description="Home support is converted into the spending currency before it is included in totals. Money already received is kept separate from the expected transfer."
        />
        <div className="mt-6">
          <RouteContext sendLabel="Home country" receiveLabel="Country of residence" />
        </div>
      </Panel>

      {missingPairs.length > 0 ? <Panel>
        <PanelHeading title={rateProblem ? 'Reference rates unavailable' : 'Loading reference rates'} description={rateProblem || `Financial Health uses Frankfurter reference quotes for ${[...new Set(missingPairs.map((pair) => `${pair.base}/${pair.quote}`))].join(', ')}.`} />
        {Object.values(ratesLoading).some(Boolean) && <p role="status" className="mt-3 text-sm text-muted-foreground">Loading exchange rates…</p>}
        <p className="mt-3 text-xs text-muted-foreground">Rates are updated periodically and may differ from bank or money-transfer-provider rates.</p>
      </Panel> : <>
      <p className="text-xs text-muted-foreground">{build.quote.source === 'custom' ? 'Custom baseline rate' : 'Frankfurter reference rate'}: 1 {send} = {formatFxRate(build.quote.rate)} {spend}{build.quote.updatedAt ? ` · rate date ${build.quote.updatedAt}` : ''}. Future rate changes remain hypothetical.</p>
      <Panel>
        <PanelHeading
          title="Balances and support"
          description="Illustrative figures. Change them to match a real situation."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            label="Available balance (already received)"
            value={state.plan.balance}
            prefix={spendInfo.symbol}
            decimals={spendInfo.decimals}
            hint="Cash in the spending currency. Not counted again when the transfer arrives."
            onChange={(balance) => updatePlan({ balance })}
          />
          <NumberField
            label="Expected family support"
            value={state.plan.transferAmount}
            prefix={sendInfo.symbol}
            decimals={sendInfo.decimals}
            hint={`Future transfer · ≈ ${formatMoney(expectedConverted, spend)} after fees`}
            onChange={(transferAmount) => updatePlan({ transferAmount })}
          />
          <DateField
            label="Expected transfer date"
            value={state.plan.transferDate}
            onChange={(transferDate) => updatePlan({ transferDate })}
          />
          <label className="block text-sm text-muted-foreground">
            Family transfer frequency
            <select value={state.plan.transferFrequency} onChange={(event) => updatePlan({ transferFrequency: event.target.value as typeof state.plan.transferFrequency })} className="mt-2 block w-full rounded-2xl border border-foreground/10 bg-background/60 px-3.5 py-3 text-foreground outline-none focus:border-lavender/60 focus:ring-2 focus:ring-lavender/30">
              <option value="once">One-time</option><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Monthly</option>
            </select>
          </label>
          <NumberField
            label="Monthly expenses"
            value={monthly}
            prefix={spendInfo.symbol}
            decimals={0}
            hint="Scales every spending category proportionally. Fine-tune them in the breakdown."
            onChange={setMonthlyExpenses}
          />
          <NumberField
            label="Safety reserve"
            value={state.plan.reserve}
            prefix={spendInfo.symbol}
            decimals={0}
            onChange={(reserve) => updatePlan({ reserve })}
          />
          <div className="rounded-2xl border border-foreground/[0.08] bg-background/50 p-4">
            <p className="text-xs text-muted-foreground">Projected runway without further transfers</p>
            <p className="mt-1.5 font-serif text-2xl text-foreground">{formatRunway(runway)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Until the reserve would be breached</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Already in hand" value={formatPlanMoney(alreadyHeld, spend)} note="Spending currency plus converted holdings" />
        <Stat
          label="Expected transfer"
          value={formatPlanMoney(expectedConverted, spend)}
          note={`From ${formatMoney(state.plan.transferAmount, send)}`}
        />
        <Stat label="Monthly expenses" value={formatPlanMoney(cutMonthly, spend)} note={usingCuts ? 'After budget simulator cuts' : 'Current breakdown'} />
        <Stat
          label={`Lowest in ${state.plan.forecastWeeks} weeks`}
          value={formatPlanMoney(sim.lowest.balance, spend)}
          tone={sim.firstBreach ? 'coral' : 'mint'}
          note={sim.firstBreach ? 'Reserve breached in window' : 'Reserve holds'}
        />
      </div>

      <Panel>
        <PanelHeading
          title="Other currencies"
              description="Savings and monthly income are converted using the Frankfurter reference rate before they enter spending-currency totals."
        />
        <div className="mt-5 space-y-3">
          {build.holdings.map((holding) => {
            const info = getCurrencyInfo(holding.currency)
            return (
              <div
                key={holding.id}
                className="grid gap-3 rounded-2xl border border-foreground/[0.08] bg-background/40 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <CurrencyPicker
                  label="Currency"
                  value={holding.currency}
                  currencies={currencies}
                  onChange={(currency) => updateHolding(holding.id, { currency })}
                />
                <NumberField
                  label="Already held"
                  value={holding.amount}
                  prefix={info.symbol}
                  decimals={info.decimals}
                  hint={`≈ ${formatMoney(holding.amountConverted, spend)}`}
                  onChange={(amount) => updateHolding(holding.id, { amount })}
                />
                <NumberField
                  label="Monthly income in this currency"
                  value={holding.monthlyIncome}
                  prefix={info.symbol}
                  decimals={info.decimals}
                  hint={`≈ ${formatMoney(holding.incomeConverted, spend)} / month`}
                  onChange={(monthlyIncome) => updateHolding(holding.id, { monthlyIncome })}
                />
                <button
                  type="button"
                  onClick={() => removeHolding(holding.id)}
                  aria-label={`Remove ${holding.currency} holding`}
                  className="mt-7 inline-flex size-10 items-center justify-center rounded-full border border-foreground/15 text-muted-foreground outline-none hover:text-coral focus-visible:ring-2 focus-visible:ring-lavender"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <CurrencyPicker
              label="Add a currency"
              value={holdingCurrency}
              exclude={[spend, ...state.plan.holdings.map((holding) => holding.currency)]}
              currencies={currencies}
              onChange={setHoldingCurrency}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const taken = new Set([spend, ...state.plan.holdings.map((holding) => holding.currency)])
              if (taken.has(holdingCurrency)) return
              addHolding(holdingCurrency, 0)
              const next = currencies.find((currency) => !taken.has(currency.code) && currency.code !== holdingCurrency)
              if (next) setHoldingCurrency(next.code)
            }}
            className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-2.5 text-sm text-foreground outline-none hover:border-lavender/40 focus-visible:ring-2 focus-visible:ring-lavender"
          >
            <Plus className="size-4" aria-hidden />
            Add holding
          </button>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
      <Panel>
        <PanelHeading title="Forecast period" description="The same period is used by the balance chart, totals, and safety warnings." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-muted-foreground">
            Preset
            <select value={[1, 2, 4, 8, 12, 26, 52, 104].includes(state.plan.forecastWeeks) ? state.plan.forecastWeeks : 'custom'} onChange={(event) => event.target.value !== 'custom' && updatePlan({ forecastWeeks: Number(event.target.value) })} className="mt-2 block w-full rounded-2xl border border-foreground/10 bg-background/60 px-3.5 py-3 text-foreground outline-none focus:border-lavender/60 focus:ring-2 focus:ring-lavender/30">
              <option value={1}>1 week</option><option value={2}>2 weeks</option><option value={4}>4 weeks</option><option value={8}>8 weeks</option><option value={12}>12 weeks</option><option value={26}>6 months</option><option value={52}>12 months</option><option value={104}>24 months</option><option value="custom">Custom</option>
            </select>
          </label>
          <NumberField label="Custom period" value={state.plan.forecastWeeks} min={1} max={104} decimals={0} suffix="weeks" hint="Choose any forecast from 1 to 104 weeks." onChange={(forecastWeeks) => updatePlan({ forecastWeeks: Math.round(forecastWeeks) })} />
        </div>
      </Panel>

      <Panel>
        <PanelHeading title="Spending breakdown" description="Adjust category amounts and choose how to view the breakdown. Changes feed the forecast." />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Monthly plan · {formatPlanMoney(monthly, spend)} total</p>
          <div className="flex rounded-full border border-foreground/10 p-1" role="group" aria-label="Spending breakdown chart style">
            {(['donut', 'bars'] as const).map((view) => (
              <button key={view} type="button" aria-pressed={spendingChart === view} onClick={() => setSpendingChart(view)} className={cn('rounded-full px-3 py-1.5 text-xs capitalize transition-colors', spendingChart === view ? 'bg-lavender/15 text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {view === 'donut' ? 'Donut' : 'Bars'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid items-center gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="h-[240px] min-w-0" role="img" aria-label={`${spendingChart === 'donut' ? 'Donut' : 'Bar'} chart of planned monthly spending by category`}>
            <ResponsiveContainer width="100%" height="100%">
              {spendingChart === 'donut' ? (
                <PieChart>
                  <Pie data={spendData} dataKey="value" nameKey="label" innerRadius={58} outerRadius={88} paddingAngle={2}>
                    {spendData.map((item) => <Cell key={item.id} fill={item.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatPlanMoney(Number(value ?? 0), spend)} contentStyle={{ background: '#202327', border: '1px solid rgba(243,240,234,0.12)', borderRadius: 12 }} />
                </PieChart>
              ) : (
                <BarChart data={spendData} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(243,240,234,0.06)" />
                  <XAxis type="number" tick={{ fill: '#A3A6AB', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={104} tick={{ fill: '#A3A6AB', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatPlanMoney(Number(value ?? 0), spend)} contentStyle={{ background: '#202327', border: '1px solid rgba(243,240,234,0.12)', borderRadius: 12 }} />
                  <Bar dataKey="value" name="Monthly spending" radius={[0, 5, 5, 0]}>{spendData.map((item) => <Cell key={item.id} fill={item.color} />)}</Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <ul className="space-y-3">
            {CATEGORIES.map((category) => (
              <li key={category.id} className="grid grid-cols-[1fr_140px] items-center gap-3">
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <span className="size-2.5 rounded-full" style={{ background: category.color }} aria-hidden />
                  {category.label}
                </span>
                <NumberField
                  label={`${category.label} amount`}
                  hideLabel
                  size="sm"
                  value={state.plan.categories[category.id]}
                  prefix={spendInfo.symbol}
                  decimals={0}
                  onChange={(amount) => setCategory(category.id, amount)}
                />
              </li>
            ))}
          </ul>
        </div>
        </Panel>

        <Panel>
          <PanelHeading
            title="Income versus expenses"
            description={`${cashflowView === 'weekly' ? 'Weekly' : 'Monthly'} converted income, including scheduled transfers, against spending.`}
          />
          <div className="mt-3 flex justify-end gap-2" role="group" aria-label="Income chart period">
            {(['weekly', 'monthly'] as const).map((view) => <button key={view} type="button" aria-pressed={cashflowView === view} onClick={() => setCashflowView(view)} className={cn('rounded-full border px-3 py-1.5 text-xs capitalize', cashflowView === view ? 'border-lavender/50 bg-lavender/10 text-foreground' : 'border-foreground/10 text-muted-foreground')}>{view}</button>)}
          </div>
          <div className="mt-4 h-[280px]">
            <ul className="mb-3 flex gap-5 text-xs text-muted-foreground" aria-label="Chart legend">
              <li className="inline-flex items-center gap-2"><span className="size-2.5 rounded-sm bg-mint" aria-hidden />Income</li>
              <li className="inline-flex items-center gap-2"><span className="size-2.5 rounded-sm bg-coral" aria-hidden />Expenses</li>
            </ul>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(243,240,234,0.06)" />
                <XAxis dataKey="label" tick={{ fill: '#A3A6AB', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(value) => formatCompact(value)}
                  tick={{ fill: '#A3A6AB', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatPlanMoney(Number(value ?? 0), spend),
                    name === 'income' ? 'Income' : 'Expenses',
                  ]}
                  contentStyle={{
                    background: '#202327',
                    border: '1px solid rgba(243,240,234,0.12)',
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="income" fill="#85D6B1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" fill="#E58A87" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeading
          title={`${state.plan.forecastWeeks}-week cash-flow forecast`}
          description="Scheduled transfers and payments are counted on their dates, after conversion and fees."
        />
        <div className="mt-6">
          <BalanceChart
            sim={sim}
            comparison={usingCuts ? baseSim : undefined}
            reserve={state.plan.reserve}
            currency={spend}
            accent={sim.firstBreach ? '#E58A87' : '#B8A8F8'}
            label={`${state.plan.forecastWeeks}-week ${spend} cash-flow forecast`}
          />
        </div>
      </Panel>

      <Panel>
        <PanelHeading title="Upcoming payments" description="Schedule one-time or recurring tuition and other costs in the spending currency." />
        <div className="mt-5 space-y-3">
          {state.plan.payments.map((payment) => (
            <div
              key={payment.id}
              className="grid gap-3 rounded-2xl border border-foreground/[0.08] bg-background/40 p-4 sm:grid-cols-[1fr_140px_160px_160px_auto]"
            >
              <TextField label="Label" value={payment.label} onChange={(label) => updatePayment(payment.id, { label })} />
              <NumberField
                label="Amount"
                value={payment.amount}
                prefix={spendInfo.symbol}
                decimals={0}
                size="sm"
                onChange={(amount) => updatePayment(payment.id, { amount })}
              />
              <DateField
                label="Date"
                value={payment.date}
                size="sm"
                onChange={(date) => updatePayment(payment.id, { date })}
              />
              <label className="block text-sm text-muted-foreground">
                Frequency
                <select value={payment.frequency} onChange={(event) => updatePayment(payment.id, { frequency: event.target.value as typeof payment.frequency })} className="mt-2 block w-full rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none focus:border-lavender/60 focus:ring-2 focus:ring-lavender/30">
                  <option value="once">One-time</option><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Monthly</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => removePayment(payment.id)}
                disabled={payment.kind === 'tuition' && state.plan.payments.filter((item) => item.kind === 'tuition').length < 2}
                aria-label={`Remove ${payment.label}`}
                className="mt-7 inline-flex size-10 items-center justify-center rounded-full border border-foreground/15 text-muted-foreground outline-none hover:text-coral focus-visible:ring-2 focus-visible:ring-lavender disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addPayment}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-2.5 text-sm text-foreground outline-none hover:border-lavender/40 focus-visible:ring-2 focus-visible:ring-lavender"
        >
          <Plus className="size-4" aria-hidden />
          Add payment
        </button>
      </Panel>

      {warnings.length > 0 && (
        <Panel>
          <PanelHeading title="Upcoming expense warnings" />
          <ul className="mt-4 space-y-3">
            {warnings.map((warning) => (
              <li
                key={warning.title}
                className={cn(
                  'rounded-2xl border px-4 py-3',
                  warning.level === 'danger'
                    ? 'border-coral/30 bg-coral/8'
                    : 'border-foreground/10 bg-background/50',
                )}
              >
                <p className={cn('text-sm font-medium', warning.level === 'danger' ? 'text-coral' : 'text-foreground')}>
                  {warning.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{warning.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <PanelHeading
          title="Budget improvement simulator"
          description="Temporarily trim a category to see the forecast move. These cuts are not saved with the rest of the demo."
          action={usingCuts ? <Badge tone="mint">Simulator on</Badge> : undefined}
        />
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {CATEGORIES.map((category) => {
            const cut = cuts[category.id] ?? 0
            return (
              <li key={category.id}>
                <label className="flex items-baseline justify-between text-sm">
                  <span className="text-foreground">{category.label}</span>
                  <span className="tabular-nums text-muted-foreground">{cut}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={5}
                  value={cut}
                  aria-label={`Cut ${category.label} by percent`}
                  onChange={(event) =>
                    setCuts((prev) => ({ ...prev, [category.id]: Number(event.target.value) }))
                  }
                  className="mt-2 w-full cursor-pointer accent-[#B8A8F8]"
                />
              </li>
            )
          })}
        </ul>
        {usingCuts && (
          <p className="mt-4 text-sm text-muted-foreground">
            Monthly spending falls from {formatPlanMoney(monthly, spend)} to{' '}
            {formatPlanMoney(cutMonthly, spend)}. Week-8 balance moves{' '}
            {formatPlanMoney(sim.final.balance - baseSim.final.balance, spend, { sign: true })} versus the
            uncut plan.
          </p>
        )}
      </Panel>

      <Panel>
        <PanelHeading title="What the numbers say" description="Generated from the current calculation, not an unsupported prediction." />
        <ul className="mt-4 space-y-3">
          {lines.map((line) => (
            <li key={line} className="rounded-2xl border border-foreground/[0.08] bg-background/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              {line}
            </li>
          ))}
        </ul>
      </Panel>
      </>}
    </div>
  )
}
