import { ClipboardList, GitCompareArrows, SlidersHorizontal } from 'lucide-react'

const steps = [
  {
    icon: ClipboardList,
    title: 'Describe your situation',
    body: 'Your balance, monthly costs, family support and the purchases you are planning.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Change one thing',
    body: 'Move an exchange rate, delay a transfer, or push back a big purchase.',
  },
  {
    icon: GitCompareArrows,
    title: 'Compare futures',
    body: 'See each version of your next eight weeks side by side, with the reasoning explained.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-5 pb-16 sm:px-8 sm:pb-20">
      <div className="mx-auto max-w-7xl border-t border-foreground/[0.08] pt-12">
        <p className="text-xs font-medium tracking-[0.16em] text-lavender uppercase">
          How it works
        </p>
        <ol className="mt-6 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-card/60 text-muted-foreground">
                <step.icon className="size-[18px]" aria-hidden />
              </span>
              <div>
                <h3 className="font-serif text-xl text-foreground">
                  <span className="mr-2 text-sm text-muted-foreground tabular-nums">
                    0{index + 1}
                  </span>
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
