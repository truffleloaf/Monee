import { addDays, isValidIso } from './dates'
import {
  getCountry,
  getCurrencyInfo,
  hasCountry,
  hasCurrency,
  illustrativeRate,
  pairKey,
  roundNice,
} from './fx'
import { validateWalletLedger } from './wallet'

export const CATEGORIES = [
  { id: 'rent', label: 'Housing and rent', color: '#B8A8F8' },
  { id: 'food', label: 'Food and groceries', color: '#85D6B1' },
  { id: 'transport', label: 'Transport', color: '#8FB8E8' },
  { id: 'study', label: 'Education and tuition', color: '#E9C98A' },
  { id: 'utilities', label: 'Utilities', color: '#8FCBC7' },
  { id: 'shopping', label: 'Shopping', color: '#D9A7C7' },
  { id: 'leisure', label: 'Entertainment', color: '#E58A87' },
  { id: 'travel', label: 'Travel', color: '#C7A98B' },
  { id: 'health', label: 'Health', color: '#E59E87' },
  { id: 'subscriptions', label: 'Subscriptions', color: '#AFA2DB' },
  { id: 'other', label: 'Everything else', color: '#A3A6AB' },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']
export type CategoryLabels = Partial<Record<CategoryId, string>>

export function getCategories(labels: CategoryLabels = {}) {
  return CATEGORIES.map((category) => ({ ...category, label: labels[category.id]?.trim() || category.label }))
}

export interface ActualTransaction {
  id: string
  description: string
  amount: number
  currency: string
  date: string
  type: 'income' | 'expense'
  category: CategoryId
  recurring: boolean
  essential: boolean
}

export interface WalletEntry {
  id: string
  description: string
  date: string
  category: CategoryId
  type: 'income' | 'expense' | 'transfer' | 'conversion'
  currency: string
  /** Integer minor units, e.g. cents/sen for currencies with two decimals. */
  amountMinor: number
  toCurrency?: string
  receivedMinor?: number
}

export interface WalletState {
  /** Starting balance per currency, stored in integer minor units. */
  openingMinor: Record<string, number>
  entries: WalletEntry[]
  reportCurrency: string
}

export interface BudgetState {
  period: 'weekly' | 'monthly'
  total: number
  categories: Partial<Record<CategoryId, number>>
}

export interface RouteState {
  sendCountry: string
  sendCurrency: string
  receiveCountry: string
  receiveCurrency: string
}

export interface ExchangeState {
  /** Amount typed into the converter, in the sending currency. */
  amount: number
  feePct: number
  /** Flat fee in the receiving currency. */
  flatFee: number
  customRates: Record<string, number>
}

export interface Payment {
  id: string
  label: string
  /** In the spending currency. */
  amount: number
  date: string
  kind: 'tuition' | 'other'
  frequency: 'once' | 'weekly' | 'biweekly' | 'monthly'
}

export interface Holding {
  id: string
  currency: string
  /** Already received and held in this currency. */
  amount: number
  /** Income arriving each month in this currency. */
  monthlyIncome: number
}

export interface PlanState {
  startDate: string
  /** Cash in hand, in the spending currency. */
  balance: number
  /** Expected family transfer, in the sending currency. */
  transferAmount: number
  transferDate: string
  transferFrequency: 'once' | 'weekly' | 'biweekly' | 'monthly'
  forecastWeeks: number
  forecastUnit: 'weekly' | 'monthly'
  reserve: number
  /** Monthly spending per category, in the spending currency. */
  categories: Record<CategoryId, number>
  payments: Payment[]
  holdings: Holding[]
}

export type LabScenarioId = 'baseline' | 'late' | 'rate' | 'expense' | 'stress' | 'custom'

export interface LabState {
  scenario: LabScenarioId
  lateDays: number
  /** Signed percent move of the sending currency against the spending currency. */
  rateMove: number
  expenseLabel: string
  expenseAmount: number
  expenseDate: string
  extraIncomeLabel: string
  extraIncomeAmount: number
  extraIncomeDate: string
  extraIncomeFrequency: 'once' | 'weekly' | 'biweekly' | 'monthly'
  tuitionIncreasePct: number
}

export interface SavedScenario {
  id: string
  name: string
  route: RouteState
  exchange: ExchangeState
  plan: PlanState
  lab: LabState
}

export interface FinanceState {
  route: RouteState
  exchange: ExchangeState
  plan: PlanState
  lab: LabState
  transactions: ActualTransaction[]
  wallet: WalletState
  budget: BudgetState
  categoryLabels: CategoryLabels
  savedScenarios: SavedScenario[]
}

export function createDefaultState(today: string): FinanceState {
  return {
    route: { sendCountry: 'CN', sendCurrency: 'CNY', receiveCountry: 'MY', receiveCurrency: 'MYR' },
    exchange: { amount: 3000, feePct: 0.5, flatFee: 0, customRates: {} },
    plan: {
      startDate: today,
      balance: 7000,
      transferAmount: 5000,
      transferDate: addDays(today, 14),
      transferFrequency: 'once',
      forecastWeeks: 8,
      forecastUnit: 'weekly',
      reserve: 1000,
      categories: { rent: 850, food: 500, transport: 100, study: 150, utilities: 0, shopping: 0, leisure: 120, travel: 0, health: 0, subscriptions: 0, other: 80 },
      payments: [
        {
          id: 'tuition',
          label: 'Tuition instalment',
          amount: 5200,
          date: addDays(today, 16),
          kind: 'tuition',
          frequency: 'once',
        },
        {
          id: 'insurance',
          label: 'Health insurance',
          amount: 250,
          date: addDays(today, 35),
          kind: 'other',
          frequency: 'once',
        },
      ],
      holdings: [],
    },
    lab: {
      scenario: 'baseline',
      lateDays: 7,
      rateMove: 5,
      expenseLabel: 'Laptop replacement',
      expenseAmount: 1500,
      expenseDate: addDays(today, 28),
      extraIncomeLabel: 'Part-time income',
      extraIncomeAmount: 0,
      extraIncomeDate: addDays(today, 14),
      extraIncomeFrequency: 'monthly',
      tuitionIncreasePct: 0,
    },
    transactions: [],
    wallet: { openingMinor: {}, entries: [], reportCurrency: 'MYR' },
    budget: { period: 'monthly', total: 0, categories: {} },
    categoryLabels: {},
    savedScenarios: [],
  }
}

export function monthlyTotal(categories: Record<CategoryId, number>) {
  return CATEGORIES.reduce((sum, category) => sum + categories[category.id], 0)
}

/** Scales every category so the monthly total matches, keeping proportions. */
export function withMonthlyTotal(state: FinanceState, total: number): FinanceState {
  const current = monthlyTotal(state.plan.categories)
  const categories = { ...state.plan.categories }
  for (const category of CATEGORIES) {
    categories[category.id] =
      current > 0 ? (categories[category.id] / current) * total : total / CATEGORIES.length
  }
  return { ...state, plan: { ...state.plan, categories } }
}

/**
 * Applies a route change. Changing a currency converts the plan's amounts at the
 * illustrative rate so the same real-world value carries over to the new currency.
 */
export function applyRoute(state: FinanceState, patch: Partial<RouteState>): FinanceState {
  const route = { ...state.route, ...patch }
  const rawSpendFactor = illustrativeRate(state.route.receiveCurrency, route.receiveCurrency)
  const rawSendFactor = illustrativeRate(state.route.sendCurrency, route.sendCurrency)
  const spendFactor = Number.isFinite(rawSpendFactor) ? rawSpendFactor : 1
  const sendFactor = Number.isFinite(rawSendFactor) ? rawSendFactor : 1
  const spendDecimals = getCurrencyInfo(route.receiveCurrency).decimals
  const sendDecimals = getCurrencyInfo(route.sendCurrency).decimals
  const spend = (value: number) =>
    spendFactor === 1 ? value : roundNice(value * spendFactor, spendDecimals)
  const send = (value: number) =>
    sendFactor === 1 ? value : roundNice(value * sendFactor, sendDecimals)

  let balance = spend(state.plan.balance)
  const holdings: Holding[] = []
  for (const holding of state.plan.holdings) {
    if (holding.currency === route.receiveCurrency) balance += holding.amount
    else holdings.push(holding)
  }

  const categories = { ...state.plan.categories }
  for (const category of CATEGORIES) categories[category.id] = spend(categories[category.id])

  return {
    route,
    exchange: { ...state.exchange, flatFee: spend(state.exchange.flatFee) },
    plan: {
      ...state.plan,
      balance,
      reserve: spend(state.plan.reserve),
      transferAmount: send(state.plan.transferAmount),
      categories,
      payments: state.plan.payments.map((payment) => ({ ...payment, amount: spend(payment.amount) })),
      holdings,
    },
    lab: { ...state.lab, expenseAmount: spend(state.lab.expenseAmount) },
    transactions: state.transactions,
    wallet: state.wallet,
    budget: {
      ...state.budget,
      total: spend(state.budget.total),
      categories: Object.fromEntries(Object.entries(state.budget.categories).map(([id, amount]) => [id, spend(amount ?? 0)])) as Partial<Record<CategoryId, number>>,
    },
    categoryLabels: state.categoryLabels,
    savedScenarios: state.savedScenarios,
  }
}

export function chooseCountry(
  state: FinanceState,
  side: 'send' | 'receive',
  countryCode: string,
): FinanceState {
  const country = getCountry(countryCode)
  return applyRoute(
    state,
    side === 'send'
      ? { sendCountry: country.code, sendCurrency: country.currency }
      : { receiveCountry: country.code, receiveCurrency: country.currency },
  )
}

export function swapRoute(state: FinanceState): FinanceState {
  const { route } = state
  const swapped = applyRoute(state, {
    sendCountry: route.receiveCountry,
    sendCurrency: route.receiveCurrency,
    receiveCountry: route.sendCountry,
    receiveCurrency: route.sendCurrency,
  })
  const forward = state.exchange.customRates[pairKey(route.sendCurrency, route.receiveCurrency)]
  const reverseKey = pairKey(route.receiveCurrency, route.sendCurrency)
  const customRates = { ...swapped.exchange.customRates }
  if (forward && !customRates[reverseKey]) customRates[reverseKey] = 1 / forward
  // The typed amount is a bare number, so it stays as typed on the swapped side.
  return {
    ...swapped,
    exchange: { ...swapped.exchange, amount: state.exchange.amount, customRates },
  }
}

/* ---------- Loading saved state ---------- */

const finite = (value: unknown, fallback: number, min = 0) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min ? value : fallback

const text = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.slice(0, 60) : fallback

const date = (value: unknown, fallback: string) => (isValidIso(value) ? value : fallback)

export function sanitizeState(raw: unknown, today: string): FinanceState {
  const base = createDefaultState(today)
  if (!raw || typeof raw !== 'object') return base
  const saved = raw as Partial<Record<keyof FinanceState, Record<string, unknown>>>

  const r = saved.route ?? {}
  const sendCountry = typeof r.sendCountry === 'string' && hasCountry(r.sendCountry) ? r.sendCountry : base.route.sendCountry
  const receiveCountry =
    typeof r.receiveCountry === 'string' && hasCountry(r.receiveCountry) ? r.receiveCountry : base.route.receiveCountry
  const route: RouteState = {
    sendCountry,
    receiveCountry,
    sendCurrency:
      typeof r.sendCurrency === 'string' && hasCurrency(r.sendCurrency)
        ? r.sendCurrency
        : getCountry(sendCountry).currency,
    receiveCurrency:
      typeof r.receiveCurrency === 'string' && hasCurrency(r.receiveCurrency)
        ? r.receiveCurrency
        : getCountry(receiveCountry).currency,
  }

  const e = saved.exchange ?? {}
  const customRates: Record<string, number> = {}
  if (e.customRates && typeof e.customRates === 'object') {
    for (const [key, value] of Object.entries(e.customRates as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) customRates[key] = value
    }
  }
  const exchange: ExchangeState = {
    amount: finite(e.amount, base.exchange.amount),
    feePct: finite(e.feePct, base.exchange.feePct),
    flatFee: finite(e.flatFee, base.exchange.flatFee),
    customRates,
  }

  const p = saved.plan ?? {}
  const savedCategories = (p.categories ?? {}) as Record<string, unknown>
  const categories = { ...base.plan.categories }
  for (const category of CATEGORIES) {
    const legacyId = category.id === 'rent' ? 'housing' : category.id === 'study' ? 'education' : category.id === 'leisure' ? 'entertainment' : category.id
    categories[category.id] = finite(savedCategories[category.id] ?? savedCategories[legacyId], categories[category.id])
  }
  const payments: Payment[] = Array.isArray(p.payments)
    ? (p.payments as Record<string, unknown>[]).slice(0, 20).map((item, index) => ({
        id: text(item.id, `payment-${index}`),
        label: text(item.label, 'Payment'),
        amount: finite(item.amount, 0),
        date: date(item.date, base.plan.transferDate),
        kind: item.kind === 'tuition' ? 'tuition' : 'other',
        frequency: item.frequency === 'weekly' || item.frequency === 'biweekly' || item.frequency === 'monthly' ? item.frequency : 'once',
      }))
    : base.plan.payments
  if (!payments.some((payment) => payment.kind === 'tuition')) {
    payments.unshift(base.plan.payments[0])
  }
  const holdings: Holding[] = Array.isArray(p.holdings)
    ? (p.holdings as Record<string, unknown>[])
        .filter((item) => typeof item.currency === 'string' && hasCurrency(item.currency))
        .slice(0, 6)
        .map((item, index) => ({
          id: text(item.id, `holding-${index}`),
          currency: item.currency as string,
          amount: finite(item.amount, 0),
          monthlyIncome: finite(item.monthlyIncome, 0),
        }))
    : []
  const plan: PlanState = {
    startDate: date(p.startDate, base.plan.startDate),
    balance: finite(p.balance, base.plan.balance, -1e12),
    transferAmount: finite(p.transferAmount, base.plan.transferAmount),
    transferDate: date(p.transferDate, base.plan.transferDate),
    transferFrequency: p.transferFrequency === 'weekly' || p.transferFrequency === 'biweekly' || p.transferFrequency === 'monthly' ? p.transferFrequency : 'once',
    forecastWeeks: Math.min(104, Math.max(1, Math.round(finite(p.forecastWeeks, base.plan.forecastWeeks, 1)))),
    forecastUnit: p.forecastUnit === 'monthly' ? 'monthly' : 'weekly',
    reserve: finite(p.reserve, base.plan.reserve),
    categories,
    payments,
    holdings,
  }

  const l = saved.lab ?? {}
  const scenarios: LabScenarioId[] = ['baseline', 'late', 'rate', 'expense', 'stress', 'custom']
  const lab: LabState = {
    scenario: scenarios.includes(l.scenario as LabScenarioId) ? (l.scenario as LabScenarioId) : 'baseline',
    lateDays: finite(l.lateDays, base.lab.lateDays),
    rateMove: finite(l.rateMove, base.lab.rateMove, -100),
    expenseLabel: text(l.expenseLabel, base.lab.expenseLabel),
    expenseAmount: finite(l.expenseAmount, base.lab.expenseAmount),
    expenseDate: date(l.expenseDate, base.lab.expenseDate),
    extraIncomeLabel: text(l.extraIncomeLabel, base.lab.extraIncomeLabel),
    extraIncomeAmount: finite(l.extraIncomeAmount, base.lab.extraIncomeAmount),
    extraIncomeDate: date(l.extraIncomeDate, base.lab.extraIncomeDate),
    extraIncomeFrequency: l.extraIncomeFrequency === 'weekly' || l.extraIncomeFrequency === 'biweekly' || l.extraIncomeFrequency === 'monthly' ? l.extraIncomeFrequency : 'once',
    tuitionIncreasePct: Math.min(1000, finite(l.tuitionIncreasePct, base.lab.tuitionIncreasePct)),
  }

  const validCategories = new Set<string>(CATEGORIES.map((category) => category.id))
  const transactions: ActualTransaction[] = Array.isArray(saved.transactions)
    ? (saved.transactions as Record<string, unknown>[]).slice(0, 1000).flatMap((item, index) => {
        if (typeof item.currency !== 'string' || !hasCurrency(item.currency) || typeof item.category !== 'string' || !validCategories.has(item.category) || !isValidIso(item.date)) return []
        return [{
          id: text(item.id, `transaction-${index}`),
          description: text(item.description, 'Transaction'),
          amount: finite(item.amount, 0),
          currency: item.currency,
          date: item.date,
          type: item.type === 'income' ? 'income' : 'expense',
          category: item.category as CategoryId,
          recurring: item.recurring === true,
          essential: item.essential !== false,
        }]
      })
    : []
  const budgetSaved = saved.budget ?? {}
  const budgetCategories = typeof budgetSaved.categories === 'object' && budgetSaved.categories ? budgetSaved.categories as Record<string, unknown> : {}
  const budget: BudgetState = {
    period: budgetSaved.period === 'weekly' ? 'weekly' : 'monthly',
    total: finite(budgetSaved.total, 0),
    categories: Object.fromEntries(CATEGORIES.flatMap((category) => {
      const amount = budgetCategories[category.id]
      return typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 ? [[category.id, amount]] : []
    })) as Partial<Record<CategoryId, number>>,
  }

  const categoryLabelSaved = saved.categoryLabels && typeof saved.categoryLabels === 'object' ? saved.categoryLabels as Record<string, unknown> : {}
  const categoryLabels = Object.fromEntries(CATEGORIES.flatMap((category) => {
    const label = categoryLabelSaved[category.id]
    return typeof label === 'string' && label.trim() ? [[category.id, label.trim().slice(0, 36)]] : []
  })) as CategoryLabels

  const savedScenarios: SavedScenario[] = Array.isArray(saved.savedScenarios)
    ? (saved.savedScenarios as Record<string, unknown>[]).slice(0, 30).flatMap((item, index) => {
        if (!item.plan || typeof item.plan !== 'object') return []
        const snapshot = sanitizeState({ route: item.route, exchange: item.exchange, plan: item.plan, lab: item.lab }, today)
        return [{
          id: text(item.id, `scenario-${index}`),
          name: text(item.name, `Scenario ${index + 1}`),
          route: snapshot.route,
          exchange: snapshot.exchange,
          plan: snapshot.plan,
          lab: snapshot.lab,
        }]
      })
    : []

  const walletSaved = saved.wallet && typeof saved.wallet === 'object' ? saved.wallet : {}
  const openingMinor: Record<string, number> = {}
  if (walletSaved.openingMinor && typeof walletSaved.openingMinor === 'object') {
    for (const [code, value] of Object.entries(walletSaved.openingMinor as Record<string, unknown>)) {
      if (hasCurrency(code) && typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) openingMinor[code] = value
    }
  }
  const walletEntries: WalletEntry[] = Array.isArray(walletSaved.entries)
    ? (walletSaved.entries as Record<string, unknown>[]).slice(0, 2000).flatMap((item, index) => {
      const validType = ['income', 'expense', 'transfer', 'conversion'].includes(String(item.type))
      if (!validType || typeof item.currency !== 'string' || !hasCurrency(item.currency) || !isValidIso(item.date) || typeof item.category !== 'string' || !validCategories.has(item.category) || typeof item.amountMinor !== 'number' || !Number.isSafeInteger(item.amountMinor) || item.amountMinor <= 0) return []
      if (item.type === 'transfer' || item.type === 'conversion') {
        if (typeof item.toCurrency !== 'string' || !hasCurrency(item.toCurrency) || typeof item.receivedMinor !== 'number' || !Number.isSafeInteger(item.receivedMinor) || item.receivedMinor <= 0) return []
      }
      return [{
        id: text(item.id, `wallet-${index}`), description: text(item.description, 'Wallet entry'), date: item.date,
        category: item.category as CategoryId, type: item.type as WalletEntry['type'], currency: item.currency,
        amountMinor: item.amountMinor, ...(typeof item.toCurrency === 'string' ? { toCurrency: item.toCurrency } : {}),
        ...(typeof item.receivedMinor === 'number' ? { receivedMinor: item.receivedMinor } : {}),
      }]
    })
    : []
  const safeWalletEntries: WalletEntry[] = []
  for (const entry of walletEntries) {
    if (validateWalletLedger(openingMinor, [...safeWalletEntries, entry]).ok) safeWalletEntries.push(entry)
  }
  const reportCurrency = typeof walletSaved.reportCurrency === 'string' && hasCurrency(walletSaved.reportCurrency) ? walletSaved.reportCurrency : 'MYR'
  const wallet = { openingMinor, entries: safeWalletEntries, reportCurrency }

  return { route, exchange, plan, lab, transactions, wallet, budget, categoryLabels, savedScenarios }
}
