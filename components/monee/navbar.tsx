'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeftRight, FlaskConical, Home, Menu, UserRound, Wallet, X, type LucideIcon } from 'lucide-react'
import { Wordmark } from './wordmark'
import { PrimaryLink } from './cta'
import { cn } from '@/lib/utils'
import { useDemoSession } from './demo-session'

const links = [
  { href: '/', label: 'Home' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/exchange', label: 'Currency Centre' },
  { href: '/future-lab', label: 'Future Lab' },
  { href: '/spending-analysis', label: 'Money Hub' },
  { href: '/financial-health', label: 'Financial Health' },
]

const mobileLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/exchange', label: 'Currency', icon: ArrowLeftRight },
  { href: '/future-lab', label: 'Future Lab', icon: FlaskConical },
  { href: '/spending-analysis', label: 'Money Hub', icon: Wallet },
  { href: '/profile', label: 'Profile', icon: UserRound },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [activeAnchor, setActiveAnchor] = useState('')
  const router = useRouter()
  const { active: demoActive, endDemo } = useDemoSession()
  const pathname = usePathname()
  const onHome = pathname === '/'

  useEffect(() => {
    const syncAnchor = () => setActiveAnchor(window.location.hash)
    if (onHome) syncAnchor()
    window.addEventListener('hashchange', syncAnchor)
    return () => window.removeEventListener('hashchange', syncAnchor)
  }, [onHome, pathname])

  const isActiveLink = (href: string) => {
    if (href === '/#how-it-works') return onHome && activeAnchor === '#how-it-works'
    return pathname === href
  }

  const handleSignOut = () => {
    endDemo()
    setOpen(false)
    router.push('/')
  }
  const onPageLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    setOpen(false)
    if (event.currentTarget.hash) return
    const destination = new URL(event.currentTarget.href)
    if (onHome && destination.pathname === '/') {
      event.preventDefault()
      window.history.pushState(null, '', '/')
      setActiveAnchor('')
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      return
    }
    if (destination.pathname === pathname) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }
  const onHowItWorksClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    setOpen(false)
    event.preventDefault()
    if (onHome) {
      window.history.pushState(null, '', '/#how-it-works')
      setActiveAnchor('#how-it-works')
      const target = document.getElementById('how-it-works')
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      sessionStorage.setItem('monee:navigate-anchor', 'how-it-works')
      router.push('/#how-it-works', { scroll: false })
    }
  }

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-foreground/[0.06] bg-background/70 backdrop-blur-xl">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"
      >
        <Link
          href="/"
          aria-label="Monee home"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-lavender"
        >
          <Wordmark />
        </Link>

        <ul className="hidden items-center gap-4 lg:flex xl:gap-5">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                scroll
                onClick={link.href === '/#how-it-works' ? onHowItWorksClick : onPageLinkClick}
                aria-current={isActiveLink(link.href) ? 'page' : undefined}
                className={cn(
                  'rounded-sm text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-lavender',
                  isActiveLink(link.href)
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          {demoActive ? (
              <div className="hidden items-center gap-3 xl:flex">
              <span className="rounded-full border border-mint/20 bg-mint/[0.08] px-2.5 py-1 text-xs text-mint">Demo mode</span>
              <button type="button" onClick={handleSignOut} className="text-sm text-muted-foreground transition-colors hover:text-foreground">Sign out</button>
            </div>
          ) : <Link href="/sign-in" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground xl:inline">Sign in</Link>}
          {onHome && (
            <PrimaryLink href="#overview" className="hidden !py-2 xl:inline-flex">
              Explore your future
            </PrimaryLink>
          )}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex size-10 items-center justify-center rounded-full border border-foreground/10 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-lavender lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-foreground/[0.06] px-5 pt-3 pb-6 lg:hidden">
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  scroll
                  onClick={link.href === '/#how-it-works' ? onHowItWorksClick : onPageLinkClick}
                  aria-current={isActiveLink(link.href) ? 'page' : undefined}
                  className={cn(
                    'block py-3 text-base',
                    isActiveLink(link.href) ? 'text-foreground' : 'text-foreground/70',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              {demoActive ? (
                <button type="button" onClick={handleSignOut} className="block py-3 text-base text-foreground/70 hover:text-foreground">Sign out of demo</button>
              ) : (
                <Link href="/sign-in" scroll onClick={onPageLinkClick} className="block py-3 text-base text-foreground/70 hover:text-foreground">Sign in</Link>
              )}
            </li>
          </ul>
          {onHome && (
            <PrimaryLink href="#overview" className="mt-3 w-full">
              Explore your future
            </PrimaryLink>
          )}
        </div>
      )}
    </header>
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-50 border-t border-foreground/[0.09] bg-background/95 px-1 pt-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_32px_rgba(0,0,0,0.24)] backdrop-blur-xl md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {mobileLinks.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? onHome : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={href}>
              <Link href={href} scroll onClick={onPageLinkClick} aria-current={active ? 'page' : undefined} className={cn('flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lavender', active ? 'text-mint' : 'text-muted-foreground hover:text-foreground')}>
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
    </>
  )
}
