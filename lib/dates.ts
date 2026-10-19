const DAY_MS = 86_400_000

export function parseIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

export function isValidIso(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
}

export function toIso(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number) {
  return toIso(parseIso(iso) + days * DAY_MS)
}

export function daysBetween(from: string, to: string) {
  return Math.round((parseIso(to) - parseIso(from)) / DAY_MS)
}

export function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function formatDate(iso: string) {
  return new Date(parseIso(iso)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function weekOfDay(day: number) {
  return Math.max(1, Math.ceil(day / 7))
}
