import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const base =
  'group inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-lavender focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function PrimaryLink({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <a
      href={href}
      className={cn(
        base,
        'bg-foreground px-5 py-2.5 text-background hover:bg-white hover:shadow-[0_0_32px_-6px_rgba(184,168,248,0.55)]',
        className,
      )}
    >
      {children}
      <ArrowRight
        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden
      />
    </a>
  )
}

export function SecondaryLink({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <a
      href={href}
      className={cn(
        base,
        'border border-foreground/15 bg-foreground/[0.03] px-5 py-2.5 text-foreground hover:border-foreground/30 hover:bg-foreground/[0.07]',
        className,
      )}
    >
      {children}
    </a>
  )
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-xs font-medium tracking-[0.16em] text-lavender uppercase',
        className,
      )}
    >
      {children}
    </p>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string
  title: React.ReactNode
  description?: string
  className?: string
}) {
  return (
    <div className={cn('max-w-2xl', className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-serif text-4xl leading-[1.08] tracking-tight text-balance text-foreground sm:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          {description}
        </p>
      )}
    </div>
  )
}
