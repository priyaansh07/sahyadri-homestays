import { useState } from 'react'
import { feedbackLink, markCheckedOut } from '../booking'
import { approveAndSendReply, saveReplyDraft } from '../feedback'
import { useDb } from '../store'
import type { Booking, Feedback } from '../types'
import { addDays, formatDate, formatIST, ROOMS, todayIST } from '../util'
import { AlertPill, Button, Card, inputCls, Stars, StatusPill, TagPill, YesNo } from './ui'

function Kpi({ label, value, tone = 'text-brand' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  )
}

function RoomCalendar({ bookings }: { bookings: Booking[] }) {
  const start = todayIST()
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i))
  const confirmed = bookings.filter((b) => b.status === 'CONFIRMED')
  const at = (room: string, night: string) => confirmed.find((b) => b.room === room && b.checkIn <= night && night < b.checkOut)
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white px-1 text-left text-slate-500">Room</th>
            {days.map((d) => {
              const dt = new Date(d + 'T00:00:00Z')
              return (
                <th key={d} className="min-w-9 px-0.5 text-center font-medium text-slate-500">
                  <div>{dt.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }).slice(0, 2)}</div>
                  <div className="text-slate-800">{dt.getUTCDate()}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {ROOMS.map((r) => (
            <tr key={r}>
              <td className="sticky left-0 bg-white px-1 font-semibold text-slate-700">{r}</td>
              {days.map((d) => {
                const b = at(r, d)
                return (
                  <td
                    key={d}
                    title={b ? `${b.id} · ${b.name} · night of ${formatDate(d)}` : `${r} free · ${formatDate(d)}`}
                    className={`h-7 rounded text-center text-[10px] font-semibold ${b ? 'bg-brand text-white' : 'bg-slate-100'}`}
                  >
                    {b ? b.name.split(' ').map((p) => p[0]).join('').slice(0, 2) : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">Shaded = booked night (confirmed only). Check-out day is free for the next guest.</p>
    </div>
  )
}

function FeedbackItem({ f, booking }: { f: Feedback; booking?: Booking }) {
  const [draft, setDraft] = useState(f.replyDraft)
  const sent = !!f.replySentAt
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono font-semibold text-brand">{f.bookingId}</span>
        <span className="text-slate-700">{f.guestName}</span>
        <Stars n={f.rating} />
        <TagPill tag={f.tag} mixed={f.mixed} />
        <span className="text-xs text-slate-500">
          Owner alerted: <YesNo v={f.ownerAlerted} />
        </span>
        <span className="ml-auto text-xs text-slate-500">{formatIST(f.createdAt)}</span>
      </div>
      <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm italic text-slate-700">{f.comment ? `“${f.comment}”` : '(no comment)'}</p>
      <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
        {f.positivePoints.length > 0 && <div>👍 Praise: {f.positivePoints.join('; ')}</div>}
        {f.negativePoints.length > 0 && <div>👎 Complaints: {f.negativePoints.join('; ')}</div>}
        {f.reason && <div className="sm:col-span-2">AI reason: {f.reason}</div>}
        <div className="sm:col-span-2">Guardrail: {f.guardrail.join(' · ')}</div>
      </div>

      {sent ? (
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm">
          <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs text-sky-900">
            <span>
              📧 <b>Sent e-mail</b> · To: {booking?.email || '(contact details deleted)'}
            </span>
            <span>
              Approved: <b>{f.replyApproved}</b> · Reply sent on: <b>{formatIST(f.replySentAt!)}</b>
            </span>
          </div>
          <div className="text-xs text-slate-500">Subject: Re: your stay at Sahyadri Homestays</div>
          <p className="mt-1 whitespace-pre-wrap text-slate-800">{f.replyDraft}</p>
        </div>
      ) : (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-slate-700">Public reply (written by the owner only)</label>
          <textarea
            className={`${inputCls} min-h-20`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => saveReplyDraft(f.id, draft)}
            placeholder="Write your reply to the guest…"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button onClick={() => approveAndSendReply(f.id, draft)} disabled={!draft.trim()}>
              Approve & send (Y)
            </Button>
            <span className="text-xs text-slate-500">Nothing is sent until you approve. The AI never writes or sends replies.</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ openFeedbackLink }: { openFeedbackLink: (bookingId: string) => void }) {
  const db = useDb()
  const weekAgo = Date.now() - 7 * 86400000
  const ratings = db.feedback.map((f) => f.rating)
  const attention = db.feedback.filter((f) => f.needsAttention).slice().reverse()
  const loggedOnly = db.feedback.length - attention.length
  const bookings = db.bookings.slice().reverse()
  const [copied, setCopied] = useState('')

  const copy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(feedbackLink(id))
      setCopied(id)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      /* clipboard blocked – link is visible anyway */
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Bookings this week" value={db.bookings.filter((b) => Date.parse(b.createdAt) >= weekAgo).length} />
        <Kpi label="Confirmed" value={db.bookings.filter((b) => b.status === 'CONFIRMED').length} tone="text-emerald-700" />
        <Kpi label="Blocked double-bookings" value={db.bookings.filter((b) => b.status.startsWith('NOT')).length} tone="text-rose-700" />
        <Kpi label="On hold" value={db.bookings.filter((b) => b.status.startsWith('ON HOLD')).length} tone="text-amber-700" />
        <Kpi label="Complaints waiting" value={attention.filter((f) => !f.replySentAt).length} tone="text-orange-700" />
        <Kpi label="Average rating" value={ratings.length ? `${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)} ★` : '—'} tone="text-amber-600" />
      </div>

      <Card title="Bookings">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Booking ID</th>
                <th className="py-2 pr-3">Guest</th>
                <th className="py-2 pr-3">Room</th>
                <th className="py-2 pr-3">Check-in → out</th>
                <th className="py-2 pr-3">Guests</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Stay / feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <tr key={b.id} className="align-top">
                  <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs font-semibold text-brand">{b.id}</td>
                  <td className="py-2 pr-3">
                    <div>{b.name || '—'}</div>
                    <div className="text-xs text-slate-500">{b.contactDeletedAt ? 'contact details deleted' : [b.email, b.phone].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td className="py-2 pr-3">{b.room || '—'}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                  </td>
                  <td className="py-2 pr-3">{b.guests || '—'}</td>
                  <td className="py-2 pr-3">
                    <StatusPill status={b.status} />
                    {b.clashWith && <div className="mt-1 text-xs text-rose-700">clashes with {b.clashWith}</div>}
                  </td>
                  <td className="py-2 text-xs">
                    {b.status !== 'CONFIRMED' ? (
                      <span className="text-slate-400">—</span>
                    ) : b.feedbackRequestedAt ? (
                      <div className="space-y-1">
                        <div className="text-slate-600">Feedback requested on {formatIST(b.feedbackRequestedAt)}</div>
                        <div className="flex flex-wrap gap-2">
                          <button className="font-medium text-brand underline" onClick={() => openFeedbackLink(b.id)}>
                            Open feedback link
                          </button>
                          <button className="text-slate-500 underline" onClick={() => copy(b.id)}>
                            {copied === b.id ? 'Copied!' : 'Copy link'}
                          </button>
                        </div>
                        <div className="max-w-56 truncate font-mono text-[10px] text-slate-400" title={feedbackLink(b.id)}>
                          {feedbackLink(b.id)}
                        </div>
                      </div>
                    ) : (
                      <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => markCheckedOut(b.id)}>
                        Mark checked out → send feedback link
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title="Room calendar – next 14 days" className="lg:col-span-3">
          <RoomCalendar bookings={db.bookings} />
        </Card>
        <Card title={`Owner alerts (${db.alerts.length})`} className="lg:col-span-2">
          <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {db.alerts.length === 0 && <li className="text-sm text-slate-500">No alerts.</li>}
            {db.alerts
              .slice()
              .reverse()
              .map((a) => (
                <li key={a.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <AlertPill type={a.type} />
                    <span className="font-mono text-xs text-brand">{a.bookingId}</span>
                    <span className="ml-auto text-xs text-slate-500">{formatIST(a.createdAt)}</span>
                  </div>
                  <p className="text-slate-700">{a.message}</p>
                </li>
              ))}
          </ul>
        </Card>
      </div>

      <Card
        title={`Feedback needing attention (${attention.length})`}
        right={<span className="text-xs text-slate-500">{loggedOnly} other comment(s) logged only – management by exception</span>}
      >
        <div className="space-y-3">
          {attention.length === 0 && <p className="text-sm text-slate-500">Nothing needs your attention.</p>}
          {attention.map((f) => (
            <FeedbackItem key={f.id} f={f} booking={db.bookings.find((b) => b.id === f.bookingId)} />
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Shown here: negative or mixed comments, ratings 1–2, and anything the AI could not classify. Positive comments are logged, not shown.
        </p>
      </Card>
    </div>
  )
}
