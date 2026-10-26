import { addAlert, addLog, getDb, setDb } from './store'
import type { Booking, BookingStatus } from './types'
import { addDays, formatDate, nowIso, todayIST } from './util'

export interface BookingForm {
  name: string
  email: string
  phone: string
  room: string
  checkIn: string
  checkOut: string
  guests: string
  consent: boolean
}

export const emptyBookingForm: BookingForm = {
  name: '',
  email: '',
  phone: '',
  room: '',
  checkIn: '',
  checkOut: '',
  guests: '',
  consent: false,
}

export interface BookingResult {
  booking: Booking
  guestMessage: string
}

function nextBookingId(): string {
  const prefix = 'SH-' + todayIST().slice(2).replace(/-/g, '')
  const n = getDb().bookings.filter((b) => b.id.startsWith(prefix + '-')).length + 1
  return `${prefix}-${n}`
}

/** Two stays clash if they share at least one night. Back-to-back (same day out/in) is fine. */
export function overlaps(aIn: string, aOut: string, bIn: string, bOut: string) {
  return aIn < bOut && bIn < aOut
}

export function findClash(room: string, checkIn: string, checkOut: string): Booking | undefined {
  return getDb().bookings.find(
    (b) => b.status === 'CONFIRMED' && b.room === room && overlaps(checkIn, checkOut, b.checkIn, b.checkOut),
  )
}

/** The booking RULES. Pure code – the AI is never involved here. */
export function submitBooking(form: BookingForm): BookingResult {
  const f = {
    ...form,
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
  }
  const id = nextBookingId()
  const guests = Number(f.guests)
  const dates = `${formatDate(f.checkIn)} → ${formatDate(f.checkOut)}`
  addLog(id, 'Booking received', 'OK', `${f.name || '(no name)'} · ${f.room || '(no room)'} · ${dates}`)

  const missing: string[] = []
  if (!f.name) missing.push('full name')
  if (!f.email) missing.push('e-mail')
  if (!f.phone) missing.push('phone')
  if (!f.room) missing.push('room')
  if (!f.checkIn) missing.push('check-in date')
  if (!f.checkOut) missing.push('check-out date')
  if (!f.guests || !(guests >= 1)) missing.push('number of guests')
  if (!f.consent) missing.push('consent')

  let status: BookingStatus
  let clashWith: string | undefined
  let guestMessage: string

  if (missing.length) {
    status = 'ON HOLD – missing data'
    guestMessage = `Your request is on hold because some details are missing (${missing.join(', ')}). Please complete them and submit again.`
    addLog(id, 'Rule: all fields filled', 'HOLD', `Missing: ${missing.join(', ')}`)
    addAlert(id, 'ON HOLD', `Booking request on hold – missing ${missing.join(', ')}.`)
  } else if (!(f.checkOut > f.checkIn)) {
    status = 'ON HOLD – invalid dates'
    guestMessage = 'Your request is on hold: the check-out date must be after the check-in date. Please correct the dates and submit again.'
    addLog(id, 'Rule: check-out after check-in', 'HOLD', `Invalid dates: ${dates}`)
    addAlert(id, 'ON HOLD', `Booking request on hold – invalid dates (${dates}) for ${f.name}.`)
  } else {
    const clash = findClash(f.room, f.checkIn, f.checkOut)
    if (clash) {
      status = 'NOT CONFIRMED – room taken'
      clashWith = clash.id
      guestMessage = `We're sorry – room ${f.room} is not available for ${dates}. Please try other dates or another room; we would love to host you.`
      addLog(id, 'Rule: no double-booking', 'BLOCKED', `${f.room} already booked under ${clash.id} (${formatDate(clash.checkIn)} → ${formatDate(clash.checkOut)})`)
      addAlert(id, 'ROOM TAKEN', `Double-booking blocked: ${f.name} asked for ${f.room} (${dates}), clashes with ${clash.id}.`)
    } else {
      status = 'CONFIRMED'
      guestMessage = `Your stay in room ${f.room} is confirmed.`
      addLog(id, 'Booking rules', 'OK', `CONFIRMED · ${f.room} · ${dates}`)
      addLog(id, 'Confirmation + pre-arrival details', 'SENT', `Shown to guest (check-in 1 PM, check-out 11 AM, map, house rules)`)
    }
  }

  const booking: Booking = {
    id,
    createdAt: nowIso(),
    name: f.name,
    email: f.email,
    phone: f.phone,
    room: f.room,
    checkIn: f.checkIn,
    checkOut: f.checkOut,
    guests: f.guests ? guests : '',
    consent: f.consent,
    status,
    clashWith,
  }
  setDb((d) => ({ ...d, bookings: [...d.bookings, booking] }))
  return { booking, guestMessage }
}

export function feedbackLink(bookingId: string) {
  return `${location.origin}${location.pathname}#/feedback?booking=${encodeURIComponent(bookingId)}`
}

export function markCheckedOut(bookingId: string) {
  const t = nowIso()
  setDb((d) => ({
    ...d,
    bookings: d.bookings.map((b) => (b.id === bookingId ? { ...b, checkedOutAt: t, feedbackRequestedAt: t } : b)),
  }))
  addLog(bookingId, 'Checked out', 'OK', 'Marked checked out by owner')
  addLog(bookingId, 'Feedback link sent', 'SENT', feedbackLink(bookingId))
}

/** Blank e-mail and phone for stays that checked out more than 180 days ago. */
export function purgeOldContacts(): number {
  const cutoff = addDays(todayIST(), -180)
  const targets = getDb().bookings.filter((b) => b.checkOut && b.checkOut < cutoff && (b.email || b.phone))
  const t = nowIso()
  setDb((d) => ({
    ...d,
    bookings: d.bookings.map((b) =>
      targets.some((x) => x.id === b.id) ? { ...b, email: '', phone: '', contactDeletedAt: t } : b,
    ),
  }))
  targets.forEach((b) => addLog(b.id, 'Contact details deleted', 'OK', `Checked out ${formatDate(b.checkOut)} (> 180 days); e-mail and phone blanked`))
  addLog('—', 'Privacy purge (180 days)', 'OK', `${targets.length} stay(s) cleaned; cutoff check-out before ${formatDate(cutoff)}`)
  return targets.length
}
