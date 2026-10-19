import Link from 'next/link'
import { Wordmark } from './wordmark'

const links = [
  { href: '/exchange', label: 'Exchange' },
  { href: '/future-lab', label: 'Future Lab' },
  { href: '/financial-health', label: 'Financial Health' },
]

export function Footer() {
  return (
    <footer className="border-t border-foreground/[0.08] px-5 py-12 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <Wordmark />
          <p className="mt-3 text-sm text-muted-foreground">
            See your money in a different light.
          </p>
        </div>
        <nav aria-label="Workspace" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-lavender"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          Monee is a prototype. Demo balances and transfer assumptions are illustrative. Currency
          Climate uses Frankfurter reference rates, which are updated periodically and are not
          real-time prices or executable quotes. Nothing here is financial advice.
        </p>
      </div>
    </footer>
  )
}
