'use client'

import { PiggyBank, ShieldAlert, ShieldCheck, Users, Wallet } from 'lucide-react'
import { SectionHeading } from './cta'
import { CashflowChart } from './cashflow-chart'
import { useScenario } from './scenario-provider'
import { Segmented } from './segmented'
import { formatRate, formatSource } from '@/lib/currencies'
import {
  DEMO,
  formatDelta,
  formatMyr,
  type RateDirection,
  type ScenarioId,
} from '@/lib/simulation'
import { cn } from '@/lib/utils'

function SummaryCard({
  label,
  value,
  icon: Icon,
  valueClass,
  children,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  valueClass?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-foreground/[0.08] bg-card/60 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/[0.16] hover:bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground/70" aria-hidden />
      </div>
      <p className={cn('mt-3 font-serif text-3xl tracking-tight tabular-nums', valueClass)}>
        {value}
      </p>
      <div className="mt-2 min-h-10 text-xs leading-relaxed text-muted-foreground">{children}</div>
    </div>
  )
}

export function Overview() {
  const { options, currency, result, plan, setScenario, setRateDirection, setDelayPurchase } =
    useScenario()
  const a = options.assumptions
  const isPlan = options.scenario === 'plan'
  const endDelta = result.endBalance - plan.endBalance
  const breached = result.breaches.length > 0
  const firstTransferWeek = result.transferWeeks[0]

  const scenarioOptions: { value: ScenarioId; label: string }[] = [
    { value: 'plan', label: 'Your plan' },
    { value: 'late', label: 'Late transfer' },
    { value: 'rate', label: `${currency.code} changes` },
  ]

  return (
    <section id="overview" className="relative px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Financial overview"
          title="A clear picture of your money, today."
          description="Illustrative demo data standing in for your real accounts. Switch scenarios to see how the next eight weeks could change."
        />

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Available balance" value={formatMyr(DEMO.startBalance)} icon={Wallet}>
            <span className="tabular-nums">
              Week 8 projection: {formatMyr(result.endBalance)}
            </span>
            {!isPlan && Math.round(endDelta) !== 0 && (
              <span className={cn('ml-1.5 tabular-nums', endDelta > 0 ? 'text-mint' : 'text-coral')}>
                {formatDelta(endDelta)}
              </span>
            )}
          </SummaryCard>

          <SummaryCard
            label="Monthly expenses"
            value={formatMyr(DEMO.monthlyExpenses)}
            icon={PiggyBank}
          >
            About {formatMyr(DEMO.weeklyExpenses)} a week, plus a{' '}
            {formatMyr(a.purchaseAmount)} {a.purchaseLabel} in week {result.purchaseWeek}.
          </SummaryCard>

          <SummaryCard
            label="Expected family support"
            value={formatSource(a.transferAmount, currency.code)}
            icon={Users}
            valueClass="text-mint"
          >
            <span className="tabular-nums">≈ {formatMyr(result.net, 2)} per transfer</span>
            <br />
            {options.scenario === 'late'
              ? `Next one arrives week ${firstTransferWeek}, ${a.lateDays} ${a.lateDays === 1 ? 'day' : 'days'} late`
              : options.scenario === 'rate'
                ? `Simulated ${currency.code} ${options.rateDirection > 0 ? '+' : '−'}${a.rateMove}% (rate ${formatRate(result.rate)})`
                : `Arrives weeks ${result.transferWeeks.join(' and ')}`}
          </SummaryCard>

          <SummaryCard
            label="Safety reserve"
            value={formatMyr(a.reserve)}
            icon={breached ? ShieldAlert : ShieldCheck}
            valueClass="text-lavender"
          >
            <span className={cn('tabular-nums', breached ? 'text-coral' : 'text-mint')}>
              {breached
                ? `Breached in week ${result.breaches[0]}: ${formatMyr(result.lowest.balance)}`
                : `Holds: lowest ${formatMyr(result.lowest.balance)} in week ${result.lowest.week}`}
            </span>
          </SummaryCard>
        </div>

        <div className="mt-6 rounded-3xl border border-foreground/[0.08] bg-card/60 p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <h3 className="font-serif text-2xl text-foreground">Your next 8 weeks</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Projected balance in ringgit. Illustrative demo data.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <Segmented
                label="Scenario"
                value={options.scenario}
                onChange={setScenario}
                options={scenarioOptions}
              />
              <div className="flex flex-wrap items-center gap-3">
                {options.scenario === 'rate' && (
                  <Segmented<RateDirection>
                    label={`${currency.code} move against MYR`}
                    size="sm"
                    value={options.rateDirection}
                    onChange={setRateDirection}
                    options={[
                      { value: -1, label: `${currency.code} −${a.rateMove}%` },
                      { value: 1, label: `${currency.code} +${a.rateMove}%` },
                    ]}
                  />
                )}
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={options.delayPurchase}
                    onChange={(event) => setDelayPurchase(event.target.checked)}
                    className="size-3.5 cursor-pointer accent-[#B8A8F8]"
                  />
                  Delay the {a.purchaseLabel} purchase by {a.purchaseDelayWeeks} weeks
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6" aria-live="polite">
            <CashflowChart
              points={result.points}
              comparison={isPlan ? undefined : plan.points}
              reserve={a.reserve}
            />
            <p className="sr-only">
              Lowest projected balance {formatMyr(result.lowest.balance)} in week{' '}
              {result.lowest.week}.
            </p>
          </div>

          <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-0.5 w-5 rounded bg-lavender" aria-hidden /> Selected scenario
            </li>
            {!isPlan && (
              <li className="flex items-center gap-2">
                <span className="h-0 w-5 border-t border-dashed border-muted-foreground" aria-hidden />{' '}
                Your plan
              </li>
            )}
            <li className="flex items-center gap-2">
              <span className="h-0 w-5 border-t border-dashed border-lavender" aria-hidden /> Safety
              reserve
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-coral" aria-hidden /> Below reserve
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
