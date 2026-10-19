import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { after } from 'node:test'

const output = join(tmpdir(), `monee-finance-test-${process.pid}`)
execFileSync(join(process.cwd(), 'node_modules/.bin/tsc'), [
  '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
  '--outDir', output, '--skipLibCheck', 'lib/plan.ts', 'lib/finance-state.ts', 'lib/fx.ts', 'lib/dates.ts', 'lib/climate.ts', 'lib/currency-decision.ts',
], { stdio: 'inherit' })
const require = createRequire(import.meta.url)
const { createDefaultState, sanitizeState } = require(join(output, 'finance-state.js'))
const { buildPlan, simulate, runScenario } = require(join(output, 'plan.js'))
const { quoteTransfer } = require(join(output, 'fx.js'))
const { getRateQuote, applyMovement } = require(join(output, 'fx.js'))
const { isValidIso } = require(join(output, 'dates.js'))
const { currencyStrengthChange, closestHistoricalRate, filterRateRange } = require(join(output, 'climate.js'))
const { compareCurrencyStrategies } = require(join(output, 'currency-decision.js'))
const { parseMinorUnits, minorToMajor, walletBalances, validateWalletLedger } = require(join(output, 'wallet.js'))
after(() => rmSync(output, { recursive: true, force: true }))

test('date validation rejects impossible calendar dates', () => {
  assert.equal(isValidIso('2024-02-29'), true)
  assert.equal(isValidIso('2025-02-29'), false)
  assert.equal(isValidIso('2026-13-01'), false)
})

test('transfer fees are calculated after conversion and capped at the gross amount', () => {
  assert.deepEqual(quoteTransfer({ amount: 100, rate: 2, feePct: 10, flatFee: 5 }), {
    gross: 200, percentFee: 20, flatFee: 5, fee: 25, net: 175,
  })
  assert.equal(quoteTransfer({ amount: 1, rate: 2, feePct: 10, flatFee: 8 }).net, 0)
})

test('exchange-rate direction and percentage moves are consistent', () => {
  const cnyToMyr = getRateQuote('CNY', 'MYR').rate
  const myrToCny = getRateQuote('MYR', 'CNY').rate
  assert.ok(Math.abs(cnyToMyr * myrToCny - 1) < 1e-10)
  assert.ok(applyMovement(cnyToMyr, 5) > cnyToMyr)
  assert.ok(applyMovement(cnyToMyr, -5) < cnyToMyr)
})

test('Frankfurter reference rates preserve pair direction and drive Future Lab scenarios', () => {
  const referenceRates = {
    'MYR>CNY': { rate: 1.62, source: 'frankfurter', label: 'Frankfurter reference rate', updatedAt: '2026-10-13' },
    'CNY>MYR': { rate: 1 / 1.62, source: 'frankfurter', label: 'Frankfurter reference rate', updatedAt: '2026-10-13' },
  }
  assert.equal(getRateQuote('MYR', 'CNY', {}, referenceRates).rate, 1.62)
  assert.ok(Math.abs(getRateQuote('CNY', 'MYR', {}, referenceRates).rate - 1 / 1.62) < 1e-12)
  assert.equal(quoteTransfer({ amount: 100, rate: getRateQuote('MYR', 'CNY', {}, referenceRates).rate, feePct: 0, flatFee: 0 }).net, 162)

  const state = createDefaultState('2026-10-01')
  state.route.sendCurrency = 'MYR'
  state.route.receiveCurrency = 'CNY'
  state.exchange.feePct = 0
  state.exchange.flatFee = 0
  state.lab.rateMove = 5
  const baseline = runScenario(state, 'baseline', referenceRates)
  const moved = runScenario(state, 'rate', referenceRates)
  assert.equal(baseline.build.quote.rate, 1.62)
  assert.ok(Math.abs(moved.build.rateUsed - 1.701) < 1e-12)
  assert.equal(moved.build.quote.updatedAt, '2026-10-13')
})

