import type { Metadata } from 'next'
import { ExchangeWorkspace } from '@/components/monee/exchange-workspace'
import { NextStep, PageShell } from '@/components/monee/page-shell'

export const metadata: Metadata = {
  title: 'Cross-Border Exchange — Monee',
  description:
    'Convert between any supported sending and receiving country. Simulate exchange-rate moves and see how fees change what arrives.',
}

export default function ExchangePage() {
  return (
    <PageShell
      eyebrow="Cross-border exchange"
      title="Send from anywhere. Receive anywhere."
      description="Convert currencies and compare transfer fees using a clearly labelled reference rate."
    >
      <ExchangeWorkspace />
      <NextStep
        href="/future-lab"
        label="Open Future Lab"
        description="Use this corridor to test a late transfer, a rate move, or an unexpected expense."
      />
    </PageShell>
  )
}
