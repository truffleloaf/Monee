import { cn } from '@/lib/utils'

export function Panel({
  children,
  className,
  ...props
}: React.ComponentProps<'section'>) {
  return (
    <section
      {...props}
      className={cn('rounded-3xl border border-foreground/[0.08] bg-card/60 p-6 sm:p-8', className)}
    >
      {children}
    </section>
  )
}

export function PanelHeading({
  id,
  title,
  description,
  action,
}: {
  id?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-xl">
        <h2 id={id} className="font-serif text-2xl tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function Badge({
  children,
  tone = 'lavender',
}: {
  children: React.ReactNode
  tone?: 'lavender' | 'mint' | 'coral' | 'neutral'
}) {
  const tones = {
    lavender: 'border-lavender/25 bg-lavender/10 text-lavender',
    mint: 'border-mint/25 bg-mint/10 text-mint',
    coral: 'border-coral/25 bg-coral/10 text-coral',
    neutral: 'border-foreground/15 bg-foreground/[0.04] text-muted-foreground',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function Stat({
  label,
  value,
  note,
  tone = 'neutral',
}: {
  label: string
  value: string
  note?: string
  tone?: 'neutral' | 'mint' | 'coral'
}) {
  return (
    <div className="rounded-2xl border border-foreground/[0.08] bg-background/50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1.5 font-serif text-2xl tracking-tight tabular-nums sm:text-3xl',
          tone === 'mint' ? 'text-mint' : tone === 'coral' ? 'text-coral' : 'text-foreground',
        )}
      >
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}