test('Currency Climate inverts quote-per-base movement to describe currency strength correctly', () => {
  // 1 MYR buys 1.60 CNY, then only 1.52 CNY: CNY strengthened against MYR.
  assert.ok(Math.abs(currencyStrengthChange(1.6, 1.52) - 5.26315789473685) < 1e-10)
  // More CNY per MYR means the CNY weakened against MYR.
  assert.ok(Math.abs(currencyStrengthChange(1.6, 1.68) + 4.761904761904766) < 1e-10)
  assert.equal(currencyStrengthChange(0, 1), null)
})

test('historical payment comparisons use the closest preceding published observation', () => {
  const points = [
    { date: '2026-10-09', rate: 1.5 },
    { date: '2026-10-12', rate: 1.6 },
  ]
  assert.equal(closestHistoricalRate(points, '2026-10-11').date, '2026-10-09')
  assert.equal(closestHistoricalRate(points, '2026-10-20'), null)
  assert.equal(closestHistoricalRate(points, '2026-02-31'), null)
})

test('grouped Frankfurter ranges exclude bucket dates outside the requested window', () => {
  const points = [
    { date: '2026-08-27', rate: 1.5 },
    { date: '2026-09-03', rate: 1.6 },
    { date: '2026-10-08', rate: 1.7 },
    { date: '2026-10-15', rate: 1.8 },
  ]
  assert.deepEqual(filterRateRange(points, '2026-09-01', '2026-10-14'), points.slice(1, 3))
})

test('wallet amounts are parsed into integer minor units without decimal multiplication drift', () => {
  assert.equal(parseMinorUnits('12.34', 'MYR'), 1234)
  assert.equal(parseMinorUnits('12.3', 'MYR'), 1230)
  assert.equal(parseMinorUnits('12.345', 'MYR'), null)
  assert.equal(parseMinorUnits('1.25', 'JPY'), null)
  assert.equal(minorToMajor(1234, 'MYR'), 12.34)
})

test('internal conversions are one two-sided ledger entry and balance each currency once', () => {
  const openings = { MYR: 10000, CNY: 0 }
  const conversion = { id: 'convert-1', description: 'Simulated conversion', date: '2026-10-01', category: 'other', type: 'conversion', currency: 'MYR', amountMinor: 2500, toCurrency: 'CNY', receivedMinor: 3800 }
  assert.deepEqual(walletBalances(openings, [conversion]), { MYR: 7500, CNY: 3800 })
  assert.deepEqual(validateWalletLedger(openings, [conversion]), { ok: true })
})

test('wallet edits recalculate balances and reject an expense that would overdraw an account', () => {
  const openings = { MYR: 10000 }
  const income = { id: 'income-1', description: 'Part-time pay', date: '2026-10-01', category: 'other', type: 'income', currency: 'MYR', amountMinor: 5000 }
  const expense = { id: 'expense-1', description: 'Food', date: '2026-10-02', category: 'food', type: 'expense', currency: 'MYR', amountMinor: 2500 }
  assert.equal(walletBalances(openings, [income, expense]).MYR, 12500)
  assert.deepEqual(validateWalletLedger(openings, [income, { ...expense, amountMinor: 16000 }]), { ok: false, message: 'This entry would take your MYR wallet below zero.' })
  assert.equal(walletBalances(openings, [income]).MYR, 15000)
})

test('weekly and biweekly transfers repeat on the expected dates', () => {
  for (const [frequency, expected] of [['weekly', 4], ['biweekly', 2]]) {
    const state = createDefaultState('2026-01-01')
    state.plan.startDate = '2026-01-01'
    state.plan.transferDate = '2026-01-02'
    state.plan.transferFrequency = frequency
    state.plan.forecastWeeks = 4
    const plan = buildPlan(state)
    assert.equal(plan.input.transfers.length, expected)
    assert.equal(simulate(plan.input).points.length, 29)
  }
})

test('monthly recurring payments clamp month ends and are included in the forecast', () => {
  const state = createDefaultState('2026-01-01')
  state.plan.startDate = '2026-01-01'
  state.plan.forecastWeeks = 13
  state.plan.payments = [{ id: 'rent', label: 'Rent', amount: 100, date: '2026-01-31', kind: 'other', frequency: 'monthly' }]
  const result = simulate(buildPlan(state).input)
  const rentEvents = result.points.flatMap((point) => point.events).filter((event) => event.label === 'Rent')
  assert.equal(rentEvents.length, 3)
})

