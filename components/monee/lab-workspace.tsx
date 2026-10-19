'use client'

import { useMemo, useState } from 'react'
import { Copy, FolderOpen, Save, Trash2 } from 'lucide-react'
import { BalanceChart } from './balance-chart'
import { useFinance } from './finance-provider'
import { DateField, NumberField, TextField } from './number-field'
import { Badge, Panel, PanelHeading, Stat } from './panel'
import { RouteContext } from './route-context'
import { Segmented } from './segmented'
import { formatDate } from '@/lib/dates'
import { monthlyTotal, type LabScenarioId } from '@/lib/finance-state'
import { formatFxRate, formatMoney, formatPercent, formatPlanMoney, getCurrencyInfo, pairKey } from '@/lib/fx'
import { labInsight } from '@/lib/insights'
import { runScenario } from '@/lib/plan'
import { cn } from '@/lib/utils'
import { useFrankfurterRates } from '@/lib/frankfurter-client'
import { ScenarioExplanation } from './scenario-explanation'

const SCENARIOS: { id: LabScenarioId; title: string; summary: string }[] = [
  { id: 'baseline', title: 'Baseline Plan', summary: 'Current assumptions, no extra shocks.' },
  { id: 'late', title: 'Late Family Transfer', summary: 'Delay the transfer and watch cash on hand.' },
  { id: 'rate', title: 'Exchange-Rate Change', summary: 'Sending currency strengthens or weakens.' },
  { id: 'expense', title: 'Unexpected Expense', summary: 'Add a cost and choose when it hits.' },
  { id: 'stress', title: 'Combined Stress Test', summary: 'Combine a delayed transfer, weaker rate, and unexpected cost.' },
  { id: 'custom', title: 'Custom Scenario', summary: 'Combine your own income, tuition, spending, and rate assumptions.' },
]

