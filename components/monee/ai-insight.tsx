'use client'

import { useId, useMemo, useState } from 'react'
import { ArrowRight, Pencil, Sparkles } from 'lucide-react'
import { AssumptionsEditor } from './assumptions-editor'
import { useScenario } from './scenario-provider'
import { buildInsight } from '@/lib/simulation'
import { scrollToSection } from '@/lib/scroll'

export function AiInsight() {
  const { options, setScenario, setDelayPurchase } = useScenario()
  const insight = useMemo(() => buildInsight(options), [options])
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState('')
  const editorId = useId()
  const a = options.assumptions

  return (
    <section className="px-5 pt-8 pb-20 sm:px-8 sm:pt-12 sm:pb-28" aria-labelledby="insight-title">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-lavender/20 bg-card/70 p-6 sm:p-9">
          <div
            aria-hidden
            className="absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(circle,rgba(184,168,248,0.18),transparent_70%)]"
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:gap-7">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-lavender/30 bg-lavender/10 text-lavender">
              <Sparkles className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 id="insight-title" className="font-serif text-2xl text-foreground sm:text-3xl">
                    {insight.title}
                  </h2>
                  <span className="rounded-full border border-foreground/10 px-2.5 py-1 text-[11px] text-muted-foreground">
                    Explains your simulation
                  </span>
                </div>
                <button
                  type="button"
                  aria-expanded={editing}
                  aria-controls={editorId}
                  onClick={() => setEditing((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.03] px-3.5 py-1.5 text-sm text-foreground transition-colors outline-none hover:border-lavender/50 hover:bg-lavender/10 focus-visible:ring-2 focus-visible:ring-lavender"
                >
                  <Pencil className="size-3.5" aria-hidden />
                  {editing ? 'Done editing' : 'Edit assumptions'}
                </button>
              </div>

              <div aria-live="polite">
                <p className="mt-4 text-base leading-relaxed text-pretty text-foreground/90 sm:text-lg">
                  {insight.body}
                </p>

                <ul className="mt-5 flex flex-wrap gap-2">
                  {insight.facts.map((fact) => (
                    <li
                      key={fact}
                      className="rounded-full bg-foreground/[0.05] px-3 py-1 text-xs text-muted-foreground tabular-nums"
                    >
                      {fact}
                    </li>
                  ))}
                </ul>

                {note.trim() && (
                  <blockquote className="mt-5 border-l-2 border-lavender/50 pl-4 text-sm leading-relaxed text-foreground/85">
                    <span className="block text-[11px] tracking-wide text-muted-foreground uppercase">
                      Your note
                    </span>
                    {note.trim()}
                  </blockquote>
                )}
              </div>

              <div id={editorId} hidden={!editing}>
                {editing && (
                  <AssumptionsEditor note={note} onNoteChange={setNote} focus={insight.target} />
                )}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setScenario(insight.target)
                    scrollToSection('overview')
                  }}
                  className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all duration-200 outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-lavender focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Explore this scenario
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </button>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={options.delayPurchase}
                    onChange={(event) => setDelayPurchase(event.target.checked)}
                    className="size-4 cursor-pointer accent-[#B8A8F8]"
                  />
                  Delay the {a.purchaseLabel} by {a.purchaseDelayWeeks} weeks
                </label>
              </div>

              <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                Every number above comes from the deterministic simulation on this page. Monee
                explains calculated results; it does not predict markets or give financial advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
