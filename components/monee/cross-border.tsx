'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Info } from 'lucide-react'
import { SectionHeading } from './cta'
import { CurrencySelect } from './currency-select'
import { useScenario } from './scenario-provider'
import { formatChange, formatRate, formatSource, HOME } from '@/lib/currencies'
import { convert, formatMyr } from '@/lib/simulation'
import { cn } from '@/lib/utils'

export function CrossBorder() {
  const amountId = useId()
  const baseRateId = useId()
  const shiftId = useId()
  const { options, currency, setCurrency, updateAssumptions } = useScenario()
  const { transferAmount: amount, baseRate } = options.assumptions

  const [amountDraft, setAmountDraft] = useState<string | null>(null)
  const [rateDraft, setRateDraft] = useState<string | null>(null)
  const [shift, setShift] = useState(0)

  const rate = baseRate * (1 + shift / 100)
  const { gross, fee, net } = convert(amount, rate)
  const baseNet = convert(amount, baseRate).net
  const diff = net - baseNet
  const rateIsDefault = baseRate === currency.baseRate
  const rateInvalid = rateDraft !== null && !(Number(rateDraft) > 0)

  const rows = [
    {
      label: 'Exchange-rate assumption',
      value: `1 ${currency.code} = RM ${formatRate(rate)}`,
      note:
        shift === 0
          ? rateIsDefault
            ? 'Illustrative base rate'
            : 'Your own base rate'
          : `Base ${formatRate(baseRate)} ${shift > 0 ? '+' : '−'} ${Math.abs(shift)}%`,
    },
    {
      label: 'Estimated fee',
      value: formatMyr(fee, 2),
      note: '0.5% assumed transfer fee',
    },
    {
      label: 'Simulated recent move',
      value: formatChange(currency.change),
      note: `${currency.code}/MYR · illustrative, not live`,
    },
    {
      label: 'Rate source',
      value: 'Simulated',
      note: 'No live data connected, no timestamp',
    },
  ]

  return (
    <section id="cross-border" className="relative px-5 pb-20 sm:px-8 sm:pb-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Cross-border"
          title="Understand money across currencies."
          description="Pick the country your support comes from and see what a transfer is worth in ringgit, with every assumption laid out so you can inspect and change it."
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-foreground/[0.08] bg-card/60 p-6 sm:p-8">
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <CurrencySelect
                  label="Sending from"
                  value={currency.code}
                  onChange={setCurrency}
                />
              </div>
              <ArrowRight className="mb-4 size-4 shrink-0 text-lavender" aria-hidden />
              <div className="mb-0 shrink-0">
                <span className="block text-sm text-muted-foreground">Receiving in</span>
                <span className="mt-2 flex items-center gap-2 rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2.5">
                  <span className="grid h-6 min-w-11 place-items-center rounded-md bg-foreground/10 px-1.5 text-[11px] font-semibold tracking-wide text-foreground">
                    {HOME.code}
                  </span>
                  <span className="hidden text-sm font-medium text-foreground sm:block">
                    {HOME.country}
                  </span>
                </span>
              </div>
            </div>

            <label htmlFor={amountId} className="mt-8 block text-sm text-muted-foreground">
              Amount sent
            </label>
            <div className="mt-2 flex items-center rounded-2xl border border-foreground/10 bg-background/60 px-4 transition-colors focus-within:border-lavender/60">
              <span className="font-serif text-2xl whitespace-pre text-muted-foreground" aria-hidden>
                {currency.symbol}
              </span>
              <input
                id={amountId}
                inputMode="decimal"
                value={amountDraft ?? amount.toLocaleString('en-US')}
                onChange={(event) => {
                  const cleaned = event.target.value.replace(/[^\d.,]/g, '')
                  setAmountDraft(cleaned)
                  const parsed = Number(cleaned.replace(/,/g, ''))
                  updateAssumptions({
                    transferAmount:
                      Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 1_000_000_000) : 0,
                  })
                }}
                onBlur={() => setAmountDraft(null)}
                className="w-full min-w-0 bg-transparent px-2 py-3.5 font-serif text-3xl tracking-tight text-foreground tabular-nums outline-none"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Also used as each family transfer in the simulation above.
            </p>

            <div className="mt-6 flex items-baseline justify-between">
              <label htmlFor={baseRateId} className="text-sm text-muted-foreground">
                Base rate assumption
              </label>
              {!rateIsDefault && (
                <button
                  type="button"
                  onClick={() => {
                    setRateDraft(null)
                    updateAssumptions({ baseRate: currency.baseRate })
                  }}
                  className="rounded text-xs text-lavender outline-none hover:underline focus-visible:ring-2 focus-visible:ring-lavender"
                >
                  Reset to {formatRate(currency.baseRate)}
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
                1 {currency.code} = RM
              </span>
              <input
                id={baseRateId}
                inputMode="decimal"
                aria-invalid={rateInvalid}
                value={rateDraft ?? String(baseRate)}
                onChange={(event) => {
                  const cleaned = event.target.value.replace(/[^\d.]/g, '')
                  setRateDraft(cleaned)
                  const parsed = Number(cleaned)
                  if (Number.isFinite(parsed) && parsed > 0) updateAssumptions({ baseRate: parsed })
                }}
                onBlur={() => setRateDraft(null)}
                className="w-full min-w-0 bg-transparent px-2 py-3 text-base text-foreground tabular-nums outline-none"
              />
            </div>
            {rateInvalid && (
              <p className="mt-1.5 text-xs text-coral">Enter a rate greater than zero.</p>
            )}

            <div className="mt-8 flex items-baseline justify-between">
              <label htmlFor={shiftId} className="text-sm text-muted-foreground">
                Simulated rate change
              </label>
              <span
                className={cn(
                  'text-sm font-medium tabular-nums',
                  shift > 0 ? 'text-mint' : shift < 0 ? 'text-coral' : 'text-foreground',
                )}
              >
                {shift > 0 ? '+' : shift < 0 ? '−' : ''}
                {Math.abs(shift).toFixed(1)}%
              </span>
            </div>
            <input
              id={shiftId}
              type="range"
              min={-5}
              max={5}
              step={0.5}
              value={shift}
              onChange={(event) => setShift(Number(event.target.value))}
              className="mt-3 w-full cursor-pointer accent-[#B8A8F8]"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>−5%</span>
              <span>0</span>
              <span>+5%</span>
            </div>
          </div>

          <div className="rounded-3xl border border-foreground/[0.08] bg-card/60 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Estimated converted amount</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lavender/25 bg-lavender/10 px-2.5 py-1 text-[11px] font-medium text-lavender">
                <Info className="size-3" aria-hidden />
                Simulated, not live
              </span>
            </div>
            <p
              className="mt-3 font-serif text-5xl tracking-tight text-foreground tabular-nums sm:text-6xl"
              aria-live="polite"
            >
              {formatMyr(net, 2)}
            </p>
            <p
              className={cn(
                'mt-2 text-sm tabular-nums',
                diff > 0.005 ? 'text-mint' : diff < -0.005 ? 'text-coral' : 'text-muted-foreground',
              )}
            >
              {Math.abs(diff) < 0.005
                ? 'Matches the base assumption'
                : `${diff > 0 ? '+' : '−'}${formatMyr(Math.abs(diff), 2)} vs the base rate`}
            </p>

            <dl className="mt-7 divide-y divide-foreground/[0.08] border-y border-foreground/[0.08]">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-3.5">
                  <div>
                    <dt className="text-sm text-foreground">{row.label}</dt>
                    <dd className="mt-0.5 text-xs text-muted-foreground">{row.note}</dd>
                  </div>
                  <p
                    className={cn(
                      'text-sm font-medium tabular-nums',
                      row.label === 'Simulated recent move'
                        ? currency.change >= 0
                          ? 'text-mint'
                          : 'text-coral'
                        : 'text-foreground',
                    )}
                  >
                    {row.value}
                  </p>
                </div>
              ))}
            </dl>

            <p className="mt-5 rounded-xl bg-background/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground tabular-nums">
              {formatSource(amount, currency.code)} × {formatRate(rate)} = {formatMyr(gross, 2)},
              minus a {formatMyr(fee, 2)} fee ={' '}
              <span className="text-foreground">{formatMyr(net, 2)}</span>
            </p>
            <Link
              href="/exchange"
              className="group mt-6 inline-flex items-center gap-2 text-sm text-lavender outline-none hover:underline focus-visible:ring-2 focus-visible:ring-lavender"
            >
              Open the full converter — any country, any supported currency
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
