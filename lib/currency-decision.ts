import { applyMovement, quoteTransfer, type TransferQuote } from './fx'

export interface CurrencyDecisionInput {
  sourceAmount: number
  paymentAmount: number
  availableTargetFunds: number
  emergencyReserve: number
  daysUntilPayment: number
  rate: number
  feePct: number
  flatFee: number
}

export interface DecisionOption {
  received: number
  fees: number
  remainingSource: number
  afterPayment: number
  reserveShortfall: number
  covered: boolean
}

function quote(input: CurrencyDecisionInput, amount: number, movement = 0): TransferQuote {
  return quoteTransfer({ amount, rate: applyMovement(input.rate, movement), feePct: input.feePct, flatFee: input.flatFee })
}

function option(input: CurrencyDecisionInput, amount: number, quotes: TransferQuote[]): DecisionOption {
  const received = quotes.reduce((sum, item) => sum + item.net, 0)
  const fees = quotes.reduce((sum, item) => sum + item.fee, 0)
  const afterPayment = input.availableTargetFunds + received - input.paymentAmount
  return {
    received,
    fees,
    remainingSource: Math.max(0, input.sourceAmount - amount),
    afterPayment,
    reserveShortfall: Math.max(0, input.emergencyReserve - afterPayment),
    covered: input.availableTargetFunds + received >= input.paymentAmount,
  }
}

export function compareCurrencyStrategies(input: CurrencyDecisionInput) {
  const amount = Math.max(0, input.sourceAmount)
  const nowQuote = quote(input, amount)
  const now = option(input, amount, [nowQuote])
  const installments = [amount * 0.5, amount * 0.25, amount * 0.25]
  const gradual = {
    stable: option(input, amount, installments.map((part) => quote(input, part))),
    rateUpFive: option(input, amount, [quote(input, installments[0]), quote(input, installments[1], 5), quote(input, installments[2], 5)]),
    rateDownFive: option(input, amount, [quote(input, installments[0]), quote(input, installments[1], -5), quote(input, installments[2], -5)]),
  }
  const wait = {
    rateUpFive: option(input, amount, [quote(input, amount, 5)]),
    rateDownFive: option(input, amount, [quote(input, amount, -5)]),
  }
  const recommendation = input.daysUntilPayment <= 14
    ? { strategy: 'now' as const, reason: 'The payment is due soon, so converting now reduces the risk of missing the deadline because of a rate move or transfer delay.' }
    : input.availableTargetFunds >= input.paymentAmount + input.emergencyReserve
      ? { strategy: 'wait' as const, reason: 'Your target-currency funds already cover the payment and reserve, so you can afford to monitor rates without relying on a future conversion.' }
      : { strategy: 'gradual' as const, reason: 'Splitting the conversion reduces dependence on one assumed rate while moving some funds toward the payment. The later rates remain hypothetical.' }
  return { now, gradual, wait, recommendation }
}
