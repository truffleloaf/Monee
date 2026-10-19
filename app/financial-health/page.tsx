import type { Metadata } from 'next'
import { HealthWorkspace } from '@/components/monee/health-workspace'
import { NextStep, PageShell } from '@/components/monee/page-shell'

export const metadata: Metadata = {
  title: 'Financial Health — Monee',
  description:
    'A personal overview for international students: converted support, spending, runway, and upcoming payments.',
}

export default function FinancialHealthPage() {
  return (
    <PageShell
      eyebrow="Financial health"
      title="A clear picture of your money."
      description="Edit your numbers to see your balance, spending, and upcoming costs."
    >
      <HealthWorkspace />
      <NextStep
        href="/exchange"
        label="Back to Exchange"
        description="Adjust the corridor, fees, or rate assumption and return here with the same selections."
      />
    </PageShell>
  )
}
