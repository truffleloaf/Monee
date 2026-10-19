import { formatSource, getCurrency } from './currencies'

export const DEMO = {
  startBalance: 8000,
  monthlyExpenses: 2000,
  weeklyExpenses: 500,
  feePct: 0.005,
  transferWeeks: [2, 6],
  horizon: 8,
} as const

export interface Assumptions {
  currency: string
  /** MYR received per 1 unit of the sending currency. */
  baseRate: number
  /** Size of each family transfer, in the sending currency. */
  transferAmount: number
  reserve: number
  purchaseLabel: string
  purchaseAmount: number
  purchaseWeek: number
  purchaseDelayWeeks: number
  lateDays: number
  /** Size of the simulated currency move, in percent. */
  rateMove: number
}

export function defaultAssumptions(code = 'CNY'): Assumptions {
  const currency = getCurrency(code)
  return {
    currency: currency.code,
    baseRate: currency.baseRate,
    transferAmount: currency.defaultAmount,
    reserve: 1000,
    purchaseLabel: 'laptop',
    purchaseAmount: 6200,
    purchaseWeek: 2,
    purchaseDelayWeeks: 2,
    lateDays: 7,
    rateMove: 5,
  }
}

export type ScenarioId = 'plan' | 'late' | 'rate'
export type RateDirection = 1 | -1

export interface ScenarioOptions {
  scenario: ScenarioId
  rateDirection: RateDirection
  delayPurchase: boolean
  assumptions: Assumptions
}

export interface SimPoint {
  week: number
  balance: number
  breached: boolean
}

export interface SimResult {
  points: SimPoint[]
  lowest: SimPoint
  breaches: number[]
  endBalance: number
  rate: number
  gross: number
  fee: number
  net: number
  reserve: number
  transferWeeks: number[]
  purchaseWeek: number
  lateWeeks: number
}

export function convert(amount: number, rate: number, feePct: number = DEMO.feePct) {
  const gross = amount * rate
  const fee = gross * feePct
  return { gross, fee, net: gross - fee }
}

export function lateWeeksFor(days: number) {
  return Math.max(1, Math.ceil(days / 7))
}

export function simulate(options: ScenarioOptions): SimResult {
  const a = options.assumptions
  const shift = options.rateDirection * a.rateMove
  const rate = options.scenario === 'rate' ? a.baseRate * (1 + shift / 100) : a.baseRate
  const { gross, fee, net } = convert(a.transferAmount, rate)

  const lateWeeks = lateWeeksFor(a.lateDays)
  const transferWeeks: number[] = DEMO.transferWeeks.map((week, index) =>
    options.scenario === 'late' && index === 0 ? week + lateWeeks : week,
  )
  const purchaseWeek = a.purchaseWeek + (options.delayPurchase ? a.purchaseDelayWeeks : 0)

  const points: SimPoint[] = []
  let balance = DEMO.startBalance
  for (let week = 0; week <= DEMO.horizon; week++) {
    if (week > 0) {
      balance -= DEMO.weeklyExpenses
      balance += net * transferWeeks.filter((w) => w === week).length
      if (week === purchaseWeek) balance -= a.purchaseAmount
    }
    points.push({ week, balance, breached: balance < a.reserve })
  }

  const lowest = points.reduce((min, point) => (point.balance < min.balance ? point : min))
  return {
    points,
    lowest,
    breaches: points.filter((p) => p.breached).map((p) => p.week),
    endBalance: points[points.length - 1].balance,
    rate,
    gross,
    fee,
    net,
    reserve: a.reserve,
    transferWeeks,
    purchaseWeek,
    lateWeeks,
  }
}

export function formatMyr(value: number, decimals = 0) {
  const sign = value < 0 ? '−' : ''
  return `${sign}RM ${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function formatDelta(value: number, decimals = 0) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}RM ${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export interface Insight {
  title: string
  body: string
  facts: string[]
  target: ScenarioId
}

export function buildInsight(options: ScenarioOptions): Insight {
  const a = options.assumptions
  const currency = getCurrency(a.currency)
  const target: ScenarioId = options.scenario === 'plan' ? 'late' : options.scenario
  const delay = options.delayPurchase
  const plan = simulate({ ...options, scenario: 'plan' })
  const sim = simulate({ ...options, scenario: target })
  const reserve = formatMyr(a.reserve)
  const purchase = `${formatMyr(a.purchaseAmount)} ${a.purchaseLabel}`
  const transfer = formatSource(a.transferAmount, a.currency)

  if (target === 'late') {
    const lowest = formatMyr(sim.lowest.balance)
    const days = plural(a.lateDays, 'day')
    const facts = [
      `Lowest balance ${lowest} · week ${sim.lowest.week}`,
      `Safety reserve ${reserve}`,
      `Transfer ${days} late`,
    ]
    if (a.lateDays % 7 !== 0) {
      facts.push(`Modelled as ${plural(sim.lateWeeks, 'week')}`)
    }

    if (sim.breaches.length > 0) {
      const gap = formatMyr(a.reserve - sim.lowest.balance)
      const alt = simulate({ ...options, scenario: 'late', delayPurchase: true })
      let fix = ''
      if (delay) {
        fix = ` Even with the ${a.purchaseLabel} delayed to week ${sim.purchaseWeek}, a gap remains.`
      } else if (alt.breaches.length === 0) {
        fix = ` Moving the ${purchase} purchase from week ${a.purchaseWeek} to week ${a.purchaseWeek + a.purchaseDelayWeeks} would keep your lowest balance at ${formatMyr(alt.lowest.balance)}, back above your reserve.`
      } else {
        fix = ` Delaying the ${a.purchaseLabel} on its own would not close the gap.`
      }
      return {
        title: 'One thing to consider',
        body: `If your family transfer of ${transfer} arrives ${days} late, your available balance may fall to ${lowest} in week ${sim.lowest.week}, which is ${gap} below your ${reserve} safety reserve.${fix}`,
        facts,
        target,
      }
    }
    return {
      title: 'One thing to consider',
      body: `If your family transfer of ${transfer} arrives ${days} late, your lowest balance would be ${lowest} in week ${sim.lowest.week}. That stays ${formatMyr(sim.lowest.balance - a.reserve)} above your ${reserve} safety reserve${delay ? `, with the ${a.purchaseLabel} moved to week ${sim.purchaseWeek}` : ''}.`,
      facts,
      target,
    }
  }

  const strengthens = options.rateDirection > 0
  const sign = strengthens ? '+' : '−'
  const delta = sim.net - plan.net
  const lowestDelta = sim.lowest.balance - plan.lowest.balance
  const impact = strengthens
    ? `That helps when you receive ${currency.code}, but it would raise the cost of anything you pay in ${currency.code}.`
    : `That reduces what you receive in MYR, but it would lower the cost of anything you pay in ${currency.code}.`
  return {
    title: 'One thing to consider',
    body: `If the ${currency.name} ${strengthens ? 'strengthens' : 'weakens'} ${a.rateMove}% against the ringgit, each ${transfer} transfer would convert to ${formatMyr(sim.net, 2)} instead of ${formatMyr(plan.net, 2)} (${formatDelta(delta, 2)}). Your lowest balance would move by ${formatDelta(lowestDelta, 2)} to ${formatMyr(sim.lowest.balance, 2)}. ${impact}`,
    facts: [
      `${currency.code} ${sign}${a.rateMove}%`,
      `Per transfer ${formatDelta(delta, 2)}`,
      `Safety reserve ${reserve}`,
    ],
    target,
  }
}
