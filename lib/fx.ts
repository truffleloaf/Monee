export interface CurrencyInfo {
  /** ISO 4217 code. */
  code: string
  name: string
  symbol: string
  /** Decimal places used when displaying amounts. */
  decimals: number
  /** Illustrative value of one unit in US dollars. Not a market price. */
  usdValue: number
}

export interface Country {
  /** ISO 3166-1 alpha-2 code. */
  code: string
  name: string
  /** Primary currency suggested when the country is chosen. */
  currency: string
  lon: number
  lat: number
}

export const FX_CURRENCIES: CurrencyInfo[] = [
  { code: 'MYR', name: 'Malaysian ringgit', symbol: 'RM ', decimals: 2, usdValue: 0.222 },
  { code: 'CNY', name: 'Chinese yuan', symbol: 'CN¥', decimals: 2, usdValue: 0.1332 },
  { code: 'SGD', name: 'Singapore dollar', symbol: 'S$', decimals: 2, usdValue: 0.74 },
  { code: 'USD', name: 'US dollar', symbol: '$', decimals: 2, usdValue: 1 },
  { code: 'GBP', name: 'British pound', symbol: '£', decimals: 2, usdValue: 1.27 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, usdValue: 1.08 },
  { code: 'AUD', name: 'Australian dollar', symbol: 'A$', decimals: 2, usdValue: 0.65 },
  { code: 'JPY', name: 'Japanese yen', symbol: '¥', decimals: 0, usdValue: 0.0066 },
  { code: 'KRW', name: 'South Korean won', symbol: '₩', decimals: 0, usdValue: 0.00073 },
  { code: 'THB', name: 'Thai baht', symbol: '฿', decimals: 2, usdValue: 0.028 },
  { code: 'IDR', name: 'Indonesian rupiah', symbol: 'Rp ', decimals: 0, usdValue: 0.000062 },
  { code: 'INR', name: 'Indian rupee', symbol: '₹', decimals: 2, usdValue: 0.012 },
  { code: 'CAD', name: 'Canadian dollar', symbol: 'C$', decimals: 2, usdValue: 0.73 },
  { code: 'NZD', name: 'New Zealand dollar', symbol: 'NZ$', decimals: 2, usdValue: 0.6 },
  { code: 'CHF', name: 'Swiss franc', symbol: 'CHF ', decimals: 2, usdValue: 1.12 },
  { code: 'HKD', name: 'Hong Kong dollar', symbol: 'HK$', decimals: 2, usdValue: 0.128 },
  { code: 'TWD', name: 'New Taiwan dollar', symbol: 'NT$', decimals: 2, usdValue: 0.031 },
  { code: 'VND', name: 'Vietnamese dong', symbol: '₫', decimals: 0, usdValue: 0.00004 },
  { code: 'PHP', name: 'Philippine peso', symbol: '₱', decimals: 2, usdValue: 0.0175 },
  { code: 'PKR', name: 'Pakistani rupee', symbol: 'Rs ', decimals: 2, usdValue: 0.0036 },
  { code: 'BDT', name: 'Bangladeshi taka', symbol: '৳', decimals: 2, usdValue: 0.0083 },
  { code: 'LKR', name: 'Sri Lankan rupee', symbol: 'LKR ', decimals: 2, usdValue: 0.0033 },
  { code: 'NPR', name: 'Nepalese rupee', symbol: 'NPR ', decimals: 2, usdValue: 0.0075 },
  { code: 'AED', name: 'UAE dirham', symbol: 'AED ', decimals: 2, usdValue: 0.2723 },
  { code: 'SAR', name: 'Saudi riyal', symbol: 'SAR ', decimals: 2, usdValue: 0.2667 },
  { code: 'QAR', name: 'Qatari riyal', symbol: 'QAR ', decimals: 2, usdValue: 0.2747 },
  { code: 'TRY', name: 'Turkish lira', symbol: '₺', decimals: 2, usdValue: 0.03 },
  { code: 'EGP', name: 'Egyptian pound', symbol: 'E£', decimals: 2, usdValue: 0.02 },
  { code: 'NGN', name: 'Nigerian naira', symbol: '₦', decimals: 2, usdValue: 0.00065 },
  { code: 'KES', name: 'Kenyan shilling', symbol: 'KSh ', decimals: 2, usdValue: 0.0077 },
  { code: 'GHS', name: 'Ghanaian cedi', symbol: 'GH₵', decimals: 2, usdValue: 0.065 },
  { code: 'ZAR', name: 'South African rand', symbol: 'R ', decimals: 2, usdValue: 0.054 },
  { code: 'BRL', name: 'Brazilian real', symbol: 'R$', decimals: 2, usdValue: 0.18 },
  { code: 'MXN', name: 'Mexican peso', symbol: 'MX$', decimals: 2, usdValue: 0.052 },
  { code: 'CLP', name: 'Chilean peso', symbol: 'CL$', decimals: 0, usdValue: 0.00105 },
  { code: 'COP', name: 'Colombian peso', symbol: 'COL$', decimals: 0, usdValue: 0.00024 },
  { code: 'SEK', name: 'Swedish krona', symbol: 'SEK ', decimals: 2, usdValue: 0.095 },
  { code: 'NOK', name: 'Norwegian krone', symbol: 'NOK ', decimals: 2, usdValue: 0.093 },
  { code: 'DKK', name: 'Danish krone', symbol: 'DKK ', decimals: 2, usdValue: 0.145 },
  { code: 'PLN', name: 'Polish złoty', symbol: 'zł ', decimals: 2, usdValue: 0.25 },
  { code: 'CZK', name: 'Czech koruna', symbol: 'Kč ', decimals: 2, usdValue: 0.043 },
  { code: 'ILS', name: 'Israeli shekel', symbol: '₪', decimals: 2, usdValue: 0.27 },
]