export function LabWorkspace() {
  const { state, updatePlan, updateLab, setMonthlyExpenses, updatePayment, saveScenario, openScenario, duplicateScenario, deleteScenario, renameScenario } = useFinance()
  const [scenarioName, setScenarioName] = useState('')
  const spend = state.route.receiveCurrency
  const send = state.route.sendCurrency
  const spendInfo = getCurrencyInfo(spend)
  const sendInfo = getCurrencyInfo(send)
  const tuition = state.plan.payments.find((payment) => payment.kind === 'tuition')
  const requiredPairs = useMemo(() => [
    { base: send, quote: spend },
    ...state.plan.holdings.map((holding) => ({ base: holding.currency, quote: spend })),
  ], [send, spend, state.plan.holdings])
  const { rates, loading: ratesLoading, errors: rateErrors } = useFrankfurterRates(requiredPairs)
  const referenceRates = useMemo(() => {
    const result = { ...rates }
    requiredPairs.filter((pair) => pair.base === pair.quote).forEach((pair) => {
      result[pairKey(pair.base, pair.quote)] ??= { rate: 1, source: 'frankfurter', label: 'Same-currency identity rate', updatedAt: null }
    })
    return result
  }, [rates, requiredPairs])
  const missingPairs = requiredPairs.filter((pair) => pair.base !== pair.quote && !(state.exchange.customRates[pairKey(pair.base, pair.quote)] > 0) && !rates[pairKey(pair.base, pair.quote)])
  const ratesReady = missingPairs.length === 0
  const rateProblem = missingPairs.map((pair) => rateErrors[pairKey(pair.base, pair.quote)]).find(Boolean)

  const baseline = useMemo(() => runScenario(state, 'baseline', referenceRates), [state, referenceRates])
  const selected = useMemo(() => runScenario(state, state.lab.scenario, referenceRates), [state, referenceRates])
  const extraRuns = useMemo(
    () =>
      SCENARIOS.filter((item) => item.id !== 'baseline').map((item) => ({
        ...item,
        run: runScenario(state, item.id, referenceRates),
      })),
    [state, referenceRates],
  )
  const savedRuns = useMemo(() => state.savedScenarios.map((scenario) => ({
    scenario,
    run: runScenario({ ...state, route: scenario.route, exchange: scenario.exchange, plan: scenario.plan, lab: scenario.lab }, scenario.lab.scenario, referenceRates),
  })), [state, referenceRates])
  const insight = useMemo(
    () =>
      labInsight({
        state,
        scenario: state.lab.scenario,
        base: { build: baseline.build, sim: baseline.sim },
        run: { build: selected.build, sim: selected.sim },
      }),
    [baseline, selected, state],
  )

  const lowestDelta = selected.sim.lowest.balance - baseline.sim.lowest.balance
  const finalDelta = selected.sim.final.balance - baseline.sim.final.balance
  const accent = selected.sim.firstBreach ? '#E58A87' : '#B8A8F8'

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeading
          title="Your corridor"
          description="Family support arrives in the sending currency and is converted into the spending currency before it is added to the plan."
        />
        <div className="mt-6">
          <RouteContext />
        </div>
      </Panel>

      {!ratesReady ? <Panel>
        <PanelHeading title={rateProblem ? 'Reference rates unavailable' : 'Loading reference rates'} description={rateProblem || `Fetching Frankfurter quotes for ${[...new Set(missingPairs.map((pair) => `${pair.base}/${pair.quote}`))].join(', ')}. Future Lab calculations will use the dated reference rates when available.`} />
        {Object.values(ratesLoading).some(Boolean) && <p className="mt-3 text-sm text-muted-foreground" role="status">Loading exchange rates…</p>}
        <p className="mt-3 text-xs text-muted-foreground">Hypothetical scenario changes are applied on top of the reference rate; they are not predictions.</p>
      </Panel> : <>
      <p className="text-xs text-muted-foreground">
        {baseline.build.quote.source === 'custom' ? 'Custom baseline rate' : 'Frankfurter reference rate'}: 1 {send} = {formatFxRate(baseline.build.quote.rate)} {spend}
        {baseline.build.quote.updatedAt ? ` · rate date ${baseline.build.quote.updatedAt}` : ''}.
        {' '}Future Lab rate changes are hypothetical scenarios, not predictions. Reference rates from Frankfurter are updated periodically and may differ from rates offered by banks and money-transfer providers.
      </p>
      <Panel>
        <PanelHeading
          title="Plan inputs"
          description="All amounts except the family transfer are in the spending currency. Demo figures, fully editable."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            label="Available balance"
            value={state.plan.balance}
            prefix={spendInfo.symbol}
            decimals={spendInfo.decimals}
            onChange={(balance) => updatePlan({ balance })}
          />
          <NumberField
            label="Expected transfer amount"
            value={state.plan.transferAmount}
            prefix={sendInfo.symbol}
            decimals={sendInfo.decimals}
            hint={`Converts to about ${formatMoney(selected.build.transfer.net, spend)} after fees`}
            onChange={(transferAmount) => updatePlan({ transferAmount })}
          />
          <DateField
            label="Expected transfer date"
            value={state.plan.transferDate}
            onChange={(transferDate) => updatePlan({ transferDate })}
          />
          <NumberField
            label="Monthly expenses"
            value={monthlyTotal(state.plan.categories)}
            prefix={spendInfo.symbol}
            decimals={0}
            onChange={setMonthlyExpenses}
          />
          <label className="text-sm text-muted-foreground">Forecast unit<select value={state.plan.forecastUnit} onChange={(event) => updatePlan({ forecastUnit: event.target.value as 'weekly' | 'monthly' })} className="mt-2 block w-full rounded-2xl border border-foreground/10 bg-background/60 px-3.5 py-3 text-foreground"><option value="weekly">Weeks</option><option value="monthly">Months</option></select></label>
          <NumberField label={`Forecast duration (${state.plan.forecastUnit === 'weekly' ? 'weeks' : 'months'})`} value={state.plan.forecastUnit === 'weekly' ? state.plan.forecastWeeks : Math.max(1, Math.round(state.plan.forecastWeeks / 4.345))} min={1} max={state.plan.forecastUnit === 'weekly' ? 104 : 24} decimals={0} suffix={state.plan.forecastUnit === 'weekly' ? 'weeks' : 'months'} onChange={(value) => updatePlan({ forecastWeeks: state.plan.forecastUnit === 'weekly' ? Math.round(value) : Math.min(104, Math.round(value * 4.345)) })} />
          {tuition && (
            <NumberField
              label="Tuition payment"
              value={tuition.amount}
              prefix={spendInfo.symbol}
              decimals={0}
              onChange={(amount) => updatePayment(tuition.id, { amount })}
            />
          )}
          {tuition && (
            <DateField
              label="Tuition date"
              value={tuition.date}
              onChange={(date) => updatePayment(tuition.id, { date })}
            />
          )}
          <NumberField
            label="Safety reserve"
            value={state.plan.reserve}
            prefix={spendInfo.symbol}
            decimals={0}
            onChange={(reserve) => updatePlan({ reserve })}
          />
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SCENARIOS.map((scenario) => {
          const run = scenario.id === 'baseline' ? baseline : extraRuns.find((item) => item.id === scenario.id)!.run
          const active = state.lab.scenario === scenario.id
          const delta = run.sim.final.balance - baseline.sim.final.balance
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => updateLab({ scenario: scenario.id })}
              className={cn(
                'rounded-3xl border p-5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lavender',
                active
                  ? 'border-lavender/50 bg-card shadow-[0_0_0_1px_rgba(184,168,248,0.2)]'
                  : 'border-foreground/[0.08] bg-card/60 hover:border-foreground/20',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif text-xl text-foreground">{scenario.title}</h3>
                {active && <Badge>Selected</Badge>}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{scenario.summary}</p>
              <p className="mt-4 font-serif text-2xl tabular-nums text-foreground">
                {formatPlanMoney(run.sim.lowest.balance, spend)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Lowest · {formatDate(run.sim.lowest.date)}
                {scenario.id !== 'baseline' && (
                  <span className={cn('ml-1 tabular-nums', delta >= 0 ? 'text-mint' : 'text-coral')}>
                    {formatPlanMoney(delta, spend, { sign: true })} final
                  </span>
                )}
              </p>
            </button>
          )
        })}
      </div>

      <Panel>
        <PanelHeading title="Saved scenarios" description="Save, reopen, rename, duplicate, and compare assumption snapshots from this browser." />
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-sm text-muted-foreground">Scenario name<input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} maxLength={60} placeholder="e.g. Rent increase next term" className="mt-2 block w-full rounded-2xl border border-foreground/10 bg-background/60 px-3.5 py-3 text-foreground outline-none focus:border-lavender/60" /></label>
          <button type="button" onClick={() => { saveScenario(scenarioName || SCENARIOS.find((item) => item.id === state.lab.scenario)?.title || 'My scenario'); setScenarioName('') }} className="inline-flex items-center gap-2 rounded-full border border-lavender/30 px-4 py-3 text-sm text-foreground hover:bg-lavender/10"><Save className="size-4" />Save current</button>
        </div>
        {savedRuns.length > 0 ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{savedRuns.map(({ scenario, run }) => <article key={scenario.id} className="rounded-2xl border border-foreground/[0.08] bg-background/40 p-4"><input aria-label="Saved scenario name" value={scenario.name} onChange={(event) => renameScenario(scenario.id, event.target.value)} className="w-full bg-transparent font-medium text-foreground outline-none" /><p className="mt-1 text-xs text-muted-foreground">{SCENARIOS.find((item) => item.id === scenario.lab.scenario)?.title} · {scenario.plan.forecastWeeks} weeks</p><p className="mt-3 text-sm text-muted-foreground">Lowest {formatPlanMoney(run.sim.lowest.balance, scenario.route.receiveCurrency)} · ending {formatPlanMoney(run.sim.final.balance, scenario.route.receiveCurrency)}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => openScenario(scenario.id)} className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 px-3 py-1.5 text-xs text-foreground"><FolderOpen className="size-3.5" />Reopen</button><button type="button" onClick={() => duplicateScenario(scenario.id)} aria-label={`Duplicate ${scenario.name}`} className="rounded-full border border-foreground/10 p-1.5 text-muted-foreground hover:text-foreground"><Copy className="size-3.5" /></button><button type="button" onClick={() => deleteScenario(scenario.id)} aria-label={`Delete ${scenario.name}`} className="rounded-full border border-foreground/10 p-1.5 text-muted-foreground hover:text-coral"><Trash2 className="size-3.5" /></button></div></article>)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-foreground/15 p-5 text-sm text-muted-foreground">No saved scenarios yet. Choose assumptions above and save a snapshot to compare later.</p>}
        {savedRuns.length > 1 && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="py-2">Scenario comparison</th><th>Lowest balance</th><th>Ending balance</th><th>First reserve breach</th></tr></thead><tbody>{savedRuns.map(({ scenario, run }) => <tr key={`compare-${scenario.id}`} className="border-t border-foreground/[0.08]"><th className="py-3 pr-4 font-medium text-foreground">{scenario.name}</th><td>{formatPlanMoney(run.sim.lowest.balance, scenario.route.receiveCurrency)}</td><td>{formatPlanMoney(run.sim.final.balance, scenario.route.receiveCurrency)}</td><td>{run.sim.firstBreach ? formatDate(run.sim.firstBreach.date) : 'None'}</td></tr>)}</tbody></table></div>}
      </Panel>

      {state.lab.scenario === 'late' && (
        <Panel>
          <PanelHeading title="Late transfer controls" />
          <div className="mt-4 max-w-sm">
            <NumberField
              label="Days late"
              value={state.lab.lateDays}
              min={1}
              max={56}
              decimals={0}
              suffix="days"
              hint={`Arrives ${formatDate(selected.build.transferDate)} instead of ${formatDate(state.plan.transferDate)}.`}
              onChange={(lateDays) => updateLab({ lateDays })}
            />
          </div>
        </Panel>
      )}

      {state.lab.scenario === 'rate' && (
        <Panel>
          <PanelHeading
            title="Exchange-rate change"
            description={`Simulate ${send} moving against ${spend}. The family transfer is converted at the moved rate, then fees are taken.`}
          />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Segmented
              label={`${send} movement against ${spend}`}
              value={state.lab.rateMove >= 0 ? 1 : -1}
              onChange={(direction) =>
                updateLab({ rateMove: Math.abs(state.lab.rateMove || 5) * direction })
              }
              options={[
                { value: -1, label: `${send} weakens` },
                { value: 1, label: `${send} strengthens` },
              ]}
            />
            <NumberField
              className="max-w-48"
              label="Move size"
              value={Math.abs(state.lab.rateMove)}
              min={0}
              max={30}
              decimals={1}
              suffix="%"
              hideLabel
              onChange={(size) =>
                updateLab({ rateMove: size * (state.lab.rateMove >= 0 ? 1 : -1) })
              }
            />
            <p
              className={cn(
                'text-sm tabular-nums',
                state.lab.rateMove > 0 ? 'text-mint' : state.lab.rateMove < 0 ? 'text-coral' : 'text-muted-foreground',
              )}
            >
              {formatPercent(state.lab.rateMove, 1, true)} · transfer becomes{' '}
              {formatMoney(selected.build.transfer.net, spend)}
            </p>
          </div>
        </Panel>
      )}

      {state.lab.scenario === 'expense' && (
        <Panel>
          <PanelHeading title="Unexpected expense" />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <TextField
              label="What is it?"
              value={state.lab.expenseLabel}
              onChange={(expenseLabel) => updateLab({ expenseLabel })}
            />
            <NumberField
              label="Amount"
              value={state.lab.expenseAmount}
              prefix={spendInfo.symbol}
              decimals={0}
              onChange={(expenseAmount) => updateLab({ expenseAmount })}
            />
            <DateField
              label="When"
              value={state.lab.expenseDate}
              onChange={(expenseDate) => updateLab({ expenseDate })}
            />
          </div>
        </Panel>
      )}

      {state.lab.scenario === 'stress' && (
        <Panel>
          <PanelHeading title="Combined stress assumptions" description="These hypothetical changes are applied together to the same plan. Each value is editable." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField label="Transfer delay" value={state.lab.lateDays} min={0} max={365} decimals={0} suffix="days" onChange={(lateDays) => updateLab({ lateDays })} />
            <NumberField label="Sending currency weakens" value={Math.abs(state.lab.rateMove)} min={0} max={90} decimals={1} suffix="%" onChange={(value) => updateLab({ rateMove: value })} />
            <NumberField label="Unexpected cost" value={state.lab.expenseAmount} prefix={spendInfo.symbol} decimals={0} onChange={(expenseAmount) => updateLab({ expenseAmount })} />
            <DateField label="Unexpected cost date" value={state.lab.expenseDate} onChange={(expenseDate) => updateLab({ expenseDate })} />
            <NumberField label="Tuition increase" value={state.lab.tuitionIncreasePct} min={0} max={1000} decimals={1} suffix="%" onChange={(tuitionIncreasePct) => updateLab({ tuitionIncreasePct })} />
            <NumberField label="Part-time income per occurrence" value={state.lab.extraIncomeAmount} min={0} decimals={2} prefix={spendInfo.symbol} onChange={(extraIncomeAmount) => updateLab({ extraIncomeAmount })} />
          </div>
        </Panel>
      )}

      {state.lab.scenario === 'custom' && (
        <Panel>
          <PanelHeading title="Build a custom scenario" description="Combine a rate change, transfer delay, tuition increase, new income, and unexpected expense. These inputs are hypothetical." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField label="Family transfer delay" value={state.lab.lateDays} min={0} max={365} decimals={0} suffix="days" onChange={(lateDays) => updateLab({ lateDays })} />
            <NumberField label="Sending-currency rate change" value={state.lab.rateMove} min={-90} max={90} decimals={1} suffix="%" onChange={(rateMove) => updateLab({ rateMove })} />
            <NumberField label="Tuition increase" value={state.lab.tuitionIncreasePct} min={0} max={1000} decimals={1} suffix="%" onChange={(tuitionIncreasePct) => updateLab({ tuitionIncreasePct })} />
            <TextField label="Part-time income" value={state.lab.extraIncomeLabel} onChange={(extraIncomeLabel) => updateLab({ extraIncomeLabel })} />
            <NumberField label="Income per occurrence" value={state.lab.extraIncomeAmount} min={0} decimals={2} prefix={spendInfo.symbol} onChange={(extraIncomeAmount) => updateLab({ extraIncomeAmount })} />
            <DateField label="First income date" value={state.lab.extraIncomeDate} onChange={(extraIncomeDate) => updateLab({ extraIncomeDate })} />
            <label className="text-sm text-muted-foreground">Income frequency<select value={state.lab.extraIncomeFrequency} onChange={(event) => updateLab({ extraIncomeFrequency: event.target.value as 'once' | 'weekly' | 'biweekly' | 'monthly' })} className="mt-2 block w-full rounded-2xl border border-foreground/10 bg-background/60 px-3.5 py-3 text-foreground"><option value="once">Once</option><option value="weekly">Weekly</option><option value="biweekly">Every two weeks</option><option value="monthly">Monthly</option></select></label>
            <TextField label="Unexpected expense" value={state.lab.expenseLabel} onChange={(expenseLabel) => updateLab({ expenseLabel })} />
            <NumberField label="Expense amount" value={state.lab.expenseAmount} min={0} decimals={2} prefix={spendInfo.symbol} onChange={(expenseAmount) => updateLab({ expenseAmount })} />
            <DateField label="Expense date" value={state.lab.expenseDate} onChange={(expenseDate) => updateLab({ expenseDate })} />
          </div>
        </Panel>
      )}

      <Panel>
          <PanelHeading
          title={`${state.plan.forecastUnit === 'weekly' ? `${state.plan.forecastWeeks}-week` : `${Math.max(1, Math.round(state.plan.forecastWeeks / 4.345))}-month`} projection`}
          description="Solid line is the selected scenario. Dashed line is the baseline plan."
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat
            label="Lowest balance"
            value={formatPlanMoney(selected.sim.lowest.balance, spend)}
            note={formatDate(selected.sim.lowest.date)}
            tone={selected.sim.lowest.balance < state.plan.reserve ? 'coral' : 'neutral'}
          />
          <Stat
            label="Final balance"
            value={formatPlanMoney(selected.sim.final.balance, spend)}
            note={
              state.lab.scenario === 'baseline'
                ? `End of ${state.plan.forecastUnit === 'weekly' ? `week ${state.plan.forecastWeeks}` : `month ${Math.max(1, Math.round(state.plan.forecastWeeks / 4.345))}`}`
                : `${formatPlanMoney(finalDelta, spend, { sign: true })} vs baseline`
            }
            tone={finalDelta > 0.5 ? 'mint' : finalDelta < -0.5 ? 'coral' : 'neutral'}
          />
          <Stat
            label="Vs baseline (lowest)"
            value={formatPlanMoney(lowestDelta, spend, { sign: true })}
            tone={lowestDelta > 0.5 ? 'mint' : lowestDelta < -0.5 ? 'coral' : 'neutral'}
          />
          <Stat
            label="Safety reserve"
            value={
              selected.sim.firstBreach
                ? formatDate(selected.sim.firstBreach.date)
                : 'Held'
            }
            note={
              selected.sim.firstBreach
                ? `Below reserve from ${formatDate(selected.sim.firstBreach.date)}`
                : `${formatPlanMoney(state.plan.reserve, spend)} never breached`
            }
            tone={selected.sim.firstBreach ? 'coral' : 'mint'}
          />
          <Stat label="Top-up to avoid negative balance" value={formatPlanMoney(Math.max(0, -selected.sim.lowest.balance), spend)} note={selected.sim.lowest.balance < 0 ? 'Minimum amount required at the lowest point' : 'No negative balance in this scenario'} tone={selected.sim.lowest.balance < 0 ? 'coral' : 'mint'} />
        </div>
        <div className="mt-6">
          <BalanceChart
            sim={selected.sim}
            comparison={state.lab.scenario === 'baseline' ? undefined : baseline.sim}
            reserve={state.plan.reserve}
            currency={spend}
            accent={accent}
            label={`Projected ${spend} balance over ${state.plan.forecastUnit === 'weekly' ? `${state.plan.forecastWeeks} weeks` : `${Math.max(1, Math.round(state.plan.forecastWeeks / 4.345))} months`}`}
          />
        </div>
        <div className="mt-6 rounded-2xl border border-lavender/20 bg-lavender/5 p-5">
          <p className="font-serif text-xl text-foreground">{insight.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{insight.body}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {insight.facts.map((fact) => (
              <li
                key={fact}
                className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-foreground"
              >
                {fact}
              </li>
            ))}
          </ul>
        </div>
      </Panel>
      <ScenarioExplanation facts={{ currency: spend, lowestBalance: selected.sim.lowest.balance, endingBalance: selected.sim.final.balance, reserve: state.plan.reserve, firstShortfallDate: selected.sim.firstBreach?.date ?? null, transferDate: selected.build.transferDate, rateMovePct: state.lab.rateMove }} />
      </>}
    </div>
  )
}
