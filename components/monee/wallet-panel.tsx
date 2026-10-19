'use client'

import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFinance } from './finance-provider'
import { DateField } from './number-field'
import { Panel, PanelHeading, Stat } from './panel'
import { CATEGORIES, type CategoryId, type WalletEntry } from '@/lib/finance-state'
import { todayIso } from '@/lib/dates'
import { formatMoney, getCurrencyInfo, pairKey } from '@/lib/fx'
import { useFrankfurterCurrencies, useFrankfurterRates } from '@/lib/frankfurter-client'
import { minorToMajor, parseMinorUnits, validateWalletLedger, walletBalances } from '@/lib/wallet'

const emptyForm = (currency: string) => ({ description: '', date: todayIso(), category: 'other' as CategoryId, type: 'income' as WalletEntry['type'], currency, amount: '', toCurrency: currency === 'MYR' ? 'CNY' : 'MYR', received: '' })
type FormState = ReturnType<typeof emptyForm>

export function WalletPanel() {
  const { state, setWalletOpening, setWalletReportCurrency, addWalletEntry, updateWalletEntry, removeWalletEntry } = useFinance()
  const { currencies } = useFrankfurterCurrencies()
  const reportCurrency = state.wallet.reportCurrency
  const [accountCurrency, setAccountCurrency] = useState(state.route.receiveCurrency)
  const [opening, setOpening] = useState('')
  const [form, setForm] = useState<FormState>(() => emptyForm(state.route.receiveCurrency))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const balances = useMemo(() => walletBalances(state.wallet.openingMinor, state.wallet.entries), [state.wallet])
  const walletCurrencies = useMemo(() => [...new Set([...Object.keys(state.wallet.openingMinor), ...Object.keys(balances).filter((code) => balances[code] !== 0)])].sort(), [state.wallet.openingMinor, balances])
  const pairs = useMemo(() => walletCurrencies.filter((code) => code !== reportCurrency).map((base) => ({ base, quote: reportCurrency })), [walletCurrencies, reportCurrency])
  const { rates, loading, errors } = useFrankfurterRates(pairs)
  const wealth = walletCurrencies.reduce((sum, code) => {
    const amount = balances[code] ?? 0
    const rate = code === reportCurrency ? 1 : rates[pairKey(code, reportCurrency)]?.rate
    return rate === undefined ? sum : sum + minorToMajor(amount, code) * rate
  }, 0)
  const unresolved = walletCurrencies.filter((code) => code !== reportCurrency && !rates[pairKey(code, reportCurrency)])
  const chartData = walletCurrencies.map((code) => {
    const rate = code === reportCurrency ? 1 : rates[pairKey(code, reportCurrency)]?.rate
    return { code, balance: rate === undefined ? 0 : minorToMajor(balances[code] ?? 0, code) * rate }
  })
  const filteredEntries = state.wallet.entries.filter((entry) =>
    (typeFilter === 'all' || entry.type === typeFilter) &&
    `${entry.description} ${entry.currency} ${entry.toCurrency ?? ''} ${entry.category}`.toLowerCase().includes(search.toLowerCase()),
  ).sort((a, b) => b.date.localeCompare(a.date))
  const entryCount = state.wallet.entries.length

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
  }
  function startEdit(entry: WalletEntry) {
    setEditingId(entry.id)
    setForm({ description: entry.description, date: entry.date, category: entry.category, type: entry.type, currency: entry.currency, amount: String(minorToMajor(entry.amountMinor, entry.currency)), toCurrency: entry.toCurrency ?? (entry.currency === 'MYR' ? 'CNY' : 'MYR'), received: entry.toCurrency && entry.receivedMinor ? String(minorToMajor(entry.receivedMinor, entry.toCurrency)) : '' })
    setError('')
  }
  function cancelEdit() { setEditingId(null); setForm(emptyForm(state.route.receiveCurrency)); setError('') }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountMinor = parseMinorUnits(form.amount, form.currency)
    if (!form.description.trim() || !amountMinor || form.date > todayIso()) { setError('Enter a description, a positive amount, and a date that is today or earlier.'); return }
    const paired = form.type === 'transfer' || form.type === 'conversion'
    const receivedMinor = paired ? parseMinorUnits(form.received, form.toCurrency) : undefined
    if (paired && (form.currency === form.toCurrency || !receivedMinor)) { setError('Choose a different receiving currency and enter the amount received.'); return }
    const entry: Omit<WalletEntry, 'id'> = { description: form.description.trim(), date: form.date, category: form.category, type: form.type, currency: form.currency, amountMinor, ...(paired ? { toCurrency: form.toCurrency, receivedMinor: receivedMinor! } : {}) }
    const nextEntries = editingId ? state.wallet.entries.map((item) => item.id === editingId ? { ...entry, id: editingId } : item) : [...state.wallet.entries, { ...entry, id: 'new-entry' }]
    const validation = validateWalletLedger(state.wallet.openingMinor, nextEntries)
    if (!validation.ok) { setError(validation.message); return }
    const mutationError = editingId ? updateWalletEntry(editingId, entry) : addWalletEntry(entry)
    if (mutationError) { setError(mutationError); return }
    cancelEdit()
  }
  function saveOpening(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = opening.trim() === '' ? 0 : parseMinorUnitsAllowZero(opening, accountCurrency)
    if (parsed === null || !Number.isSafeInteger(parsed) || parsed < 0) { setError('Enter a valid non-negative starting balance.'); return }
    const mutationError = setWalletOpening(accountCurrency, parsed)
    if (mutationError) { setError(mutationError); return }
    setOpening('')
    setError('')
  }

  return <>
    <Panel aria-labelledby="wallet-title">
      <PanelHeading id="wallet-title" title="Simulated multi-currency wallet" description="Track balances you enter in this browser. This is a planning ledger only; Monee does not hold or move real money." />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Estimated wallet value" value={unresolved.length ? loading && Object.values(loading).some(Boolean) ? 'Loading rates…' : 'Rate unavailable' : formatMoney(wealth, reportCurrency)} note={unresolved.length ? errors[pairKey(unresolved[0], reportCurrency)] ?? `Waiting for ${unresolved.join(', ')} reference rates.` : `Converted to ${reportCurrency} using Frankfurter reference rates.`} />
        {walletCurrencies.length === 0 ? <div className="rounded-2xl border border-dashed border-foreground/15 p-4 text-sm text-muted-foreground sm:col-span-1">Add a starting balance to create your first wallet currency.</div> : walletCurrencies.map((code) => <Stat key={code} label={`${code} balance`} value={formatMoney(minorToMajor(balances[code] ?? 0, code), code)} note={`Opening balance and ${state.wallet.entries.length} ledger entries`} />)}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]">
        <div className="rounded-2xl border border-foreground/[0.08] bg-background/35 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><h3 className="font-serif text-xl text-foreground">Wallet balances</h3><label className="text-xs text-muted-foreground">Report in<select value={reportCurrency} onChange={(event) => setWalletReportCurrency(event.target.value)} className="ml-2 rounded-xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm text-foreground">{currencies.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></label></div>
          {chartData.length && unresolved.length === 0 ? <><p className="mt-3 text-xs text-muted-foreground">Currency exposure valued in {reportCurrency}</p><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ left: 4, right: 8 }}><CartesianGrid vertical={false} stroke="rgba(243,240,234,0.07)"/><XAxis dataKey="code" tick={{ fill: '#A3A6AB', fontSize: 11 }}/><YAxis tick={{ fill: '#A3A6AB', fontSize: 11 }} tickFormatter={(value) => Number(value).toLocaleString()}/><Tooltip formatter={(value) => formatMoney(Number(value ?? 0), reportCurrency)}/><Bar dataKey="balance" name={`Estimated value in ${reportCurrency}`} fill="#85D6B1" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></> : chartData.length ? <p role="status" className="mt-5 text-sm text-muted-foreground">{Object.values(loading).some(Boolean) ? 'Loading rates for currency exposure…' : `Currency exposure is waiting for ${unresolved.join(', ')} reference rates.`}</p> : <p className="mt-5 text-sm text-muted-foreground">Your balances will appear here once you add a starting balance.</p>}
        </div>
        <form onSubmit={saveOpening} className="rounded-2xl border border-foreground/[0.08] bg-background/35 p-4"><h3 className="font-serif text-xl text-foreground">Starting balance</h3><p className="mt-1 text-xs text-muted-foreground">Set or correct the balance before recorded entries.</p><label className="mt-4 block text-xs text-muted-foreground">Currency<select value={accountCurrency} onChange={(event) => setAccountCurrency(event.target.value)} className="mt-1 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground">{currencies.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></label><label className="mt-3 block text-xs text-muted-foreground">Starting amount<input inputMode="decimal" value={opening} onChange={(event) => { setOpening(event.target.value); setError('') }} placeholder="0.00" className="mt-1 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground" /></label><button className="mt-3 rounded-full border border-lavender/30 px-4 py-2 text-sm text-foreground hover:bg-lavender/10"><Plus className="mr-1 inline size-4"/>Save balance</button></form>
      </div>
    </Panel>

    <Panel>
      <PanelHeading title={editingId ? 'Correct wallet entry' : 'Record wallet activity'} description="Income and expenses affect one currency. Internal transfers and simulated conversions are saved as one two-sided ledger entry." />
      <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-muted-foreground">Description<input required value={form.description} onChange={(event) => setField('description', event.target.value)} maxLength={60} placeholder="Part-time pay or groceries" className="mt-1 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground" /></label>
        <label className="text-xs text-muted-foreground">Activity<select value={form.type} onChange={(event) => setField('type', event.target.value as WalletEntry['type'])} className="mt-1 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground"><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Move between my currencies</option><option value="conversion">Simulated conversion</option></select></label>
        <label className="text-xs text-muted-foreground">From currency<select value={form.currency} onChange={(event) => setField('currency', event.target.value)} className="mt-1 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground">{currencies.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></label>
        <label className="text-xs text-muted-foreground">Amount<input required inputMode="decimal" value={form.amount} onChange={(event) => setField('amount', event.target.value)} placeholder={`0.${'0'.repeat(getCurrencyInfo(form.currency).decimals)}`} className="mt-1 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground" /></label>
        {(form.type === 'transfer' || form.type === 'conversion') && <><label className="text-xs text-muted-foreground">To currency<select value={form.toCurrency} onChange={(event) => setField('toCurrency', event.target.value)} className="mt-1 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground">{currencies.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></label><label className="text-xs text-muted-foreground">Amount received<input required inputMode="decimal" value={form.received} onChange={(event) => setField('received', event.target.value)} placeholder={`0.${'0'.repeat(getCurrencyInfo(form.toCurrency).decimals)}`} className="mt-1 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground" /></label></>}
        <DateField label="Date" value={form.date} onChange={(date) => setField('date', date)} />
        <label className="text-xs text-muted-foreground">Category<select value={form.category} onChange={(event) => setField('category', event.target.value as CategoryId)} className="mt-1 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm text-foreground">{CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <div className="flex items-end gap-2"><button className="rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background">{editingId ? 'Save correction' : 'Record entry'}</button>{editingId && <button type="button" onClick={cancelEdit} aria-label="Cancel correction" className="rounded-full border border-foreground/10 p-2.5 text-muted-foreground"><X className="size-4"/></button>}</div>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-coral">{error}</p>}
      <p className="mt-3 text-xs text-muted-foreground">Amounts are parsed and stored as integer minor units. Transfers are one atomic ledger record to avoid double counting.</p>
    </Panel>

    <Panel>
      <div className="flex flex-wrap items-end justify-between gap-3"><PanelHeading title="Wallet transaction history" description={`${entryCount} simulated wallet entr${entryCount === 1 ? 'y' : 'ies'}. Editing or deleting an entry recalculates every balance.`}/><div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="wallet-search">Search wallet history</label><input id="wallet-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search history" className="rounded-xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm text-foreground"/><select aria-label="Filter wallet activity" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm text-foreground"><option value="all">All activity</option><option value="income">Income</option><option value="expense">Expenses</option><option value="transfer">Transfers</option><option value="conversion">Conversions</option></select></div></div>
      {filteredEntries.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="py-3">Date</th><th>Description</th><th>Type</th><th>Category</th><th className="text-right">Movement</th><th/></tr></thead><tbody>{filteredEntries.map((entry) => <tr key={entry.id} className="border-t border-foreground/[0.07]"><td className="py-3 pr-3 tabular-nums">{entry.date}</td><td>{entry.description}</td><td className="capitalize">{entry.type}</td><td>{CATEGORIES.find((item) => item.id === entry.category)?.label}</td><td className="text-right tabular-nums">{entry.type === 'income' ? '+' : '−'}{formatMoney(minorToMajor(entry.amountMinor, entry.currency), entry.currency)}{entry.toCurrency && entry.receivedMinor ? <><br/><span className="text-mint">+{formatMoney(minorToMajor(entry.receivedMinor, entry.toCurrency), entry.toCurrency)}</span></> : null}</td><td className="pl-3"><button type="button" onClick={() => startEdit(entry)} aria-label={`Correct ${entry.description}`} className="rounded-full p-2 text-muted-foreground hover:text-foreground"><Pencil className="size-4"/></button><button type="button" onClick={() => { const reason = removeWalletEntry(entry.id); if (reason) setError(reason); else if (editingId === entry.id) cancelEdit() }} aria-label={`Delete ${entry.description}`} className="rounded-full p-2 text-muted-foreground hover:text-coral"><Trash2 className="size-4"/></button></td></tr>)}</tbody></table></div> : <p className="mt-4 rounded-2xl border border-dashed border-foreground/15 p-6 text-sm text-muted-foreground">{entryCount ? 'No wallet entries match this search and filter.' : 'No wallet entries yet. Starting balances and activity you record will appear here.'}</p>}
    </Panel>
  </>
}

function parseMinorUnitsAllowZero(input: string, currency: string) {
  if (input.trim() === '0' || /^0(?:\.0+)?$/.test(input.trim())) return 0
  return parseMinorUnits(input, currency)
}
