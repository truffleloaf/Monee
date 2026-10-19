'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFinance } from './finance-provider'
import { DateField, NumberField } from './number-field'
import { Panel, PanelHeading, Stat } from './panel'
import { CATEGORIES, type CategoryId } from '@/lib/finance-state'
import { addDays, todayIso } from '@/lib/dates'
import { formatPlanMoney, getCurrencyInfo, pairKey } from '@/lib/fx'
import { useFrankfurterCurrencies, useFrankfurterRates } from '@/lib/frankfurter-client'

export function SpendingWorkspace() {
  const { state, addTransaction, updateTransaction, removeTransaction, updateBudget, setCategory: setPlanCategory } = useFinance()
  const spendCurrency = state.route.receiveCurrency
  const { currencies } = useFrankfurterCurrencies()
  const txCurrencies = useMemo(() => [...new Set(state.transactions.map((tx) => tx.currency))], [state.transactions])
  const ratePairs = useMemo(() => txCurrencies.filter((code) => code !== spendCurrency).map((base) => ({ base, quote: spendCurrency })), [txCurrencies, spendCurrency])
  const { rates: referenceRates, loading: ratesLoading, errors: rateErrors } = useFrankfurterRates(ratePairs)
  const monthStart = `${todayIso().slice(0, 7)}-01`
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(0)
  const [currency, setCurrency] = useState(spendCurrency)
  const [date, setDate] = useState(todayIso())
  const [category, setTransactionCategory] = useState<CategoryId>('food')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [filter, setFilter] = useState<'week' | 'last-week' | 'month' | 'last-month' | '4-weeks' | 'custom' | 'all'>('month')
  const [customFrom, setCustomFrom] = useState(monthStart)
  const [customTo, setCustomTo] = useState(todayIso())
  const [recurring, setRecurring] = useState(false)
  const [essential, setEssential] = useState(true)

  const lastMonthStartDate = new Date(`${monthStart}T00:00:00Z`)
  lastMonthStartDate.setUTCMonth(lastMonthStartDate.getUTCMonth() - 1)
  const lastMonthStart = lastMonthStartDate.toISOString().slice(0, 10)
  const lastMonthEnd = addDays(monthStart, -1)
  const weekOffset = (new Date(`${todayIso()}T12:00:00Z`).getUTCDay() + 6) % 7
  const weekStart = addDays(todayIso(), -weekOffset)
  const fromDate = filter === 'week' ? weekStart : filter === 'last-week' ? addDays(weekStart, -7) : filter === 'month' ? monthStart : filter === 'last-month' ? lastMonthStart : filter === '4-weeks' ? addDays(todayIso(), -27) : filter === 'custom' ? customFrom : '0001-01-01'
  const toDate = filter === 'week' ? todayIso() : filter === 'last-week' ? addDays(weekStart, -1) : filter === 'last-month' ? lastMonthEnd : filter === 'custom' ? customTo : todayIso()

  const converted = useMemo(() => state.transactions.flatMap((item) => {
    const rate = item.currency === spendCurrency ? 1 : referenceRates[pairKey(item.currency, spendCurrency)]?.rate
    return rate === undefined ? [] : [{ ...item, value: item.amount * rate }]
  }), [state.transactions, spendCurrency, referenceRates])
  const missingCurrencyRates = txCurrencies.filter((code) => code !== spendCurrency && !referenceRates[pairKey(code, spendCurrency)])
  const transactions = converted.filter((item) => item.date >= fromDate && item.date <= toDate)
  const expenses = transactions.filter((item) => item.type === 'expense')
  const income = transactions.filter((item) => item.type === 'income')
  const totalSpent = expenses.reduce((sum, item) => sum + item.value, 0)
  const totalIncome = income.reduce((sum, item) => sum + item.value, 0)
  const recurringSpend = expenses.filter((item) => item.recurring).reduce((sum, item) => sum + item.value, 0)
  const oneTimeSpend = totalSpent - recurringSpend
  const essentialSpend = expenses.filter((item) => item.essential).reduce((sum, item) => sum + item.value, 0)
  const days = Math.max(1, Math.floor((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000) + 1)
  const previousFrom = filter === 'all' ? '' : addDays(fromDate, -days)
  const previousTo = filter === 'all' ? '' : addDays(fromDate, -1)
  const previousSpent = filter === 'all' ? 0 : converted.filter((item) => item.type === 'expense' && item.date >= previousFrom && item.date <= previousTo).reduce((sum, item) => sum + item.value, 0)
  const spendingDelta = totalSpent - previousSpent
  const spendingChangeNote = filter === 'all' ? 'All records · no prior-period comparison' : previousSpent === 0 ? `${formatPlanMoney(spendingDelta, spendCurrency)} vs prior period · no percentage baseline` : `${formatPlanMoney(spendingDelta, spendCurrency, { sign: true })} · ${((spendingDelta / previousSpent) * 100).toFixed(1)}% vs prior period`
  const categoryData = CATEGORIES.map((item) => ({ ...item, value: expenses.filter((tx) => tx.category === item.id).reduce((sum, tx) => sum + tx.value, 0) })).filter((item) => item.value > 0)
  const inBudgetPeriod = converted.filter((item) => {
    if (item.type !== 'expense') return false
    const start = state.budget.period === 'weekly' ? weekStart : monthStart
    return item.date >= start && item.date <= todayIso()
  })
  const budgetSpent = inBudgetPeriod.reduce((sum, item) => sum + item.value, 0)
  const budgetPct = state.budget.total > 0 ? budgetSpent / state.budget.total * 100 : null
  const budgetWindowDays = state.budget.period === 'weekly' ? 7 : new Date(Date.UTC(Number(todayIso().slice(0, 4)), Number(todayIso().slice(5, 7)), 0)).getUTCDate()
  const budgetElapsedDays = state.budget.period === 'weekly' ? weekOffset + 1 : Number(todayIso().slice(8, 10))
  const estimatedBudgetEnd = budgetElapsedDays ? budgetSpent / budgetElapsedDays * budgetWindowDays : 0
  const categoryBudgetProgress = CATEGORIES.map((category) => {
    const spent = inBudgetPeriod.filter((tx) => tx.category === category.id).reduce((sum, tx) => sum + tx.value, 0)
    const target = state.budget.categories[category.id] ?? 0
    return { ...category, spent, target }
  }).filter((item) => item.spent > 0 || item.target > 0)
  const currencyOptions = currencies.map((item) => item.code)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!description.trim() || !Number.isFinite(amount) || amount <= 0 || date > todayIso()) return
    addTransaction({ description: description.trim(), amount, currency, date, category, type, recurring, essential })
    setDescription('')
    setAmount(0)
  }

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Stat label="Spending in period" value={formatPlanMoney(totalSpent, spendCurrency)} note="Entered transactions only" />
      <Stat label="Income in period" value={formatPlanMoney(totalIncome, spendCurrency)} note="Entered transactions only" tone="mint" />
      <Stat label="Net cash flow" value={formatPlanMoney(totalIncome - totalSpent, spendCurrency)} note="Income minus spending" tone={totalIncome >= totalSpent ? 'mint' : 'coral'} />
      <Stat label="Average daily spend" value={formatPlanMoney(totalSpent / days, spendCurrency)} note={`About ${formatPlanMoney(totalSpent / days * 7, spendCurrency)} per week`} />
      <Stat label="Spending change" value={filter === 'all' ? '—' : formatPlanMoney(spendingDelta, spendCurrency, { sign: true })} note={spendingChangeNote} tone={spendingDelta > 0 ? 'coral' : spendingDelta < 0 ? 'mint' : 'neutral'} />
    </div>

    <Panel>
      <PanelHeading title="Add a transaction" description="These are historical actuals, saved in this browser. No sample transactions are preloaded." />
      <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm text-muted-foreground">Description<input required value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 block w-full rounded-2xl border border-foreground/10 bg-background/60 px-3.5 py-3 text-foreground outline-none focus:border-lavender/60" placeholder="Groceries" /></label>
        <NumberField label="Amount" value={amount} min={0} decimals={2} onChange={setAmount} />
        <label className="text-sm text-muted-foreground">Currency<select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-2 block w-full rounded-2xl border border-foreground/10 bg-background/60 px-3.5 py-3 text-foreground">{currencyOptions.map((code) => <option key={code} value={code}>{getCurrencyInfo(code).name} ({code})</option>)}</select></label>
        <DateField label="Date" value={date} onChange={setDate} />
        <label className="text-sm text-muted-foreground">Category<select value={category} onChange={(e) => setTransactionCategory(e.target.value as CategoryId)} className="mt-2 block w-full rounded-2xl border border-foreground/10 bg-background/60 px-3.5 py-3 text-foreground">{CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="text-sm text-muted-foreground">Type<select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="mt-2 block w-full rounded-2xl border border-foreground/10 bg-background/60 px-3.5 py-3 text-foreground"><option value="expense">Expense</option><option value="income">Income</option></select></label>
        <label className="flex items-center gap-2 self-end rounded-2xl border border-foreground/10 bg-background/40 px-3 py-3 text-sm text-foreground"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />Recurring</label>
        <label className="flex items-center gap-2 self-end rounded-2xl border border-foreground/10 bg-background/40 px-3 py-3 text-sm text-foreground"><input type="checkbox" checked={essential} onChange={(e) => setEssential(e.target.checked)} />Essential</label>
        <div className="flex items-end"><button className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background hover:opacity-90"><Plus className="size-4" />Add transaction</button></div>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">Currency summaries use Frankfurter reference rates, not real-time prices. Rates may differ from those offered by banks and money-transfer providers.</p>
    </Panel>

    {missingCurrencyRates.length > 0 && <Panel><p role="status" className="text-sm text-muted-foreground">{Object.values(ratesLoading).some(Boolean) ? 'Loading Frankfurter rates for transaction currencies…' : `Totals currently exclude transactions in ${missingCurrencyRates.join(', ')} because a reference rate is unavailable.`}</p>{missingCurrencyRates.map((code) => rateErrors[pairKey(code, spendCurrency)] && <p key={code} role="alert" className="mt-1 text-sm text-coral">{code}/{spendCurrency}: {rateErrors[pairKey(code, spendCurrency)]}</p>)}</Panel>}

    <Panel>
      <PanelHeading title="Spending mix" description="Based only on transactions you entered in the selected period. Classifications can be changed in the transaction list." />
      {expenses.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Recurring" value={formatPlanMoney(recurringSpend, spendCurrency)} note="Marked recurring" /><Stat label="One-time" value={formatPlanMoney(oneTimeSpend, spendCurrency)} note="Not marked recurring" /><Stat label="Essential" value={formatPlanMoney(essentialSpend, spendCurrency)} note="Marked essential" /><Stat label="Discretionary" value={formatPlanMoney(totalSpent-essentialSpend, spendCurrency)} note="Marked non-essential" /></div> : <p className="mt-4 text-sm text-muted-foreground">Add expense actuals to see recurring and essential spending.</p>}
    </Panel>

    <Panel>
      <div className="flex flex-wrap items-end justify-between gap-4"><PanelHeading title="Transaction history" description={`${transactions.length} transaction${transactions.length === 1 ? '' : 's'} in this period.`} />
        <label className="text-sm text-muted-foreground">Period<select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="mt-2 block rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2 text-foreground"><option value="week">This week</option><option value="last-week">Last week</option><option value="month">This month</option><option value="last-month">Last month</option><option value="4-weeks">Last four weeks</option><option value="custom">Custom dates</option><option value="all">All records</option></select></label></div>
      {filter === 'custom' && <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2"><DateField label="From" value={customFrom} onChange={setCustomFrom}/><DateField label="To" value={customTo} onChange={setCustomTo}/>{customFrom > customTo && <p className="text-sm text-coral">The start date must be on or before the end date.</p>}</div>}
      {transactions.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-foreground/15 p-8 text-center"><p className="font-serif text-xl text-foreground">No actuals in this period</p><p className="mt-2 text-sm text-muted-foreground">Add a transaction above to see your personal breakdown. This chart will not use demo figures.</p></div> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="py-3">Date</th><th>Description</th><th>Category</th><th>Type</th><th>Currency</th><th className="text-right">Amount</th><th>Flags</th><th /></tr></thead><tbody>{transactions.slice().sort((a,b) => b.date.localeCompare(a.date)).map((item) => <tr key={item.id} className="border-t border-foreground/[0.07]"><td className="py-3 pr-3"><input type="date" value={item.date} onChange={(e) => updateTransaction(item.id, { date: e.target.value })} className="max-w-36 bg-transparent text-foreground" /></td><td><input aria-label="Description" value={item.description} onChange={(e) => updateTransaction(item.id, { description: e.target.value })} className="w-full bg-transparent text-foreground" /></td><td><select aria-label="Category" value={item.category} onChange={(e) => updateTransaction(item.id, { category: e.target.value as CategoryId })} className="bg-transparent text-foreground">{CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{cat.label}</option>)}</select></td><td><select aria-label="Type" value={item.type} onChange={(e) => updateTransaction(item.id, { type: e.target.value as typeof item.type })} className="bg-transparent text-foreground"><option value="expense">Expense</option><option value="income">Income</option></select></td><td><select aria-label="Currency" value={item.currency} onChange={(e) => updateTransaction(item.id, { currency: e.target.value })} className="bg-transparent text-foreground">{currencyOptions.map((code) => <option key={code} value={code}>{code}</option>)}</select></td><td className="text-right"><input aria-label="Amount" type="number" min="0" step="0.01" value={item.amount} onChange={(e) => updateTransaction(item.id, { amount: Math.max(0, Number(e.target.value) || 0) })} className="w-28 bg-transparent text-right tabular-nums text-foreground" /><span className="ml-1 text-xs text-muted-foreground">{item.currency}</span><p className="text-xs text-muted-foreground">≈ {formatPlanMoney(item.value, spendCurrency)}</p></td><td><label className="block text-xs text-muted-foreground"><input type="checkbox" checked={item.recurring} onChange={(e) => updateTransaction(item.id, { recurring: e.target.checked })} /> Recurring</label><label className="block text-xs text-muted-foreground"><input type="checkbox" checked={item.essential} onChange={(e) => updateTransaction(item.id, { essential: e.target.checked })} /> Essential</label></td><td className="pl-3"><button type="button" onClick={() => removeTransaction(item.id)} aria-label={`Delete ${item.description}`} className="rounded-full p-2 text-muted-foreground hover:text-coral"><Trash2 className="size-4" /></button></td></tr>)}</tbody></table></div>}
    </Panel>

    <div className="grid gap-6 lg:grid-cols-2">
      <Panel><PanelHeading title="Spending by category" description="Converted totals for expenses you entered in the selected period." />{categoryData.length ? <div className="mt-4 grid items-center gap-3 sm:grid-cols-[1fr_1fr]"><div className="h-60"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="label" innerRadius={52} outerRadius={88}>{categoryData.map((item) => <Cell key={item.id} fill={item.color} />)}</Pie><Tooltip formatter={(value) => formatPlanMoney(Number(value ?? 0), spendCurrency)} /></PieChart></ResponsiveContainer></div><ul className="space-y-3">{categoryData.slice().sort((a,b) => b.value-a.value).map((item) => <li key={item.id} className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><i className="size-2 rounded-full" style={{background:item.color}} />{item.label}</span><span className="tabular-nums">{formatPlanMoney(item.value, spendCurrency)}</span><button type="button" onClick={() => setPlanCategory(item.id, item.value / (state.budget.period === 'weekly' ? 7 : days) * 30.4375)} className="text-xs text-lavender hover:underline">Use in plan</button></li>)}</ul></div> : <p className="mt-5 text-sm text-muted-foreground">Add expenses to create an actual category breakdown.</p>}</Panel>
      <Panel><PanelHeading title="Budgets and comparison" description="Compare recorded expenses with your targets. A 0% budget used is shown when spending is zero." /><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm text-muted-foreground">Budget period<select value={state.budget.period} onChange={(e) => updateBudget({period:e.target.value as typeof state.budget.period})} className="mt-2 block w-full rounded-2xl border border-foreground/10 bg-background/60 px-3.5 py-3 text-foreground"><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><NumberField label="Total budget" value={state.budget.total} prefix={getCurrencyInfo(spendCurrency).symbol} decimals={0} onChange={(total) => updateBudget({total})} /></div><div className="mt-5 rounded-2xl bg-background/50 p-4"><p className="text-xs text-muted-foreground">{state.budget.period === 'weekly' ? 'This week' : 'This month'} spent</p><p className="mt-1 font-serif text-2xl text-foreground">{formatPlanMoney(budgetSpent, spendCurrency)}{state.budget.total > 0 && <span className="ml-2 text-sm text-muted-foreground">of {formatPlanMoney(state.budget.total, spendCurrency)}</span>}</p>{state.budget.total > 0 ? <><p className="mt-1 text-sm text-muted-foreground">{budgetPct!.toFixed(0)}% used · {formatPlanMoney(state.budget.total-budgetSpent, spendCurrency)} remaining</p><p className="mt-1 text-sm text-muted-foreground">At the current pace: about {formatPlanMoney(estimatedBudgetEnd, spendCurrency)} by period end.</p></> : <p className="mt-1 text-sm text-muted-foreground">Set a target to see budget progress.</p>}</div><details className="mt-4"><summary className="cursor-pointer text-sm text-foreground">Set category budgets</summary><div className="mt-4 grid gap-3 sm:grid-cols-2">{CATEGORIES.map((item) => <NumberField key={item.id} label={item.label} value={state.budget.categories[item.id] ?? 0} prefix={getCurrencyInfo(spendCurrency).symbol} decimals={0} onChange={(value) => updateBudget({categories:{[item.id]:value}})} />)}</div></details>{categoryBudgetProgress.length > 0 && <ul className="mt-5 space-y-2">{categoryBudgetProgress.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 border-b border-foreground/[0.06] py-2 text-sm"><span>{item.label}</span><span className="text-muted-foreground">{formatPlanMoney(item.spent, spendCurrency)} spent{item.target > 0 ? ` of ${formatPlanMoney(item.target, spendCurrency)} · ${item.spent === 0 ? '0' : Math.round(item.spent/item.target*100)}%` : ' · no budget set'}</span></li>)}</ul>}<div className="mt-5 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} margin={{left:4,right:8}}><CartesianGrid vertical={false} stroke="rgba(243,240,234,0.06)"/><XAxis dataKey="label" hide/><YAxis tickFormatter={(value) => Number(value).toLocaleString()} tick={{fill:'#A3A6AB',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip formatter={(value) => formatPlanMoney(Number(value ?? 0), spendCurrency)}/><Bar dataKey="value" name="Actual spending" fill="#85D6B1" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></Panel>
    </div>
  </div>
}
