'use client'

import { useId, useState } from 'react'
import { isValidIso } from '@/lib/dates'
import { cn } from '@/lib/utils'

const shell =
  'flex items-center rounded-2xl border bg-background/60 px-3.5 transition-colors focus-within:border-lavender/60 focus-within:ring-2 focus-within:ring-lavender/30'

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  min = 0,
  max = 1_000_000_000,
  decimals = 2,
  format,
  size = 'md',
  hideLabel = false,
  className,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  prefix?: string
  suffix?: string
  hint?: string
  min?: number
  max?: number
  decimals?: number
  /** Overrides how the committed value is displayed while the field is not being edited. */
  format?: (value: number) => string
  size?: 'sm' | 'md'
  hideLabel?: boolean
  className?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const parsedDraft = draft === null ? null : Number(draft.replace(/,/g, ''))
  const invalid =
    draft !== null &&
    (draft.trim() === '' || !Number.isFinite(parsedDraft) || parsedDraft! < min || parsedDraft! > max)

  const display =
    draft ??
    (format
      ? format(value)
      : value.toLocaleString('en-US', { maximumFractionDigits: decimals }))

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn('block text-sm text-muted-foreground', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <div
        className={cn(
          shell,
          !hideLabel && 'mt-2',
          invalid ? 'border-coral/60' : 'border-foreground/10',
        )}
      >
        {prefix && (
          <span className="text-sm whitespace-pre text-muted-foreground" aria-hidden>
            {prefix}
          </span>
        )}
        <input
          id={id}
          inputMode="decimal"
          aria-invalid={invalid}
          aria-describedby={hint ? `${id}-hint` : undefined}
          value={display}
          onChange={(event) => {
            const cleaned = event.target.value.replace(/[^\d.,-]/g, '')
            setDraft(cleaned)
            const parsed = Number(cleaned.replace(/,/g, ''))
            if (cleaned.trim() !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max) {
              onChange(parsed)
            }
          }}
          onBlur={() => setDraft(null)}
          className={cn(
            'w-full min-w-0 bg-transparent px-1.5 text-foreground tabular-nums outline-none',
            size === 'sm' ? 'py-2 text-sm' : 'py-3 text-base',
          )}
        />
        {suffix && (
          <span className="text-sm whitespace-nowrap text-muted-foreground" aria-hidden>
            {suffix}
          </span>
        )}
      </div>
      {invalid && (
        <p className="mt-1.5 text-xs text-coral">
          Enter a number from {min.toLocaleString('en-US')} to {max.toLocaleString('en-US')}.
        </p>
      )}
      {hint && !invalid && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

export function DateField({
  label,
  value,
  onChange,
  hint,
  size = 'md',
  hideLabel = false,
  className,
}: {
  label: string
  value: string
  onChange: (iso: string) => void
  hint?: string
  size?: 'sm' | 'md'
  hideLabel?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn('block text-sm text-muted-foreground', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <div className={cn(shell, !hideLabel && 'mt-2', 'border-foreground/10')}>
        <input
          id={id}
          type="date"
          value={value}
          onChange={(event) => {
            if (isValidIso(event.target.value)) onChange(event.target.value)
          }}
          className={cn(
            'w-full min-w-0 bg-transparent px-1.5 text-foreground tabular-nums outline-none [color-scheme:dark]',
            size === 'sm' ? 'py-2 text-sm' : 'py-3 text-base',
          )}
        />
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  size = 'md',
  hideLabel = false,
  className,
  maxLength = 40,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'md'
  hideLabel?: boolean
  className?: string
  maxLength?: number
}) {
  const id = useId()
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn('block text-sm text-muted-foreground', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <div className={cn(shell, !hideLabel && 'mt-2', 'border-foreground/10')}>
        <input
          id={id}
          value={value}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'w-full min-w-0 bg-transparent px-1.5 text-foreground outline-none',
            size === 'sm' ? 'py-2 text-sm' : 'py-3 text-base',
          )}
        />
      </div>
    </div>
  )
}