export const COUNTRIES: Country[] = [
  { code: 'MY', name: 'Malaysia', currency: 'MYR', lon: 101.69, lat: 3.14 },
  { code: 'CN', name: 'China', currency: 'CNY', lon: 116.41, lat: 39.9 },
  { code: 'SG', name: 'Singapore', currency: 'SGD', lon: 103.82, lat: 1.35 },
  { code: 'US', name: 'United States', currency: 'USD', lon: -77.04, lat: 38.9 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', lon: -0.13, lat: 51.5 },
  { code: 'AU', name: 'Australia', currency: 'AUD', lon: 149.13, lat: -35.28 },
  { code: 'JP', name: 'Japan', currency: 'JPY', lon: 139.69, lat: 35.69 },
  { code: 'KR', name: 'South Korea', currency: 'KRW', lon: 126.98, lat: 37.57 },
  { code: 'TH', name: 'Thailand', currency: 'THB', lon: 100.5, lat: 13.75 },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', lon: 106.85, lat: -6.2 },
  { code: 'IN', name: 'India', currency: 'INR', lon: 77.2, lat: 28.6 },
  { code: 'CA', name: 'Canada', currency: 'CAD', lon: -75.7, lat: 45.42 },
  { code: 'EU', name: 'Eurozone', currency: 'EUR', lon: 8.68, lat: 50.11 },
  { code: 'DE', name: 'Germany', currency: 'EUR', lon: 13.4, lat: 52.52 },
  { code: 'FR', name: 'France', currency: 'EUR', lon: 2.35, lat: 48.86 },
  { code: 'ES', name: 'Spain', currency: 'EUR', lon: -3.7, lat: 40.42 },
  { code: 'IT', name: 'Italy', currency: 'EUR', lon: 12.5, lat: 41.9 },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', lon: 4.9, lat: 52.37 },
  { code: 'IE', name: 'Ireland', currency: 'EUR', lon: -6.26, lat: 53.35 },
  { code: 'PT', name: 'Portugal', currency: 'EUR', lon: -9.14, lat: 38.72 },
  { code: 'AT', name: 'Austria', currency: 'EUR', lon: 16.37, lat: 48.21 },
  { code: 'BE', name: 'Belgium', currency: 'EUR', lon: 4.35, lat: 50.85 },
  { code: 'FI', name: 'Finland', currency: 'EUR', lon: 24.94, lat: 60.17 },
  { code: 'GR', name: 'Greece', currency: 'EUR', lon: 23.73, lat: 37.98 },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', lon: 174.78, lat: -41.29 },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', lon: 7.45, lat: 46.95 },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD', lon: 114.17, lat: 22.32 },
  { code: 'TW', name: 'Taiwan', currency: 'TWD', lon: 121.56, lat: 25.03 },
  { code: 'VN', name: 'Vietnam', currency: 'VND', lon: 105.85, lat: 21.03 },
  { code: 'PH', name: 'Philippines', currency: 'PHP', lon: 120.98, lat: 14.6 },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', lon: 73.05, lat: 33.69 },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', lon: 90.41, lat: 23.81 },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', lon: 79.86, lat: 6.93 },
  { code: 'NP', name: 'Nepal', currency: 'NPR', lon: 85.32, lat: 27.72 },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', lon: 54.37, lat: 24.47 },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', lon: 46.68, lat: 24.71 },
  { code: 'QA', name: 'Qatar', currency: 'QAR', lon: 51.53, lat: 25.29 },
  { code: 'TR', name: 'Türkiye', currency: 'TRY', lon: 32.86, lat: 39.93 },
  { code: 'EG', name: 'Egypt', currency: 'EGP', lon: 31.24, lat: 30.04 },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', lon: 7.4, lat: 9.08 },
  { code: 'KE', name: 'Kenya', currency: 'KES', lon: 36.82, lat: -1.29 },
  { code: 'GH', name: 'Ghana', currency: 'GHS', lon: -0.19, lat: 5.6 },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', lon: 28.19, lat: -25.75 },
  { code: 'BR', name: 'Brazil', currency: 'BRL', lon: -47.88, lat: -15.79 },
  { code: 'MX', name: 'Mexico', currency: 'MXN', lon: -99.13, lat: 19.43 },
  { code: 'CL', name: 'Chile', currency: 'CLP', lon: -70.65, lat: -33.45 },
  { code: 'CO', name: 'Colombia', currency: 'COP', lon: -74.07, lat: 4.71 },
  { code: 'SE', name: 'Sweden', currency: 'SEK', lon: 18.07, lat: 59.33 },
  { code: 'NO', name: 'Norway', currency: 'NOK', lon: 10.75, lat: 59.91 },
  { code: 'DK', name: 'Denmark', currency: 'DKK', lon: 12.57, lat: 55.68 },
  { code: 'PL', name: 'Poland', currency: 'PLN', lon: 21.01, lat: 52.23 },
  { code: 'CZ', name: 'Czechia', currency: 'CZK', lon: 14.42, lat: 50.08 },
  { code: 'IL', name: 'Israel', currency: 'ILS', lon: 35.22, lat: 31.77 },
]

