import { useSyncExternalStore } from 'react'
import type { AlertType, Booking, DB, Feedback, LogResult } from './types'
import { nowIso, uid } from './util'

const DB_KEY = 'sahyadri.db.v1'
const KEY_KEY = 'sahyadri.geminiKey'

// ---------- seed data (all fictional) ----------

function seed(): DB {
  const bookings: Booking[] = [
    {
      id: 'SH-261002-1',
      createdAt: '2026-10-02T06:10:00.000Z',
      name: 'Kavya Menon',
      email: 'kavya.menon@example.com',
      phone: '98200 10007',
      room: 'R7',
      checkIn: '2026-10-20',
      checkOut: '2026-10-22',
      guests: 2,
      consent: true,
      status: 'CONFIRMED',
      checkedOutAt: '2026-10-22T05:25:00.000Z',
      feedbackRequestedAt: '2026-10-22T05:26:00.000Z',
    },
    {
      id: 'SH-261019-1',
      createdAt: '2026-10-19T09:40:00.000Z',
      name: 'Asha Rao',
      email: 'asha.rao@example.com',
      phone: '98200 10003',
      room: 'R3',
      checkIn: '2026-10-24',
      checkOut: '2026-10-26',
      guests: 2,
      consent: true,
      status: 'CONFIRMED',
    },
    {
      id: 'SH-261021-1',
      createdAt: '2026-10-21T12:05:00.000Z',
      name: 'Meera Kulkarni',
      email: 'meera.kulkarni@example.com',
      phone: '98200 10005',
      room: 'R5',
      checkIn: '2026-11-05',
      checkOut: '2026-11-07',
      guests: 3,
      consent: true,
      status: 'CONFIRMED',
    },
  ]

  const RULE_NO_POST = 'Agent cannot post publicly: reply column is for a human only'
  const feedback: Feedback[] = [
    {
      id: uid(),
      bookingId: 'SH-261002-1',
      guestName: 'Kavya Menon',
      createdAt: '2026-10-22T14:30:00.000Z',
      rating: 3,
      comment: 'Loved the valley view and the poha at breakfast, but the hot water ran out both mornings.',
      maskedComment: 'Loved the valley view and the poha at breakfast, but the hot water ran out both mornings.',
      tag: 'neutral',
      mixed: true,
      positivePoints: ['valley view', 'poha at breakfast'],
      negativePoints: ['hot water ran out both mornings'],
      reason: 'Guest praised view and breakfast but complained about hot water running out.',
      guardrail: [RULE_NO_POST],
      aiStatus: 'OK',
      ownerAlerted: true,
      needsAttention: true,
      replyDraft: '',
    },
    {
      id: uid(),
      bookingId: 'SH-260914-2',
      guestName: 'Rohan Desai (earlier stay, archived)',
      createdAt: '2026-09-17T08:00:00.000Z',
      rating: 5,
      comment: 'Super clean rooms and very warm hosts. Will come back in the monsoon!',
      maskedComment: 'Super clean rooms and very warm hosts. Will come back in the monsoon!',
      tag: 'positive',
      mixed: false,
      positivePoints: ['clean rooms', 'warm hosts'],
      negativePoints: [],
      reason: 'Only praise for cleanliness and hosts; no complaints.',
      guardrail: [RULE_NO_POST],
      aiStatus: 'OK',
      ownerAlerted: false,
      needsAttention: false,
      replyDraft: '',
    },
  ]

  const log = (time: string, bookingId: string, step: string, result: LogResult, detail: string) => ({
    id: uid(),
    time,
    bookingId,
    step,
    result,
    detail,
  })

  return {
    bookings,
    feedback,
    alerts: [
      {
        id: uid(),
        createdAt: '2026-10-22T14:30:05.000Z',
        bookingId: 'SH-261002-1',
        type: 'COMPLAINT',
        message: 'Kavya Menon (R7), rating 3/5 – complaint: hot water ran out both mornings.',
      },
    ],
    logs: [
      log('2026-09-17T08:00:00.000Z', 'SH-260914-2', 'Feedback classified', 'OK', 'positive · rating 5 · logged only (management by exception)'),
      log('2026-10-02T06:10:00.000Z', 'SH-261002-1', 'Booking rules', 'OK', 'CONFIRMED · R7 · 20 Oct → 22 Oct'),
      log('2026-10-19T09:40:00.000Z', 'SH-261019-1', 'Booking rules', 'OK', 'CONFIRMED · R3 · 24 Oct → 26 Oct'),
      log('2026-10-21T12:05:00.000Z', 'SH-261021-1', 'Booking rules', 'OK', 'CONFIRMED · R5 · 05 Nov → 07 Nov'),
      log('2026-10-22T05:26:00.000Z', 'SH-261002-1', 'Feedback link sent', 'SENT', 'Guest checked out; feedback link e-mailed'),
      log('2026-10-22T14:30:00.000Z', 'SH-261002-1', 'Feedback classified', 'OK', 'neutral (mixed) · rating 3'),
      log('2026-10-22T14:30:05.000Z', 'SH-261002-1', 'Owner alert', 'SENT', 'Complaint: hot water ran out both mornings'),
    ],
  }
}

// ---------- tiny store ----------

function load(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch {
    /* fall through to seed */
  }
  return seed()
}

let db: DB = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* storage full or blocked – keep working in memory */
  }
}
persist()

export const getDb = () => db

export function setDb(update: (d: DB) => DB) {
  db = update(db)
  persist()
  listeners.forEach((l) => l())
}

export function useDb(): DB {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => db,
  )
}

export function addLog(bookingId: string, step: string, result: LogResult, detail: string) {
  setDb((d) => ({ ...d, logs: [...d.logs, { id: uid(), time: nowIso(), bookingId, step, result, detail }] }))
}

export function addAlert(bookingId: string, type: AlertType, message: string) {
  setDb((d) => ({ ...d, alerts: [...d.alerts, { id: uid(), createdAt: nowIso(), bookingId, type, message }] }))
  addLog(bookingId, 'Owner alert', 'SENT', `${type}: ${message}`)
}

export function resetDemo() {
  db = seed()
  persist()
  listeners.forEach((l) => l())
}

// ---------- API key (localStorage only) ----------

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setApiKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_KEY, key)
    else localStorage.removeItem(KEY_KEY)
  } catch {
    /* ignore */
  }
}

export function maskKey(key: string): string {
  if (!key) return 'not set'
  return '••••••••' + key.slice(-4)
}
