'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDemoSession } from './demo-session'
import { Panel, PanelHeading } from './panel'

export function ProfileWorkspace() {
  const { active, endDemo } = useDemoSession()
  const router = useRouter()

  return (
    <Panel>
      <PanelHeading title={active ? 'Demo profile' : 'Your profile'} description="Manage this browser’s prototype session." />
      <div className="mt-5 rounded-2xl border border-foreground/[0.08] bg-background/40 p-4 sm:p-6">
        <p className="text-sm font-medium text-foreground">{active ? 'Demo mode is active' : 'You are signed out'}</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Monee authentication is prototype-only. This session does not create an account or protect financial data, and the workspace is shared in this browser.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {active ? (
            <button type="button" onClick={() => { endDemo(); router.push('/') }} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foreground/15 px-4 text-sm text-foreground outline-none hover:border-lavender/40 focus-visible:ring-2 focus-visible:ring-lavender">Sign out</button>
          ) : (
            <>
              <Link href="/sign-in" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-mint px-4 text-sm font-medium text-background">Sign in to demo</Link>
              <Link href="/sign-up" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foreground/15 px-4 text-sm text-foreground">Create demo session</Link>
            </>
          )}
        </div>
      </div>
    </Panel>
  )
}