const currencyByCode = new Map(FX_CURRENCIES.map((currency) => [currency.code, currency]))
const countryByCode = new Map(COUNTRIES.map((country) => [country.code, country]))

export function hasCurrency(code: string) {
  return currencyByCode.has(code) || /^[A-Z]{3}$/.test(code)
}

export function hasCountry(code: string) {
  return countryByCode.has(code)
}

export function getCurrencyInfo(code: string): CurrencyInfo {
  const known = currencyByCode.get(code)
  if (known) return known
  try {
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: code })
    const symbol = formatter.formatToParts(1).find((part) => part.type === 'currency')?.value ?? code
    return { code, name: code, symbol: `${symbol} `, decimals: formatter.resolvedOptions().maximumFractionDigits ?? 2, usdValue: Number.NaN }
  } catch {
    return { code, name: code, symbol: `${code} `, decimals: 2, usdValue: Number.NaN }
  }
}

export function getCountry(code: string): Country {
  return countryByCode.get(code) ?? COUNTRIES[0]
}

export function countriesUsing(currency: string) {
  return COUNTRIES.filter((country) => country.currency === currency)
}

/**
 * Illustrative recent move versus a USD basket, in percent.
 * Positive = gaining value. Not live market data.
 */
const ILLUSTRATIVE_MOVES: Record<string, number> = {
  MYR: 0.4,
  CNY: 2.4,
  SGD: 0.6,
  USD: -1.8,
  GBP: 0.8,
  EUR: 0.3,
  AUD: -0.6,
  JPY: -2.7,
  KRW: -1.3,
  THB: 1.1,
  IDR: -0.9,
  INR: -0.4,
  CAD: 0.5,
  NZD: -0.2,
  CHF: 0.7,
  HKD: -1.8,
  TWD: -0.3,
  VND: -0.5,
  PHP: 0.2,
  PKR: -1.1,
  BDT: -0.7,
  LKR: -1.4,
  NPR: -0.4,
  AED: -1.8,
  SAR: -0.1,
  QAR: -0.1,
  TRY: -3.2,
  EGP: -1.6,
  NGN: -2.1,
  KES: -0.8,
  GHS: -1.9,
  ZAR: -1.2,
  BRL: 0.4,
  MXN: -0.6,
  CLP: -0.9,
  COP: -1.0,
  SEK: -0.3,
  NOK: -0.4,
  DKK: 0.2,
  PLN: 0.5,
  CZK: 0.1,
  ILS: 0.6,
}

