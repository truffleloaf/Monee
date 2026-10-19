import { addDays, daysBetween } from './dates'
import {
  CATEGORIES,
  monthlyTotal,
  type CategoryId,
  type FinanceState,
  type LabScenarioId,
} from './finance-state'
import {
  applyMovement,
  getRateQuote,
  quoteTransfer,
  type RateQuote,
  type TransferQuote,
} from './fx'

export const HORIZON_DAYS = 56
const RUNWAY_HORIZON_DAYS = 365

export interface SimEvent {
  label: string
  delta: number
}

export interface SimPoint {
  day: number
  date: string
  balance: number
  breached: boolean
  events: SimEvent[]
}

export interface SimWeek {
  week: number
  income: number
  expenses: number
}

export interface PaymentCheck {
  label: string
  date: string
  day: number
  amount: number
  balanceAfter: number
}

export interface SimInput {
  startDate: string
  horizonDays: number
  openingBalance: number
  dailyExpense: number
  dailyIncome: number
  reserve: number
  transfers: { label: string; date: string; amount: number }[]
  payments: { label: string; date: string; amount: number }[]
}

type Frequency = 'once' | 'weekly' | 'biweekly' | 'monthly'

function monthlyOccurrence(startDate: string, months: number) {
  const [year, month, day] = startDate.split('-').map(Number)
  const first = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return addDays(`${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`, 0)
}

function expandRecurring<T extends { date: string }>(items: T[], frequency: Frequency, horizonDays: number, anchorDate: string): T[] {
  if (frequency === 'once') return items
  const result: T[] = []
  for (const item of items) {
    for (let occurrence = 0; occurrence <= 2000; occurrence++) {
      const date = frequency === 'monthly'
        ? monthlyOccurrence(item.date, occurrence)
        : addDays(item.date, occurrence * (frequency === 'weekly' ? 7 : 14))
      if (daysBetween(anchorDate, date) > horizonDays) break
      result.push({ ...item, date })
    }
  }
  return result
}

export interface SimResult {
  points: SimPoint[]
  lowest: SimPoint
  final: SimPoint
  firstBreach: SimPoint | null
  breachDays: number
  weeks: SimWeek[]
  checks: PaymentCheck[]
}

export type WindowStatus = 'before' | 'inside' | 'after'

export function windowStatus(startDate: string, date: string, horizon = HORIZON_DAYS): WindowStatus {
  const day = daysBetween(startDate, date)
  return day < 1 ? 'before' : day > horizon ? 'after' : 'inside'
}

export function simulate(input: SimInput): SimResult {
  const { startDate, horizonDays, reserve } = input
  const inWindow = <T extends { date: string }>(items: T[]) =>
    items
      .map((item) => ({ ...item, day: daysBetween(startDate, item.date) }))
      .filter((item) => item.day >= 1 && item.day <= horizonDays)
  const transfers = inWindow(input.transfers)
  const payments = inWindow(input.payments)

  const weeks: SimWeek[] = Array.from({ length: Math.ceil(horizonDays / 7) }, (_, index) => ({
    week: index + 1,
    income: 0,
    expenses: 0,
  }))
  const points: SimPoint[] = [
    {
      day: 0,
      date: startDate,
      balance: input.openingBalance,
      breached: input.openingBalance < reserve,
      events: [],
    },
  ]

  let balance = input.openingBalance
  for (let day = 1; day <= horizonDays; day++) {
    const week = weeks[Math.floor((day - 1) / 7)]
    balance += input.dailyIncome - input.dailyExpense
    week.income += input.dailyIncome
    week.expenses += input.dailyExpense
    const events: SimEvent[] = []
    for (const transfer of transfers) {
      if (transfer.day !== day) continue
      balance += transfer.amount
      week.income += transfer.amount
      events.push({ label: transfer.label, delta: transfer.amount })
    }
    for (const payment of payments) {
      if (payment.day !== day) continue
      balance -= payment.amount
      week.expenses += payment.amount
      events.push({ label: payment.label, delta: -payment.amount })
    }
    points.push({ day, date: addDays(startDate, day), balance, breached: balance < reserve, events })
  }

  const lowest = points.reduce((min, point) => (point.balance < min.balance ? point : min))
  return {
    points,
    lowest,
    final: points[points.length - 1],
    firstBreach: points.find((point) => point.breached) ?? null,
    breachDays: points.filter((point) => point.breached).length,
    weeks,
    checks: payments.map((payment) => ({
      label: payment.label,
      date: payment.date,
      day: payment.day,
      amount: payment.amount,
      balanceAfter: points[payment.day].balance,
    })),
  }
}

/** Days until cash in hand drops below the reserve, ignoring future transfers. */
export function runwayDays(input: SimInput): number | null {
  const result = simulate({ ...input, transfers: [], horizonDays: RUNWAY_HORIZON_DAYS })
  return result.firstBreach ? result.firstBreach.day : null
}

export const RUNWAY_CAP_DAYS = RUNWAY_HORIZON_DAYS

/* ---------- Building a simulation from shared state ---------- */

export interface Overrides {
  delayDays?: number
  rateMovePct?: number
  tuitionIncreasePct?: number
  extraExpense?: { label: string; amount: number; date: string } | null
  extraIncome?: { label: string; amount: number; date: string; frequency?: Frequency } | null
  cuts?: Partial<Record<CategoryId, number>>
}

export interface HoldingView {
  id: string
  currency: string
  amount: number
  monthlyIncome: number
  rate: number
  amountConverted: number
  incomeConverted: number
}

