import { hasCurrency, getCurrencyInfo } from './fx'
import { isValidIso } from './dates'
import type { WalletEntry } from './finance-state'

export type WalletValidation = { ok: true } | { ok: false; message: string }

/** Parse a user-entered decimal amount directly into integer minor units. */
export function parseMinorUnits(input: string, currency: string): number | null {
  if (!hasCurrency(currency)) return null
  const decimals = getCurrencyInfo(currency).decimals
  const match = input.trim().match(/^(\d+)(?:\.(\d+))?$/)
  if (!match || (match[2]?.length ?? 0) > decimals) return null
  const minor = Number(`${match[1]}${(match[2] ?? '').padEnd(decimals, '0')}`)
  if (!Number.isSafeInteger(minor) || minor <= 0) return null
  return minor
}

export function minorToMajor(minor: number, currency: string) {
  return minor / 10 ** getCurrencyInfo(currency).decimals
}

export function walletBalances(openingMinor: Record<string, number>, entries: WalletEntry[]) {
  const balances = { ...openingMinor }
  const add = (currency: string, delta: number) => { balances[currency] = (balances[currency] ?? 0) + delta }
  for (const entry of entries) {
    if (entry.type === 'income') add(entry.currency, entry.amountMinor)
    else if (entry.type === 'expense') add(entry.currency, -entry.amountMinor)
    else {
      add(entry.currency, -entry.amountMinor)
      add(entry.toCurrency!, entry.receivedMinor!)
    }
  }
  return balances
}

/** Validate the whole ledger in date order so edits cannot create an overdraft. */
export function validateWalletLedger(openingMinor: Record<string, number>, entries: WalletEntry[]): WalletValidation {
  for (const [currency, amount] of Object.entries(openingMinor)) {
    if (!hasCurrency(currency) || !Number.isSafeInteger(amount) || amount < 0) return { ok: false, message: 'Starting balances must use a supported currency and a non-negative amount.' }
  }
  const balances = { ...openingMinor }
  const ordered = entries.map((entry, index) => ({ entry, index })).sort((a, b) => a.entry.date.localeCompare(b.entry.date) || a.index - b.index)
  for (const { entry } of ordered) {
    if (!entry.description.trim() || !isValidIso(entry.date) || !hasCurrency(entry.currency) || !Number.isSafeInteger(entry.amountMinor) || entry.amountMinor <= 0) {
      return { ok: false, message: 'Each entry needs a description, valid date, currency, and positive amount.' }
    }
    if (entry.type === 'income') balances[entry.currency] = (balances[entry.currency] ?? 0) + entry.amountMinor
    else {
      if (entry.type === 'transfer' || entry.type === 'conversion') {
        if (!entry.toCurrency || !hasCurrency(entry.toCurrency) || entry.toCurrency === entry.currency || !Number.isSafeInteger(entry.receivedMinor) || (entry.receivedMinor ?? 0) <= 0) {
          return { ok: false, message: 'Transfers and conversions need a different receiving currency and a positive received amount.' }
        }
      }
      balances[entry.currency] = (balances[entry.currency] ?? 0) - entry.amountMinor
      if (balances[entry.currency] < 0) return { ok: false, message: `This entry would take your ${entry.currency} wallet below zero.` }
      if (entry.type === 'transfer' || entry.type === 'conversion') balances[entry.toCurrency!] = (balances[entry.toCurrency!] ?? 0) + entry.receivedMinor!
    }
    if (Object.values(balances).some((amount) => !Number.isSafeInteger(amount))) return { ok: false, message: 'The resulting wallet balance exceeds the supported limit.' }
  }
  return { ok: true }
}
