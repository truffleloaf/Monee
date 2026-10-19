import type { FinanceState } from './finance-state'
import {
  applyMovement,
  getRateQuote,
  quoteTransfer,
  type RateQuote,
  type TransferQuote,
} from './fx'

export const PRESET_MOVES = [-5, -2, 0, 2, 5] as const

export interface ExchangeModel {
  from: string
  to: string
  amount: number
  feePct: number
  flatFee: number
  quote: RateQuote
  /** Simulated movement of the rate, in percent. */
  shift: number
  /** Effective rate after the simulated movement. */
  rate: number
  base: TransferQuote
  current: TransferQuote
}

export function buildExchangeModel(state: FinanceState, shift: number, referenceRates?: Record<string, RateQuote>): ExchangeModel {
  const { route, exchange } = state
  const quote = getRateQuote(route.sendCurrency, route.receiveCurrency, exchange.customRates, referenceRates)
  const rate = applyMovement(quote.rate, shift)
  const common = { amount: exchange.amount, feePct: exchange.feePct, flatFee: exchange.flatFee }
  return {
    from: route.sendCurrency,
    to: route.receiveCurrency,
    amount: exchange.amount,
    feePct: exchange.feePct,
    flatFee: exchange.flatFee,
    quote,
    shift,
    rate,
    base: quoteTransfer({ ...common, rate: quote.rate }),
    current: quoteTransfer({ ...common, rate }),
  }
}

export interface ScenarioRow {
  id: string
  label: string
  move: number
  rate: number
  transfer: TransferQuote
  /** Final amount received minus the baseline's. */
  diff: number
  active: boolean
}

export function scenarioRows(model: ExchangeModel): ScenarioRow[] {
  const moves: number[] = [...PRESET_MOVES]
  const custom = !moves.includes(model.shift)
  if (custom) moves.push(model.shift)
  moves.sort((a, b) => a - b)

  return moves.map((move) => {
    const rate = applyMovement(model.quote.rate, move)
    const transfer = quoteTransfer({
      amount: model.amount,
      rate,
      feePct: model.feePct,
      flatFee: model.flatFee,
    })
    const isCustom = custom && move === model.shift
    const size = Math.abs(move)
    const label = isCustom
      ? 'Custom'
      : move === 0
        ? 'Baseline'
        : `${model.from} ${move > 0 ? 'strengthens' : 'weakens'} ${size}%`
    return {
      id: `move-${move}`,
      label,
      move,
      rate,
      transfer,
      diff: transfer.net - model.base.net,
      active: move === model.shift,
    }
  })
}

export interface Sensitivity {
  id: string
  label: string
  detail: string
  /** Largest change to the final amount received, in the receiving currency. */
  impact: number
}

export function sensitivities(model: ExchangeModel): Sensitivity[] {
  const common = { amount: model.amount, feePct: model.feePct, flatFee: model.flatFee }
  const baseNet = model.base.net
  const items: Sensitivity[] = [
    {
      id: 'rate',
      label: 'Exchange rate',
      detail: 'A 5% move either way',
      impact: Math.abs(
        quoteTransfer({ ...common, rate: applyMovement(model.quote.rate, 5) }).net - baseNet,
      ),
    },
    {
      id: 'fee',
      label: 'Percentage fee',
      detail: 'One percentage point higher or lower',
      impact: Math.abs(
        quoteTransfer({ ...common, rate: model.quote.rate, feePct: model.feePct + 1 }).net - baseNet,
      ),
    },
    {
      id: 'amount',
      label: 'Amount sent',
      detail: '10% more or less sent',
      impact: Math.abs(
        quoteTransfer({ ...common, amount: model.amount * 1.1, rate: model.quote.rate }).net -
          baseNet,
      ),
    },
  ]
  if (model.flatFee > 0) {
    items.push({
      id: 'flat',
      label: 'Flat fee',
      detail: 'Charged on every transfer',
      impact: model.flatFee,
    })
  }
  return items.sort((a, b) => b.impact - a.impact)
}