export interface PlanBuild {
  input: SimInput
  send: string
  spend: string
  quote: RateQuote
  rateUsed: number
  transfer: TransferQuote
  transferDate: string
  monthlyExpenses: number
  monthlyOtherIncome: number
  holdings: HoldingView[]
  holdingsTotal: number
  cash: number
}

export function buildPlan(state: FinanceState, overrides: Overrides = {}, referenceRates?: Record<string, RateQuote>): PlanBuild {
  const { route, exchange, plan } = state
  const send = route.sendCurrency
  const spend = route.receiveCurrency
  const quote = getRateQuote(send, spend, exchange.customRates, referenceRates)
  const rateUsed = applyMovement(quote.rate, overrides.rateMovePct ?? 0)
  const transfer = quoteTransfer({
    amount: plan.transferAmount,
    rate: rateUsed,
    feePct: exchange.feePct,
    flatFee: exchange.flatFee,
  })

  const monthlyExpenses = CATEGORIES.reduce((sum, category) => {
    const cut = overrides.cuts?.[category.id] ?? 0
    return sum + plan.categories[category.id] * (1 - cut / 100)
  }, 0)

  const holdings: HoldingView[] = plan.holdings.map((holding) => {
    const rate = getRateQuote(holding.currency, spend, exchange.customRates, referenceRates).rate
    return {
      ...holding,
      rate,
      amountConverted: holding.amount * rate,
      incomeConverted: holding.monthlyIncome * rate,
    }
  })
  const holdingsTotal = holdings.reduce((sum, holding) => sum + holding.amountConverted, 0)
  const monthlyOtherIncome = holdings.reduce((sum, holding) => sum + holding.incomeConverted, 0)

  const transferDate = addDays(plan.transferDate, overrides.delayDays ?? 0)
  const payments = plan.payments.flatMap((payment) =>
    expandRecurring([{ label: payment.label, date: payment.date, amount: payment.amount * (payment.kind === 'tuition' ? 1 + (overrides.tuitionIncreasePct ?? 0) / 100 : 1) }], payment.frequency, plan.forecastWeeks * 7, plan.startDate),
  )
  if (overrides.extraExpense) payments.push(overrides.extraExpense)
  const scheduledTransfers = expandRecurring(
    [{ label: 'Family transfer', date: plan.transferDate, amount: transfer.net }],
    plan.transferFrequency,
    plan.forecastWeeks * 7,
    plan.startDate,
  ).map((item) => ({ ...item, date: addDays(item.date, overrides.delayDays ?? 0) }))
  if (overrides.extraIncome && overrides.extraIncome.amount > 0) {
    scheduledTransfers.push(...expandRecurring([overrides.extraIncome], overrides.extraIncome.frequency ?? 'once', plan.forecastWeeks * 7, plan.startDate))
  }

  return {
    input: {
      startDate: plan.startDate,
      horizonDays: plan.forecastWeeks * 7,
      openingBalance: plan.balance + holdingsTotal,
      dailyExpense: (monthlyExpenses * 12) / 365,
      dailyIncome: (monthlyOtherIncome * 12) / 365,
      reserve: plan.reserve,
      transfers: scheduledTransfers,
      payments,
    },
    send,
    spend,
    quote,
    rateUsed,
    transfer,
    transferDate,
    monthlyExpenses,
    monthlyOtherIncome,
    holdings,
    holdingsTotal,
    cash: plan.balance,
  }
}

export function overridesFor(state: FinanceState, scenario: LabScenarioId): Overrides {
  const { lab } = state
  if (scenario === 'late') return { delayDays: lab.lateDays }
  if (scenario === 'rate') return { rateMovePct: lab.rateMove }
  if (scenario === 'expense') {
    return { extraExpense: { label: lab.expenseLabel, amount: lab.expenseAmount, date: lab.expenseDate } }
  }
  if (scenario === 'custom') {
    return {
      delayDays: lab.lateDays,
      rateMovePct: lab.rateMove,
      tuitionIncreasePct: lab.tuitionIncreasePct,
      extraExpense: lab.expenseAmount > 0 ? { label: lab.expenseLabel, amount: lab.expenseAmount, date: lab.expenseDate } : null,
      extraIncome: lab.extraIncomeAmount > 0 ? { label: lab.extraIncomeLabel, amount: lab.extraIncomeAmount, date: lab.extraIncomeDate, frequency: lab.extraIncomeFrequency } : null,
    }
  }
  if (scenario === 'stress') {
    return {
      delayDays: lab.lateDays,
      rateMovePct: -Math.abs(lab.rateMove),
      extraExpense: { label: lab.expenseLabel, amount: lab.expenseAmount, date: lab.expenseDate },
      tuitionIncreasePct: lab.tuitionIncreasePct,
      extraIncome: lab.extraIncomeAmount > 0 ? { label: lab.extraIncomeLabel, amount: lab.extraIncomeAmount, date: lab.extraIncomeDate, frequency: lab.extraIncomeFrequency } : null,
    }
  }
  return {}
}

export interface ScenarioRun {
  id: LabScenarioId
  build: PlanBuild
  sim: SimResult
}

export function runScenario(state: FinanceState, id: LabScenarioId, referenceRates?: Record<string, RateQuote>): ScenarioRun {
  const build = buildPlan(state, overridesFor(state, id), referenceRates)
  return { id, build, sim: simulate(build.input) }
}

export { monthlyTotal }
