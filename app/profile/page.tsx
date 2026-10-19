import type { Metadata } from 'next'
import { PageShell } from '@/components/monee/page-shell'
import { ProfileWorkspace } from '@/components/monee/profile-workspace'

export const metadata: Metadata = { title: 'Profile — Monee' }

export default function ProfilePage() {
  return (
    <PageShell eyebrow="Profile" title="Your Monee session." description="View the current prototype session and sign out when you’re done.">
      <ProfileWorkspace />
    </PageShell>
  )
}
