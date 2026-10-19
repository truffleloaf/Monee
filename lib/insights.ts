import { formatDate, weekOfDay } from './dates'
import type { ExchangeModel, Sensitivity } from './exchange'
import type { FinanceState, LabScenarioId } from './finance-state'
import {
  formatFxRate,
  formatMoney,
  formatPercent,
  formatPlanMoney,
  getCountry,
  getCurrencyInfo,
} from './fx'
import { RUNWAY_CAP_DAYS, windowStatus, type PlanBuild, type SimResult } from './plan'

export interface Insight {
  title: string
  body: string
  facts: string[]
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function horizonLabel(days: number) {
  const weeks = Math.ceil(days / 7)
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
}

export function exchangeInsight(
  model: ExchangeModel,
  sendCountry: string,
  receiveCountry: string,
  ranked: Sensitivity[],
): Insight {
  const from = getCurrencyInfo(model.from)
  const to = getCurrencyInfo(model.to)
  const origin = getCountry(sendCountry).name
  const destination = getCountry(receiveCountry).name
  const money = (value: number) => formatMoney(value, model.to)
  const sent = formatMoney(model.amount, model.from)
  const largest = ranked[0]
  const vsBase = model.current.net - model.base.net
  const vsBaseText =
    Math.abs(vsBase) < 0.005
      ? 'matches the baseline after fees'
      : `is ${formatMoney(Math.abs(vsBase), model.to)} ${vsBase > 0 ? 'more' : 'less'} than the baseline after fees`

  const moveLine =
    model.shift === 0
      ? `The simulator is at the baseline rate of 1 ${from.code} = ${formatFxRate(model.rate)} ${to.code}.`
      : `A ${formatPercent(model.shift, 1, true)} move of ${from.code} against ${to.code} changes the rate to 1 ${from.code} = ${formatFxRate(model.rate)} ${to.code}.`

  const favourable =
    'A favourable move depends on the conversion direction. If the sending currency strengthens against the receiving currency, the recipient gets more. The same move in the opposite direction would reduce what arrives.'

  const facts = [
    `Recipient ${money(model.current.net)}`,
    `Fees ${money(model.current.fee)}`,
    largest
      ? `${largest.label} moves the result by about ${money(largest.impact)}`
      : `Rate 1 ${from.code} = ${formatFxRate(model.rate)} ${to.code}`,
  ]

  return {
    title: 'What this means for your transfer',
    body: `Sending ${sent} from ${origin} to ${destination} converts to ${money(model.current.gross)} at the current assumption, then ${money(model.current.fee)} in receiving-currency fees leaves ${money(model.current.net)}. ${moveLine} The amount received ${vsBaseText}. ${
      largest
        ? `${largest.label} (${largest.detail.toLowerCase()}) has the largest modelled impact on the final amount.`
        : ''
    } ${favourable}`,
    facts,
  }
}

export function labInsight(args: {
  state: FinanceState
  scenario: LabScenarioId
  base: { build: PlanBuild; sim: SimResult }
  run: { build: PlanBuild; sim: SimResult }
}): Insight {
  const { state, scenario, base, run } = args
  const spend = run.build.spend
  const send = run.build.send
  const money = (value: number) => formatPlanMoney(value, spend)
  const delta = (value: number) => formatPlanMoney(value, spend, { sign: true })
  const reserve = money(state.plan.reserve)
  const lowest = run.sim.lowest
  const lowestText = `${money(lowest.balance)} on ${formatDate(lowest.date)} (week ${weekOfDay(lowest.day)})`
  const finalDelta = run.sim.final.balance - base.sim.final.balance
  const lowestDelta = lowest.balance - base.sim.lowest.balance
  const breach = run.sim.firstBreach
  const facts = [
    `Lowest ${money(lowest.balance)}`,
    `Final ${money(run.sim.final.balance)}`,
    breach ? `Below reserve from ${formatDate(breach.date)}` : `Reserve ${reserve} held`,
  ]

  const period = horizonLabel(run.build.input.horizonDays)
  const reserveLine = breach
    ? `Your balance is below the ${reserve} safety reserve for ${plural(run.sim.breachDays, 'day')}, starting ${formatDate(breach.date)}.`
    : `It stays above your ${reserve} safety reserve for all ${period}.`

  if (scenario === 'baseline') {
    return {
      title: 'Baseline plan',
      body: `With your current assumptions, your balance bottoms out at ${lowestText} and finishes the ${period} forecast at ${money(run.sim.final.balance)}. ${reserveLine}`,
      facts,
    }
  }

  if (scenario === 'late') {
    const days = plural(state.lab.lateDays, 'day')
    const inside = windowStatus(state.plan.startDate, run.build.transferDate, run.build.input.horizonDays) === 'inside'
    const landing = inside
      ? `The delayed transfer still lands inside the ${period} forecast, so the final balance is ${delta(finalDelta)} against the baseline.`
      : `The delayed transfer falls outside the ${period} forecast, so it is not counted in this forecast. The final balance is ${delta(finalDelta)} against the baseline.`
    return {
      title: 'One thing to consider',
      body: `If the family transfer of ${formatMoney(state.plan.transferAmount, send, { decimals: 0 })} arrives ${days} late, on ${formatDate(run.build.transferDate)} instead of ${formatDate(state.plan.transferDate)}, your lowest balance moves to ${lowestText}, which is ${delta(lowestDelta)} against the baseline. ${reserveLine} ${landing}`,
      facts,
    }
  }

  if (scenario === 'rate') {
    const move = state.lab.rateMove
    const direction = move >= 0 ? 'strengthens' : 'weakens'
    const perTransfer = run.build.transfer.net - base.build.transfer.net
    return {
      title: 'One thing to consider',
      body: `If the ${getCurrencyInfo(send).name} ${direction} ${formatPercent(Math.abs(move))} against the ${getCurrencyInfo(spend).name}, the transfer converts to ${formatMoney(run.build.transfer.net, spend, { decimals: 0 })} after fees instead of ${formatMoney(base.build.transfer.net, spend, { decimals: 0 })} (${delta(perTransfer)}). Your lowest balance changes by ${delta(lowestDelta)} to ${money(lowest.balance)}. ${reserveLine}`,
      facts,
    }
  }

  if (scenario === 'stress') {
    const shortfall = Math.max(0, state.plan.reserve - lowest.balance)
    return {
      title: 'Combined stress test',
      body: `This hypothetical combines a ${state.lab.lateDays}-day transfer delay, a ${formatPercent(Math.abs(state.lab.rateMove))} weakening of ${getCurrencyInfo(send).name}, a ${formatPercent(state.lab.tuitionIncreasePct)} tuition increase, and a ${money(state.lab.expenseAmount)} ${state.lab.expenseLabel} cost${state.lab.extraIncomeAmount > 0 ? ` with ${money(state.lab.extraIncomeAmount)} of additional income per ${state.lab.extraIncomeFrequency} occurrence` : ''}. The lowest balance is ${lowestText}; ${shortfall > 0 ? `that is ${money(shortfall)} below` : 'the balance stays above'} your ${reserve} safety reserve. Ending balance is ${money(run.sim.final.balance)} (${delta(finalDelta)} against baseline). These assumptions are not predictions.`,
      facts,
    }
  }

  if (scenario === 'custom') {
    const impact = lowestDelta < 0 ? `${money(Math.abs(lowestDelta))} lower` : `${money(lowestDelta)} higher`
    return {
      title: 'Custom scenario results',
      body: `Your custom assumptions put the lowest balance at ${lowestText} and the ending balance at ${money(run.sim.final.balance)}. Compared with the baseline, the lowest balance is ${impact}. The scenario includes a ${formatPercent(state.lab.rateMove, 1, true)} hypothetical rate move and a ${formatPercent(state.lab.tuitionIncreasePct)} tuition change. Later rates are assumptions, not predictions.`,
      facts,
    }
  }

  const expense = money(state.lab.expenseAmount)
  return {
    title: 'One thing to consider',
    body: `An unexpected ${expense} cost for "${state.lab.expenseLabel}" on ${formatDate(state.lab.expenseDate)} lowers your final balance by ${money(Math.abs(finalDelta))} to ${money(run.sim.final.balance)}. Your lowest balance becomes ${lowestText}. ${reserveLine}`,
    facts,
  }
}

export function formatRunway(days: number | null) {
  if (days === null) return `${Math.round(RUNWAY_CAP_DAYS / 30)}+ months`
  if (days < 14) return plural(days, 'day')
  if (days < 90) return plural(Math.round(days / 7), 'week')
  return `${(days / 30).toFixed(1)} months`
}

export interface Warning {
  level: 'danger' | 'caution'
  title: string
  detail: string
}

export function healthWarnings(state: FinanceState, build: PlanBuild, sim: SimResult): Warning[] {
  const spend = build.spend
  const money = (value: number) => formatPlanMoney(value, spend)
  const warnings: Warning[] = []
  const weekOfExpenses = build.input.dailyExpense * 7

  for (const check of [...sim.checks].sort((a, b) => a.day - b.day)) {
    const gap = state.plan.reserve - check.balanceAfter
    if (gap > 0) {
      warnings.push({
        level: 'danger',
        title: `${check.label} on ${formatDate(check.date)}`,
        detail: `Paying ${money(check.amount)} leaves ${money(check.balanceAfter)}, which is ${money(gap)} below your reserve.`,
      })
    } else if (check.balanceAfter - state.plan.reserve < weekOfExpenses) {
      warnings.push({
        level: 'caution',
        title: `${check.label} on ${formatDate(check.date)}`,
        detail: `Paying ${money(check.amount)} leaves ${money(check.balanceAfter)}, less than a week of spending above your reserve.`,
      })
    }
  }

  if (sim.firstBreach && !warnings.some((warning) => warning.level === 'danger')) {
    warnings.push({
      level: 'danger',
      title: `Reserve breached on ${formatDate(sim.firstBreach.date)}`,
      detail: `Everyday spending takes your balance below ${money(state.plan.reserve)} with no payment to blame.`,
    })
  }

  const hasTransferInWindow = build.input.transfers.some((transfer) => windowStatus(state.plan.startDate, transfer.date, build.input.horizonDays) === 'inside')
  const transferStatus = windowStatus(state.plan.startDate, build.transferDate, build.input.horizonDays)
  if (!hasTransferInWindow) {
    warnings.push({
      level: 'caution',
      title: `Family transfer is outside the ${horizonLabel(build.input.horizonDays)} forecast`,
      detail:
        transferStatus === 'before'
          ? 'Its date is on or before the plan start, so it is treated as already received and is not counted again.'
          : `It arrives after the ${horizonLabel(build.input.horizonDays)} forecast window, so it does not help the forecast below.`,
    })
  }
  return warnings
}

export function healthInsights(args: {
  state: FinanceState
  build: PlanBuild
  sim: SimResult
  runway: number | null
}): string[] {
  const { state, build, sim, runway } = args
  const spend = build.spend
  const money = (value: number) => formatPlanMoney(value, spend)
  const lines: string[] = []
  const margin = sim.lowest.balance - state.plan.reserve

  lines.push(
    margin >= 0
      ? `Your lowest projected balance is ${money(sim.lowest.balance)} on ${formatDate(sim.lowest.date)}, ${money(margin)} above your safety reserve.`
      : `Your lowest projected balance is ${money(sim.lowest.balance)} on ${formatDate(sim.lowest.date)}, ${money(-margin)} below your safety reserve.`,
  )

  const inside = windowStatus(state.plan.startDate, build.transferDate, build.input.horizonDays) === 'inside'
  if (inside) {
    lines.push(
      `Your family transfer of ${formatMoney(state.plan.transferAmount, build.send, { decimals: 0 })} converts to ${formatMoney(build.transfer.net, spend, { decimals: 0 })} after ${formatMoney(build.transfer.fee, spend, { decimals: 0 })} in fees, and is counted once, on ${formatDate(build.transferDate)}.`,
    )
  }

  if (build.holdings.length > 0) {
    const names = build.holdings.map((holding) => holding.currency).join(', ')
    lines.push(
      `Money held in ${names} is converted to ${spend} at your rate assumptions and adds ${money(build.holdingsTotal)} to what you have today.`,
    )
  }

  lines.push(
    runway === null
      ? `Without any further transfers, your cash stays above the reserve for more than 12 months.`
      : `Without any further transfers, your cash lasts about ${formatRunway(runway)} before it falls below your reserve.`,
  )
  return lines
}
