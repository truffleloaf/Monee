'use client'

import { useMemo } from 'react'
import { ArrowDownRight, ArrowUpRight, ArrowRight } from 'lucide-react'
import { SectionHeading } from './cta'
import { CashflowChart } from './cashflow-chart'
import { useScenario } from './scenario-provider'
import { Segmented } from './segmented'
import { formatSource } from '@/lib/currencies'
import {
  formatDelta,
  formatMyr,
  simulate,
  type RateDirection,
  type ScenarioId,
} from '@/lib/simulation'
import { scrollToSection } from '@/lib/scroll'
import { cn } from '@/lib/utils'

function LabCard({
  id,
  title,
  bullets,
  active,
  accent,
  chart,
  result,
  extra,
  onCompare,
}: {
  id: ScenarioId
  title: string
  bullets: string[]
  active: boolean
  accent: string
  chart: React.ReactNode
  result: React.ReactNode
  extra?: React.ReactNode
  onCompare: (id: ScenarioId) => void
}) {
  return (
    <article
      className={cn(
        'flex flex-col rounded-3xl border bg-card/60 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:bg-card',
        active
          ? 'border-lavender/50 shadow-[0_0_0_1px_rgba(184,168,248,0.25),0_20px_50px_-24px_rgba(184,168,248,0.35)]'
          : 'border-foreground/[0.08] hover:border-foreground/[0.16]',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif text-2xl text-foreground">{title}</h3>
        {active && (
          <span className="rounded-full bg-lavender/15 px-2.5 py-1 text-[11px] font-medium text-lavender">
            In your chart
          </span>
        )}
      </div>
      <ul className="mt-3 space-y-1 text-sm leading-relaxed text-muted-foreground">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      {extra && <div className="mt-4">{extra}</div>}

      <div className="mt-5 -mx-1 h-[120px]" aria-hidden style={{ color: accent }}>
        {chart}
      </div>

      <div className="mt-4 border-t border-foreground/[0.08] pt-4">{result}</div>

      <button
        type="button"
        onClick={() => onCompare(id)}
        className="group mt-5 inline-flex items-center justify-between rounded-full border border-foreground/15 bg-foreground/[0.03] px-4 py-2.5 text-sm font-medium text-foreground transition-colors outline-none hover:border-lavender/50 hover:bg-lavender/10 focus-visible:ring-2 focus-visible:ring-lavender"
      >
        Compare future
        <ArrowRight
          className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>
    </article>
  )
}

export function FutureLab() {
  const { options, currency, setScenario, setRateDirection } = useScenario()
  const a = options.assumptions
  const delay = options.delayPurchase

  const plan = useMemo(() => simulate({ ...options, scenario: 'plan' }), [options])
  const late = useMemo(() => simulate({ ...options, scenario: 'late' }), [options])
  const rate = useMemo(() => simulate({ ...options, scenario: 'rate' }), [options])

  const compare = (id: ScenarioId) => {
    setScenario(id)
    scrollToSection('overview')
  }

  const rateDelta = rate.net - plan.net
  const lateGap = a.reserve - late.lowest.balance
  const RateIcon = options.rateDirection > 0 ? ArrowUpRight : ArrowDownRight
  const signSymbol = options.rateDirection > 0 ? '+' : '−'

  return (
    <section id="future-lab" className="relative px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Future Lab"
          title="What if life changes your plans?"
          description="Test a scenario before you live it. Change one thing, compare it against your plan, and see exactly where your cash flow bends."
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <LabCard
            id="plan"
            title="Your plan"
            active={options.scenario === 'plan'}
            accent="#B8A8F8"
            bullets={[
              'Expected income and expenses.',
              'Projected balance over eight weeks.',
              'Shows the baseline financial outlook.',
            ]}
            chart={
              <CashflowChart points={plan.points} reserve={a.reserve} compact height={120} />
            }
            result={
              <>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Lowest balance · week {plan.lowest.week}
                </p>
                <p className="mt-1 font-serif text-3xl tracking-tight text-foreground tabular-nums">
                  {formatMyr(plan.lowest.balance)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                  {plan.lowest.balance >= a.reserve
                    ? `${formatMyr(plan.lowest.balance - a.reserve)} above your reserve`
                    : `${formatMyr(a.reserve - plan.lowest.balance)} below your reserve`}{' '}
                  · ends at {formatMyr(plan.endBalance)}
                </p>
              </>
            }
            onCompare={compare}
          />

          <LabCard
            id="late"
            title="Late transfer"
            active={options.scenario === 'late'}
            accent={late.breaches.length ? '#E58A87' : '#B8A8F8'}
            bullets={[
              `Family support arrives ${a.lateDays} ${a.lateDays === 1 ? 'day' : 'days'} later than expected.`,
              'Shows the impact on available cash.',
              'Highlights when the safety reserve could be breached.',
            ]}
            chart={
              <CashflowChart
                points={late.points}
                comparison={plan.points}
                reserve={a.reserve}
                compact
                height={120}
              />
            }
            result={
              late.breaches.length > 0 ? (
                <>
                  <p className="text-xs tracking-wide text-coral uppercase">
                    Reserve breached · week {late.breaches[0]}
                  </p>
                  <p className="mt-1 font-serif text-3xl tracking-tight text-coral tabular-nums">
                    {formatMyr(late.lowest.balance)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                    {formatMyr(lateGap)} below your reserve
                    {delay ? '' : `, vs ${formatMyr(plan.lowest.balance)} in your plan`}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs tracking-wide text-mint uppercase">
                    Reserve holds · week {late.lowest.week}
                  </p>
                  <p className="mt-1 font-serif text-3xl tracking-tight text-foreground tabular-nums">
                    {formatMyr(late.lowest.balance)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                    {formatMyr(late.lowest.balance - a.reserve)} above your reserve even with a
                    late transfer
                  </p>
                </>
              )
            }
            onCompare={compare}
          />

          <LabCard
            id="rate"
            title={`${currency.code} changes`}
            active={options.scenario === 'rate'}
            accent="#B8A8F8"
            bullets={[
              `Simulate ${currency.code}/MYR moving up or down by ${a.rateMove}%.`,
              'Shows how much you receive in MYR.',
              'Compares the result with the original scenario.',
            ]}
            extra={
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
            }
            chart={
              <CashflowChart
                points={rate.points}
                comparison={plan.points}
                reserve={a.reserve}
                compact
                height={120}
              />
            }
            result={
              <>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  You receive per {formatSource(a.transferAmount, currency.code)}
                </p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-3 font-serif text-3xl tracking-tight text-foreground tabular-nums">
                  {formatMyr(rate.net, 2)}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-sans text-sm',
                      options.rateDirection > 0 ? 'text-mint' : 'text-coral',
                    )}
                  >
                    <RateIcon className="size-4" aria-hidden />
                    {currency.code} {signSymbol}
                    {a.rateMove}%
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                  {formatDelta(rateDelta, 2)} per transfer vs {formatMyr(plan.net, 2)} in your plan
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Colour shows the rate&apos;s direction. A stronger {currency.code} means more MYR
                  when you receive {currency.code}, but costs more if you pay in {currency.code}.
                </p>
              </>
            }
            onCompare={compare}
          />
        </div>
      </div>
    </section>
  )
}
