const IST = 'Asia/Kolkata'

export const nowIso = () => new Date().toISOString()

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(new Date())
}

/** Add whole days to a YYYY-MM-DD date. */
export function addDays(ymd: string, days: number): string {
  const d = new Date(ymd + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatIST(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: IST,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDate(ymd: string): string {
  if (!ymd) return '—'
  return new Date(ymd + 'T00:00:00Z').toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const uid = () => Math.random().toString(36).slice(2, 10)

export const ROOMS = Array.from({ length: 12 }, (_, i) => `R${i + 1}`)

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
