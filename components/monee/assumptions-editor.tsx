'use client'

import { useId, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useScenario } from './scenario-provider'
import { Segmented } from './segmented'
import { getCurrency } from '@/lib/currencies'
import { DEMO, type RateDirection, type ScenarioId } from '@/lib/simulation'
import { cn } from '@/lib/utils'

function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  hint,
}: {
  label: string
  value: number
  onCommit: (value: number) => void
  min: number
  max: number
  step?: number
  prefix?: string
  suffix?: string
  hint?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? String(value)
  const parsed = Number(text)
  const valid = text.trim() !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max

  return (
    <div>
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        {label}
      </label>
      <div
        className={cn(
          'mt-1.5 flex items-center rounded-xl border bg-background/60 px-3 transition-colors focus-within:border-lavender/60',
          valid ? 'border-foreground/10' : 'border-coral/60',
        )}
      >
        {prefix && (
          <span className="text-sm whitespace-pre text-muted-foreground" aria-hidden>
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={text}
          aria-invalid={!valid}
          onChange={(event) => {
            setDraft(event.target.value)
            const next = Number(event.target.value)
            if (event.target.value.trim() !== '' && Number.isFinite(next) && next >= min && next <= max) {
              onCommit(next)
            }
          }}
          onBlur={() => {
            if (!valid) {
              const fallback = Number.isFinite(parsed) && text.trim() !== '' ? parsed : value
              onCommit(Math.min(max, Math.max(min, fallback)))
            }
            setDraft(null)
          }}
          className="w-full bg-transparent px-1.5 py-2 text-sm text-foreground tabular-nums outline-none"
        />
        {suffix && (
          <span className="text-xs whitespace-nowrap text-muted-foreground" aria-hidden>
            {suffix}
          </span>
        )}
      </div>
      {!valid ? (
        <p className="mt-1 text-[11px] text-coral">
          Enter a value from {min.toLocaleString('en-US')} to {max.toLocaleString('en-US')}.
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function AssumptionsEditor({
  note,
  onNoteChange,
  focus,
}: {
  note: string
  onNoteChange: (note: string) => void
  focus: ScenarioId
}) {
  const { options, setScenario, setRateDirection, updateAssumptions, resetAssumptions } =
    useScenario()
  const a = options.assumptions
  const currency = getCurrency(a.currency)
  const labelId = useId()
  const noteId = useId()
  const itemId = useId()

  return (
    <div className="mt-6 rounded-2xl border border-foreground/10 bg-background/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p id={labelId} className="text-sm font-medium text-foreground">
            What should Monee consider?
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Change anything below and the explanation, chart and cards update instantly.
          </p>
        </div>
        <button
          type="button"
          onClick={resetAssumptions}
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-3 py-1.5 text-xs text-muted-foreground transition-colors outline-none hover:border-lavender/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-lavender"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset to defaults
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Segmented<ScenarioId>
          label="Scenario to explain"
          size="sm"
          value={focus}
          onChange={setScenario}
          options={[
            { value: 'late', label: 'Late transfer' },
            { value: 'rate', label: `${currency.code} moves` },
          ]}
        />
        {focus === 'rate' && (
          <Segmented<RateDirection>
            label="Direction of the move"
            size="sm"
            value={options.rateDirection}
            onChange={setRateDirection}
            options={[
              { value: -1, label: 'Weakens' },
              { value: 1, label: 'Strengthens' },
            ]}
          />
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField
          label={`Family transfer (${currency.code})`}
          value={a.transferAmount}
          onCommit={(transferAmount) => updateAssumptions({ transferAmount })}
          min={1}
          max={1_000_000_000}
          prefix={currency.symbol}
          hint="Arrives in weeks 2 and 6"
        />
        {focus === 'late' ? (
          <NumberField
            label="First transfer arrives late by"
            value={a.lateDays}
            onCommit={(lateDays) => updateAssumptions({ lateDays })}
            min={1}
            max={28}
            suffix="days"
            hint="Modelled in whole weeks, rounded up"
          />
        ) : (
          <NumberField
            label={`${currency.code} moves by`}
            value={a.rateMove}
            onCommit={(rateMove) => updateAssumptions({ rateMove })}
            min={0.5}
            max={25}
            step={0.5}
            suffix="%"
            hint="Against the ringgit"
          />
        )}
        <NumberField
          label="Safety reserve"
          value={a.reserve}
          onCommit={(reserve) => updateAssumptions({ reserve })}
          min={0}
          max={DEMO.startBalance}
          step={100}
          prefix="RM "
          hint="The balance you never want to dip below"
        />
        <div>
          <label htmlFor={itemId} className="block text-xs text-muted-foreground">
            Planned purchase
          </label>
          <input
            id={itemId}
            type="text"
            value={a.purchaseLabel}
            maxLength={24}
            onChange={(event) => updateAssumptions({ purchaseLabel: event.target.value })}
            onBlur={(event) => {
              if (!event.target.value.trim()) updateAssumptions({ purchaseLabel: 'purchase' })
            }}
            className="mt-1.5 w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm text-foreground transition-colors outline-none focus:border-lavender/60"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Give it a name you recognise</p>
        </div>
        <NumberField
          label="Purchase amount"
          value={a.purchaseAmount}
          onCommit={(purchaseAmount) => updateAssumptions({ purchaseAmount })}
          min={0}
          max={100_000}
          step={100}
          prefix="RM "
        />
        <NumberField
          label="Purchase lands in week"
          value={a.purchaseWeek}
          onCommit={(purchaseWeek) => updateAssumptions({ purchaseWeek })}
          min={1}
          max={DEMO.horizon}
          suffix={`of ${DEMO.horizon}`}
        />
        <NumberField
          label="If delayed, move it by"
          value={a.purchaseDelayWeeks}
          onCommit={(purchaseDelayWeeks) => updateAssumptions({ purchaseDelayWeeks })}
          min={1}
          max={6}
          suffix="weeks"
        />
      </div>

      <div className="mt-5">
        <label htmlFor={noteId} className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Your own note (optional)</span>
          <span className="tabular-nums">{note.length}/200</span>
        </label>
        <textarea
          id={noteId}
          value={note}
          maxLength={200}
          rows={2}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="For example: ask Mum to send on the 1st, not the 3rd."
          className="mt-1.5 w-full resize-none rounded-xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-lavender/60"
        />
      </div>
    </div>
  )
}
