import Link from 'next/link'
import { ArrowLeftRight, ArrowRight, FlaskConical, Wallet } from 'lucide-react'

const features = [
  {
    href: '/spending-analysis',
    name: 'Money Hub',
    description: 'Review balances, transactions, budgets, and spending in one place.',
    icon: Wallet,
  },
  {
    href: '/exchange',
    name: 'Currency Centre',
    description: 'Convert supported currencies and explore dated reference-rate history.',
    icon: ArrowLeftRight,
  },
  {
    href: '/future-lab',
    name: 'Future Lab',
    description: 'Compare a baseline with late transfers and hypothetical rate changes.',
    icon: FlaskConical,
  },
]

export function HomeFeatures() {
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-20" aria-labelledby="home-features-title">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-medium tracking-[0.16em] text-lavender uppercase">Explore Monee</p>
        <h2 id="home-features-title" className="mt-3 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">Tools for the decisions ahead.</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {features.map(({ href, name, description, icon: Icon }) => (
            <Link key={href} href={href} className="group rounded-3xl border border-foreground/[0.08] bg-card/50 p-5 outline-none transition duration-200 hover:-translate-y-0.5 hover:border-lavender/40 hover:bg-card focus-visible:ring-2 focus-visible:ring-lavender sm:p-6">
              <Icon className="size-5 text-lavender" aria-hidden />
              <h3 className="mt-5 flex items-center justify-between gap-3 font-serif text-2xl text-foreground">
                {name}<ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HomeFinalCallToAction() {
  return (
    <section className="px-5 pb-20 sm:px-8 sm:pb-28" aria-labelledby="home-final-cta-title">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-3xl border border-lavender/20 bg-[radial-gradient(ellipse_at_top_right,rgba(184,168,248,0.12),transparent_55%)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-9">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-lavender uppercase">Your next step</p>
          <h2 id="home-final-cta-title" className="mt-2 font-serif text-3xl tracking-tight text-foreground">Make your next decision with a clearer picture.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Open your financial overview to review the illustrative demo and explore the assumptions behind it.</p>
        </div>
        <Link href="/financial-health" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-lavender focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Explore Financial Health<ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
