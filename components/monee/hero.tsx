import { PrimaryLink, SecondaryLink } from './cta'
import { HeroFlowField } from './hero-flow-field'

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-4 px-5 pt-12 pb-4 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-2 lg:pt-20">
        <div className="relative z-10 max-w-3xl animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.03] px-3.5 py-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-mint" aria-hidden />
            Plan with more confidence.
          </p>
          <h1 className="mt-6 font-serif text-[2.9rem] leading-[1.02] tracking-tight text-balance text-foreground sm:text-6xl lg:text-7xl">
            See your money in a <span className="italic text-lavender">different light.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            Explore possible financial futures before life makes the decision for you.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <PrimaryLink href="/future-lab">Explore Future Lab</PrimaryLink>
            <SecondaryLink href="#overview">Explore Monee</SecondaryLink>
          </div>
        </div>
        <div className="animate-rise [animation-delay:100ms] lg:-mr-12">
          <HeroFlowField />
        </div>
      </div>
    </section>
  )
}
