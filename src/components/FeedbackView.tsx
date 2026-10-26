import type { FormEvent, ReactNode } from 'react'
import type { FeedbackInput, FeedbackRun, Step } from '../feedback'
import { getApiKey } from '../store'
import { Button, Card, Field, inputCls, TagPill, YesNo } from './ui'

export interface FeedbackRunState {
  running: boolean
  steps: Step[]
  result?: FeedbackRun
}

function StepIcon({ s }: { s: Step['status'] }) {
  const base = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold'
  if (s === 'done') return <span className={`${base} bg-emerald-500 text-white`}>✓</span>
  if (s === 'failed') return <span className={`${base} bg-rose-500 text-white`}>✕</span>
  if (s === 'warn') return <span className={`${base} bg-amber-500 text-white`}>!</span>
  if (s === 'skipped') return <span className={`${base} bg-slate-300 text-white`}>–</span>
  if (s === 'running') return <span className={`${base} animate-spin border-2 border-brand border-t-transparent`} />
  return <span className={`${base} border-2 border-slate-300`} />
}

export function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.key} className={`flex gap-3 ${s.status === 'pending' ? 'opacity-50' : ''}`}>
          <StepIcon s={s.status} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-800">{s.label}</div>
            {s.detail && <div className="whitespace-pre-wrap text-xs text-slate-600">{s.detail}</div>}
            {s.code && <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-2 text-xs text-emerald-200">{s.code}</pre>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function ResultSummary({ run }: { run: FeedbackRun }) {
  const f = run.feedback
  if (!f) return <p className="text-sm text-rose-700">{run.error}</p>
  const row = (k: string, v: ReactNode) => (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-slate-100 py-1.5 text-sm last:border-0">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-slate-800">{v}</dd>
    </div>
  )
  return (
    <dl>
      {row('AI tag', <TagPill tag={f.tag} mixed={f.mixed} />)}
      {row('Mixed', <YesNo v={f.mixed} />)}
      {row('Praise', f.positivePoints.length ? f.positivePoints.join('; ') : '—')}
      {row('Complaints', f.negativePoints.length ? f.negativePoints.join('; ') : '—')}
      {row('AI reason', f.reason || '—')}
      {row('Guardrail action', <ul className="list-disc pl-4">{f.guardrail.map((g) => <li key={g}>{g}</li>)}</ul>)}
      {row('Owner alerted', <YesNo v={f.ownerAlerted} />)}
      {row('Public reply', 'None posted – only the owner can write and approve a reply')}
    </dl>
  )
}

export default function FeedbackView({
  form,
  setForm,
  run,
  onSubmit,
}: {
  form: FeedbackInput
  setForm: (f: FeedbackInput) => void
  run: FeedbackRunState | null
  onSubmit: (input: FeedbackInput) => void
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Guest Feedback">
        <p className="mb-4 text-sm text-slate-600">Thank you for staying with us in Lonavala. How was your stay?</p>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="Booking ID">
            <input className={`${inputCls} font-mono`} value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })} placeholder="SH-YYMMDD-n" />
          </Field>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Overall rating</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, rating: n })}
                  className={`h-11 w-11 rounded-xl border text-lg transition ${form.rating >= n ? 'border-amber-400 bg-amber-50 text-amber-500' : 'border-slate-300 text-slate-300 hover:text-amber-400'}`}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
              <span className="self-center text-sm text-slate-600">{form.rating ? `${form.rating}/5` : ''}</span>
            </div>
          </div>
          <Field label="Comments (optional)">
            <textarea className={`${inputCls} min-h-28`} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Tell us what you liked and what we can improve…" />
          </Field>
          <Button type="submit" disabled={run?.running || !form.rating}>
            {run?.running ? 'Processing…' : 'Send feedback'}
          </Button>
          {!getApiKey() && (
            <p className="text-xs text-amber-700">No Gemini API key set – comments will go to the fail-safe (NEEDS HUMAN REVIEW). Add a key under Settings.</p>
          )}
        </form>
      </Card>

      <div className="space-y-5">
        <Card title="Processing pipeline">
          {run ? <Timeline steps={run.steps} /> : <p className="text-sm text-slate-500">Submit feedback to see each step tick green.</p>}
        </Card>
        {run?.result && (
          <Card title="Result" className={run.result.feedback ? '' : 'border-rose-300'}>
            <ResultSummary run={run.result} />
            <p className="mt-3 text-xs text-slate-400">Shown for the demo. A real guest would only see “Thank you for your feedback”.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
