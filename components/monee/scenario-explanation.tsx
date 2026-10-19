'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Panel, PanelHeading } from './panel'

interface Props {
  facts: {
    currency: string
    lowestBalance: number
    endingBalance: number
    reserve: number
    firstShortfallDate: string | null
    transferDate: string
    rateMovePct: number
  }
}

export function ScenarioExplanation({ facts }: Props) {
  const [text, setText] = useState('')
  const [source, setSource] = useState<'gemini' | 'fallback' | ''>('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  async function explain() {
    setLoading(true)
    setReason('')
    try {
      const response = await fetch('/api/financial-explanation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(facts) })
      const result = await response.json()
      if (!response.ok || typeof result.text !== 'string') throw new Error('Scenario explanation is unavailable right now.')
      setText(result.text)
      setSource(result.source === 'gemini' ? 'gemini' : 'fallback')
      setReason(typeof result.reason === 'string' ? result.reason : '')
    } catch (error) {
      setText(facts.firstShortfallDate
        ? `Your current assumptions show the balance below the ${facts.currency} ${facts.reserve.toFixed(2)} reserve on ${facts.firstShortfallDate}. The lowest point is ${facts.currency} ${facts.lowestBalance.toFixed(2)}. Review spending and the transfer timing.`
        : `Your current assumptions show a minimum balance of ${facts.currency} ${facts.lowestBalance.toFixed(2)} and an ending balance of ${facts.currency} ${facts.endingBalance.toFixed(2)} against a ${facts.currency} ${facts.reserve.toFixed(2)} reserve. These are scenario calculations, not predictions.`)
      setSource('fallback')
      setReason(error instanceof Error ? error.message : 'Using Monee’s calculation-based explanation.')
    } finally { setLoading(false) }
  }
  return <Panel>
    <PanelHeading title="Explain this scenario" description="Monee sends only calculated totals and dates for an explanation. It does not send your wallet history, name, email, or authentication data. Google's free tier may use submitted content to improve its products." />
    <button type="button" disabled={loading} onClick={explain} className="mt-4 inline-flex items-center gap-2 rounded-full border border-lavender/30 px-4 py-2.5 text-sm text-foreground hover:bg-lavender/10 disabled:opacity-60"><Sparkles className="size-4"/>{loading ? 'Preparing explanation…' : text ? 'Refresh explanation' : 'Explain my forecast'}</button>
    {text && <div className="mt-4 rounded-2xl border border-foreground/[0.08] bg-background/40 p-4"><p className="text-sm leading-relaxed text-foreground">{text}</p><p className="mt-3 text-xs text-muted-foreground">{source === 'gemini' ? 'Gemini explanation · ' : 'Monee deterministic fallback · '}{reason ? `${reason} · ` : ''}Informational only, not financial advice.</p></div>}
  </Panel>
}
