import type { Metadata } from 'next'
import { LabWorkspace } from '@/components/monee/lab-workspace'
import { NextStep, PageShell } from '@/components/monee/page-shell'

export const metadata: Metadata = {
  title: 'Future Lab — Monee',
  description:
    'Compare a baseline plan with a late family transfer, an exchange-rate change, or an unexpected expense.',
}

export default function FutureLabPage() {
  return (
    <PageShell
      eyebrow="Future Lab"
      title="Test a future before you live it."
      description="Change an assumption and compare how it affects your projected balance."
    >
      <LabWorkspace />
      <NextStep
        href="/financial-health"
        label="Open Financial Health"
        description="See runway, spending, and converted support in one overview."
      />
    </PageShell>
  )
}
