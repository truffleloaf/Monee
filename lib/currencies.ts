import { COUNTRIES, FX_CURRENCIES } from './fx'

export interface Currency {
  code: string
  country: string
  name: string
  symbol: string
  city: string
  lon: number
  lat: number
  /** Illustrative MYR received per 1 unit. Not a live market rate. */
  baseRate: number
  /** A transfer size worth roughly RM 1,800 at the illustrative rate. */
  defaultAmount: number
  /** Illustrative recent move in percent. Not live data. */
  change: number
}

export const HOME = {
  code: 'MYR',
  country: 'Malaysia',
  city: 'Kuala Lumpur',
  lon: 101.69,
  lat: 3.14,
} as const

export const CURRENCIES: Currency[] = [
  { code: 'CNY', country: 'China', name: 'Chinese yuan', symbol: '¥', city: 'Shanghai', lon: 121.47, lat: 31.23, baseRate: 0.6, defaultAmount: 3000, change: 2.4 },
  { code: 'USD', country: 'United States', name: 'US dollar', symbol: '$', city: 'Washington, DC', lon: -77.04, lat: 38.9, baseRate: 4.4, defaultAmount: 400, change: -1.8 },
  { code: 'SGD', country: 'Singapore', name: 'Singapore dollar', symbol: 'S$', city: 'Singapore', lon: 103.82, lat: 1.35, baseRate: 3.3, defaultAmount: 550, change: 0.6 },
  { code: 'IDR', country: 'Indonesia', name: 'Indonesian rupiah', symbol: 'Rp ', city: 'Jakarta', lon: 106.85, lat: -6.2, baseRate: 0.00027, defaultAmount: 6700000, change: -0.9 },
  { code: 'THB', country: 'Thailand', name: 'Thai baht', symbol: '฿', city: 'Bangkok', lon: 100.5, lat: 13.75, baseRate: 0.125, defaultAmount: 14500, change: 1.1 },
  { code: 'VND', country: 'Vietnam', name: 'Vietnamese dong', symbol: '₫', city: 'Hanoi', lon: 105.85, lat: 21.03, baseRate: 0.00018, defaultAmount: 10000000, change: -0.5 },
  { code: 'PHP', country: 'Philippines', name: 'Philippine peso', symbol: '₱', city: 'Manila', lon: 120.98, lat: 14.6, baseRate: 0.078, defaultAmount: 23000, change: 0.2 },
  { code: 'HKD', country: 'Hong Kong', name: 'Hong Kong dollar', symbol: 'HK$', city: 'Hong Kong', lon: 114.17, lat: 22.32, baseRate: 0.56, defaultAmount: 3200, change: -1.8 },
  { code: 'JPY', country: 'Japan', name: 'Japanese yen', symbol: '¥', city: 'Tokyo', lon: 139.69, lat: 35.69, baseRate: 0.029, defaultAmount: 62000, change: -2.7 },
  { code: 'KRW', country: 'South Korea', name: 'South Korean won', symbol: '₩', city: 'Seoul', lon: 126.98, lat: 37.57, baseRate: 0.0032, defaultAmount: 560000, change: -1.3 },
  { code: 'INR', country: 'India', name: 'Indian rupee', symbol: '₹', city: 'New Delhi', lon: 77.2, lat: 28.6, baseRate: 0.052, defaultAmount: 35000, change: -0.4 },
  { code: 'AED', country: 'United Arab Emirates', name: 'UAE dirham', symbol: 'AED ', city: 'Dubai', lon: 55.27, lat: 25.2, baseRate: 1.2, defaultAmount: 1500, change: -1.8 },
  { code: 'GBP', country: 'United Kingdom', name: 'British pound', symbol: '£', city: 'London', lon: -0.13, lat: 51.5, baseRate: 5.6, defaultAmount: 320, change: 0.8 },
  { code: 'EUR', country: 'Eurozone', name: 'euro', symbol: '€', city: 'Frankfurt', lon: 8.68, lat: 50.11, baseRate: 4.8, defaultAmount: 375, change: 0.3 },
  { code: 'AUD', country: 'Australia', name: 'Australian dollar', symbol: 'A$', city: 'Sydney', lon: 151.2, lat: -33.87, baseRate: 2.9, defaultAmount: 620, change: -0.6 },
  { code: 'CAD', country: 'Canada', name: 'Canadian dollar', symbol: 'C$', city: 'Toronto', lon: -79.38, lat: 43.65, baseRate: 3.2, defaultAmount: 560, change: 0.5 },
]

export const GLOBE_CURRENCIES = FX_CURRENCIES.flatMap((currency) => {
  const location = COUNTRIES.find((country) => country.currency === currency.code)
  return location ? [{ code: currency.code, name: currency.name, country: location.name, lon: location.lon, lat: location.lat }] : []
})

export function getCurrency(code: string): Currency {
  return CURRENCIES.find((currency) => currency.code === code) ?? CURRENCIES[0]
}

export function formatRate(rate: number) {
  const digits = rate >= 1 ? 3 : rate >= 0.1 ? 4 : rate >= 0.01 ? 5 : 6
  return rate.toFixed(digits)
}

export function formatSource(amount: number, code: string) {
  const { symbol } = getCurrency(code)
  return `${symbol}${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function formatChange(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(1)}%`
}

/** The rate a move of `change` percent implies it started from. */
export function previousRate(rate: number, change: number) {
  return rate / (1 + change / 100)
}
