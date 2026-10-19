import { daysBetween, isValidIso } from './dates'

/** Convert Frankfurter's quote-per-base rate movement into quote-currency strength vs base. */
export function currencyStrengthChange(firstRate: number, lastRate: number) {
  if (!Number.isFinite(firstRate) || !Number.isFinite(lastRate) || firstRate <= 0 || lastRate <= 0) return null
  return (firstRate / lastRate - 1) * 100
}

/** Frankfurter can include a weekly/monthly bucket before `from`; exclude it. */
export function filterRateRange<T extends { date: string }>(points: T[], from: string, to: string) {
  return points.filter((point) => point.date >= from && point.date <= to)
}

/** Use the closest available published observation on or before a requested date. */
export function closestHistoricalRate<T extends { date: string; rate: number }>(
  points: T[],
  requestedDate: string,
  maxLookbackDays = 7,
) {
  if (!isValidIso(requestedDate)) return null
  return points
    .filter((point) => isValidIso(point.date) && Number.isFinite(point.rate) && point.rate > 0 && point.date <= requestedDate)
    .filter((point) => daysBetween(point.date, requestedDate) <= maxLookbackDays)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
}