test('first reserve breach reflects daily expenses and scheduled payments', () => {
  const state = createDefaultState('2026-01-01')
  state.plan.balance = 500
  state.plan.reserve = 450
  state.plan.transferDate = '2027-01-01'
  state.plan.forecastWeeks = 4
  const result = simulate(buildPlan(state).input)
  assert.ok(result.firstBreach)
  assert.ok(result.firstBreach.balance < state.plan.reserve)
  assert.equal(result.final.day, 28)
})

test('combined stress scenario applies delay, weaker rate, and extra expense together', () => {
  const state = createDefaultState('2026-01-01')
  state.plan.startDate = '2026-01-01'
  state.plan.transferDate = '2026-01-10'
  state.lab.lateDays = 14
  state.lab.rateMove = 5
  state.lab.expenseDate = '2026-01-20'
  const baseline = runScenario(state, 'baseline')
  const stress = runScenario(state, 'stress')
  assert.equal(stress.build.transferDate, '2026-01-24')
  assert.ok(stress.build.transfer.net < baseline.build.transfer.net)
  assert.ok(stress.sim.points.some((point) => point.events.some((event) => event.label === state.lab.expenseLabel)))
})

test('custom Future Lab scenarios apply tuition increases and recurring part-time income', () => {
  const state = createDefaultState('2026-01-01')
  state.plan.startDate = '2026-01-01'
  state.plan.forecastWeeks = 4
  state.lab.tuitionIncreasePct = 10
  state.lab.extraIncomeAmount = 100
  state.lab.extraIncomeDate = '2026-01-02'
  state.lab.extraIncomeFrequency = 'weekly'
  const referenceRates = { 'CNY>MYR': { rate: 0.62, source: 'frankfurter', label: 'Reference', updatedAt: '2026-01-01' } }
  const custom = runScenario(state, 'custom', referenceRates)
  assert.ok(Math.abs(custom.build.input.payments.find((payment) => payment.label === 'Tuition instalment').amount - 5720) < 1e-9)
  assert.equal(custom.build.input.transfers.filter((transfer) => transfer.label === 'Part-time income').length, 4)
  const withoutPartTimeIncome = runScenario({ ...state, lab: { ...state.lab, extraIncomeAmount: 0 } }, 'custom', referenceRates)
  assert.ok(custom.sim.final.balance > withoutPartTimeIncome.sim.final.balance)
})

test('saved actual transactions are sanitized and retained', () => {
  const base = createDefaultState('2026-01-01')
  const restored = sanitizeState({ ...base, transactions: [{ id: 'a', description: 'Food', amount: 20, currency: 'MYR', date: '2026-01-01', type: 'expense', category: 'food' }] }, '2026-01-01')
  assert.equal(restored.transactions.length, 1)
  assert.equal(restored.transactions[0].amount, 20)
})

test('named scenario snapshots can be restored without restoring transactions from a different account area', () => {
  const base = createDefaultState('2026-01-01')
  const saved = { id: 'saved-1', name: 'Tuition shock', route: base.route, exchange: base.exchange, plan: base.plan, lab: { ...base.lab, scenario: 'stress' } }
  const restored = sanitizeState({ ...base, savedScenarios: [saved], transactions: [] }, '2026-01-01')
  assert.equal(restored.savedScenarios[0].name, 'Tuition shock')
  assert.equal(restored.savedScenarios[0].lab.scenario, 'stress')
  assert.deepEqual(restored.transactions, [])
})

test('currency strategies account for fees on each gradual instalment and payment coverage', () => {
  const result = compareCurrencyStrategies({ sourceAmount: 1000, paymentAmount: 500, availableTargetFunds: 0, emergencyReserve: 100, daysUntilPayment: 45, rate: 2, feePct: 1, flatFee: 5 })
  assert.equal(result.recommendation.strategy, 'gradual')
  assert.ok(result.gradual.stable.fees > result.now.fees)
  assert.equal(result.now.covered, true)
  assert.equal(result.wait.rateDownFive.afterPayment < result.wait.rateUpFive.afterPayment, true)
})
