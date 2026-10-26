import type { FormEvent } from 'react'
import { emptyBookingForm, submitBooking, type BookingForm, type BookingResult } from '../booking'
import { formatDate, ROOMS } from '../util'
import { Button, Card, Field, inputCls, StatusPill } from './ui'

export const CONSENT_TEXT =
  'Your name, phone and e-mail are used only to manage this stay and to ask for feedback afterwards. We do not share them or use them for marketing. Contact details are deleted 180 days after check-out.'

const MAP_LINK = 'https://www.google.com/maps/search/?api=1&query=Lonavala%2C+Maharashtra'

function nights(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
}

export function ResultCard({ result, onNew }: { result: BookingResult; onNew: () => void }) {
  const b = result.booking
  if (b.status === 'CONFIRMED') {
    const n = nights(b.checkIn, b.checkOut)
    return (
      <Card className="border-emerald-300 bg-emerald-50/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-emerald-800">Booking confirmed ✓</h2>
          <StatusPill status={b.status} />
        </div>
        <p className="mt-1 text-sm text-slate-700">
          Thank you, {b.name}! {result.guestMessage}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">Booking ID</dt>
            <dd className="font-mono font-semibold text-brand">{b.id}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Room</dt>
            <dd className="font-semibold">{b.room}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Dates</dt>
            <dd className="font-semibold">
              {formatDate(b.checkIn)} → {formatDate(b.checkOut)} ({n} night{n === 1 ? '' : 's'})
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Guests</dt>
            <dd className="font-semibold">{b.guests}</dd>
          </div>
        </dl>
        <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 text-sm">
          <h3 className="mb-2 font-semibold text-brand">Before you arrive</h3>
          <ul className="space-y-1.5 text-slate-700">
            <li>🕐 Check-in from <b>1:00 PM</b> · Check-out by <b>11:00 AM</b></li>
            <li>
              📍{' '}
              <a href={MAP_LINK} target="_blank" rel="noreferrer" className="font-medium text-brand underline">
                Open map to Sahyadri Homestays, Lonavala
              </a>
            </li>
            <li>🏡 House rules: No loud music after 10 PM. Please carry a government photo ID.</li>
          </ul>
        </div>
        <Button variant="ghost" className="mt-4" onClick={onNew}>
          Make another booking
        </Button>
      </Card>
    )
  }
  const taken = b.status.startsWith('NOT')
  return (
    <Card className={taken ? 'border-rose-300 bg-rose-50/40' : 'border-amber-300 bg-amber-50/40'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`text-lg font-semibold ${taken ? 'text-rose-800' : 'text-amber-800'}`}>
          {taken ? 'Room not available' : 'Request on hold'}
        </h2>
        <StatusPill status={b.status} />
      </div>
      <p className="mt-2 text-sm text-slate-700">{result.guestMessage}</p>
      <p className="mt-2 text-xs text-slate-500">
        Reference: <span className="font-mono">{b.id}</span> · The owner has been notified.
      </p>
      <Button variant="ghost" className="mt-4" onClick={onNew}>
        Try again
      </Button>
    </Card>
  )
}

export default function BookRoom({
  form,
  setForm,
  result,
  setResult,
}: {
  form: BookingForm
  setForm: (f: BookingForm) => void
  result: BookingResult | null
  setResult: (r: BookingResult | null) => void
}) {
  const set = <K extends keyof BookingForm>(k: K, v: BookingForm[K]) => setForm({ ...form, [k]: v })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setResult(submitBooking(form))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-5">
      {result && (
        <ResultCard
          result={result}
          onNew={() => {
            setResult(null)
            setForm(emptyBookingForm)
          }}
        />
      )}
      <Card title="Book a Room">
        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Asha Rao" />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field label="Phone">
            <input type="tel" className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="98765 43210" />
          </Field>
          <Field label="Room">
            <select className={inputCls} value={form.room} onChange={(e) => set('room', e.target.value)}>
              <option value="">Select a room…</option>
              {ROOMS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Check-in date">
            <input type="date" className={inputCls} value={form.checkIn} onChange={(e) => set('checkIn', e.target.value)} />
          </Field>
          <Field label="Check-out date">
            <input type="date" className={inputCls} value={form.checkOut} onChange={(e) => set('checkOut', e.target.value)} />
          </Field>
          <Field label="Number of guests">
            <input type="number" min={1} max={6} className={inputCls} value={form.guests} onChange={(e) => set('guests', e.target.value)} placeholder="2" />
          </Field>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} />
              <span>
                {CONSENT_TEXT} <span className="text-rose-600">*</span>
              </span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full sm:w-auto">
              Request booking
            </Button>
            <p className="mt-2 text-xs text-slate-500">Booking rules run in code: all fields filled · check-out after check-in · no double-booking.</p>
          </div>
        </form>
      </Card>
    </div>
  )
}
