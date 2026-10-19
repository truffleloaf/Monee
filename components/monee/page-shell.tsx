'use client'

import { Children, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { Eyebrow } from './cta'
import { Footer } from './footer'
import { useFinance } from './finance-provider'
import { Navbar } from './navbar'
import { ScrollReveal } from './motion'

function ResetControl() {
  const { reset } = useFinance()
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const timer = window.setTimeout(() => setConfirming(false), 4000)
    return () => window.clearTimeout(timer)
  }, [confirming])

  if (confirming) {
    return (
      <div className="flex items-center gap-2" role="group" aria-label="Confirm reset">
        <button
          type="button"
          onClick={() => {
            reset()
            setConfirming(false)
          }}
          className="inline-flex items-center gap-2 rounded-full border border-coral/40 bg-coral/10 px-4 py-2 text-sm font-medium text-coral outline-none hover:bg-coral/15 focus-visible:ring-2 focus-visible:ring-coral"
        >
          Reset all pages to the demo
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-full px-3 py-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-lavender"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.03] px-4 py-2 text-sm text-foreground outline-none hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-lavender"
    >
      <RotateCcw className="size-4" aria-hidden />
      Reset demo
    </button>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your saved selections">
      {[320, 260, 360].map((height) => (
        <div
          key={height}
          style={{ height }}
          className="animate-pulse rounded-3xl border border-foreground/[0.06] bg-card/40"
        />
      ))}
    </div>
  )
}

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  const { ready } = useFinance()
  return (
    <>
      <Navbar />
      <main className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-end justify-between gap-6 pt-12 pb-10 sm:pt-16">
            <div className="max-w-3xl">
              <Eyebrow>{eyebrow}</Eyebrow>
              <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight text-balance text-foreground sm:text-6xl">
                {title}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
                {description}
              </p>
            </div>
            {ready && <ResetControl />}
          </header>
          {ready ? (
            <div className="space-y-6">
              {Children.map(children, (child, index) => (
                <ScrollReveal key={index} delayMs={Math.min(index * 45, 135)}>
                  {child}
                </ScrollReveal>
              ))}
            </div>
          ) : <PageSkeleton />}
        </div>
      </main>
      <Footer />
    </>
  )
}

export function NextStep({
  href,
  label,
  description,
}: {
  href: string
  label: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-foreground/[0.08] bg-card/40 p-6 outline-none transition-colors hover:border-lavender/40 focus-visible:ring-2 focus-visible:ring-lavender sm:p-8"
    >
      <div>
        <p className="text-xs tracking-[0.16em] text-lavender uppercase">Continue</p>
        <p className="mt-2 font-serif text-2xl text-foreground">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight
        className="size-6 text-foreground transition-transform group-hover:translate-x-1"
        aria-hidden
      />
    </Link>
  )
}