export function illustrativeMove(code: string) {
  return ILLUSTRATIVE_MOVES[code] ?? 0
}

/* ---------- Exchange rates ---------- */

export type RateSource = 'illustrative' | 'custom' | 'frankfurter' | 'unavailable' | 'live'

export interface RateQuote {
  /** 1 unit of the sending currency = `rate` units of the receiving currency. */
  rate: number
  source: RateSource
  label: string
  /** Provider observation date (YYYY-MM-DD), not the time we retrieved it. */
  updatedAt: string | null
  /** Client retrieval time, kept separate from the provider's observation date. */
  fetchedAt?: string | null
}

export const pairKey = (from: string, to: string) => `${from}>${to}`

/** Illustrative cross rate derived from the simulated USD values. */
export function illustrativeRate(from: string, to: string) {
  const fromValue = getCurrencyInfo(from).usdValue
  const toValue = getCurrencyInfo(to).usdValue
  return Number.isFinite(fromValue) && Number.isFinite(toValue) && toValue !== 0 ? fromValue / toValue : Number.NaN
}

/**
 * The single place every page asks for a rate. A live provider can be added here
 * later and return `source: 'live'` with its timestamp; until then nothing in the
 * app presents a rate as live.
 */
export function getRateQuote(
  from: string,
  to: string,
  customRates: Record<string, number> = {},
  referenceRates?: Record<string, RateQuote>,
): RateQuote {
  const custom = customRates[pairKey(from, to)]
  if (custom && custom > 0) {
    return { rate: custom, source: 'custom', label: 'Your custom rate', updatedAt: null }
  }
  const reference = referenceRates?.[pairKey(from, to)]
  if (reference) return reference
  if (referenceRates) {
    return { rate: 0, source: 'unavailable', label: 'Frankfurter rate unavailable', updatedAt: null }
  }
  return {
    rate: illustrativeRate(from, to),
    source: 'illustrative',
    label: 'Illustrative rate, not a live market rate',
    updatedAt: null,
  }
}

export function applyMovement(rate: number, percent: number) {
  return rate * (1 + percent / 100)
}

export interface TransferQuote {
  gross: number
  percentFee: number
  flatFee: number
  fee: number
  net: number
}

/**
 * Converted amount = amount x rate.
 * Final amount = converted amount - receiving-currency fees.
 */
export function quoteTransfer(input: {
  amount: number
  rate: number
  feePct: number
  flatFee: number
}): TransferQuote {
  const gross = input.amount * input.rate
  const percentFee = gross * (input.feePct / 100)
  const fee = Math.min(gross, percentFee + input.flatFee)
  return { gross, percentFee, flatFee: input.flatFee, fee, net: gross - fee }
}

/* ---------- Formatting ---------- */

export function formatNumber(value: number, decimals: number) {
  return Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatMoney(
  value: number,
  code: string,
  options: { decimals?: number; sign?: boolean } = {},
) {
  const info = getCurrencyInfo(code)
  const decimals = options.decimals ?? info.decimals
  const rounded = Number(value.toFixed(decimals))
  const sign = rounded < 0 ? '−' : options.sign && rounded > 0 ? '+' : ''
  return `${sign}${info.symbol}${formatNumber(rounded, decimals)}`
}

/** Whole-unit amounts for plan-level figures, keeping cents for tiny values. */
export function formatPlanMoney(value: number, code: string, options: { sign?: boolean } = {}) {
  const decimals = Math.abs(value) < 100 ? getCurrencyInfo(code).decimals : 0
  return formatMoney(value, code, { decimals, sign: options.sign })
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

export function formatFxRate(rate: number) {
  if (!Number.isFinite(rate)) return '0'
  const digits = rate >= 100 ? 2 : rate >= 0.1 ? 4 : rate >= 0.01 ? 5 : rate >= 0.001 ? 6 : 7
  return rate.toFixed(digits)
}

export function formatPercent(value: number, digits = 1, signed = false) {
  const sign = value < 0 ? '−' : signed && value > 0 ? '+' : ''
  return `${sign}${Math.abs(value).toFixed(digits)}%`
}

/** Rounds to three significant figures, then to the currency's precision. */
export function roundNice(value: number, decimals: number) {
  if (!Number.isFinite(value) || value === 0) return 0
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(value))) - 2)
  const nice = Math.round(value / magnitude) * magnitude
  const factor = Math.pow(10, decimals)
  return Math.round(nice * factor) / factor
}
