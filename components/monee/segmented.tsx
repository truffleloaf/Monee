'use client'

import { cn } from '@/lib/utils'

export function Segmented<T extends string | number>({
  label,
  value,
  onChange,
  options,
  size = 'md',
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: React.ReactNode }[]
  size?: 'sm' | 'md'
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap rounded-full border border-foreground/10 bg-background/60 p-1"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full font-medium whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-lavender',
              size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs',
              selected
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
