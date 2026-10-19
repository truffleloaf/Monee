import type { Metadata } from 'next'
import { NextStep, PageShell } from '@/components/monee/page-shell'
import { SpendingWorkspace } from '@/components/monee/spending-workspace'
import { WalletPanel } from '@/components/monee/wallet-panel'

export const metadata: Metadata = {
  title: 'Money Hub — Monee',
  description: 'Manage your simulated multi-currency wallet, transaction history, spending, and budgets.',
}

export default function SpendingAnalysisPage() {
  return (
    <PageShell eyebrow="Money Hub" title="Your money, in one place." description="Track a simulated multi-currency wallet, real entries you add, spending, and budgets. No real funds are held or moved.">
      <WalletPanel />
      <SpendingWorkspace />
      <NextStep href="/financial-health" label="Check your financial health" description="Review your runway, safety buffer, and upcoming payment readiness." />
      <NextStep href="/future-lab" label="Take an insight to Future Lab" description="Use your actual spending as a starting point for a clearly marked future assumption." />
    </PageShell>
  )
}
