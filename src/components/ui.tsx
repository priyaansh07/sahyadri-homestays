import type { ReactNode } from 'react'
import type { AlertType, BookingStatus, LogResult, Tag } from '../types'

export function Card({ title, children, className = '', right }: { title?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {title && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-brand sm:text-lg">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    secondary: 'bg-brand-soft text-brand hover:bg-blue-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

const pill = 'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold'

export function StatusPill({ status }: { status: BookingStatus }) {
  const c = status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : status.startsWith('NOT') ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
  return <span className={`${pill} ${c}`}>{status}</span>
}

export function TagPill({ tag, mixed }: { tag: Tag; mixed?: boolean }) {
  const c = {
    positive: 'bg-emerald-100 text-emerald-800',
    neutral: 'bg-slate-200 text-slate-800',
    negative: 'bg-rose-100 text-rose-800',
    'no comment': 'bg-slate-100 text-slate-600',
    'NEEDS HUMAN REVIEW': 'bg-violet-100 text-violet-800',
  }[tag]
  return (
    <span className={`${pill} ${c}`}>
      {tag}
      {mixed ? ' (mixed)' : ''}
    </span>
  )
}

export function AlertPill({ type }: { type: AlertType }) {
  const c = {
    'ON HOLD': 'bg-amber-100 text-amber-800',
    'ROOM TAKEN': 'bg-rose-100 text-rose-800',
    COMPLAINT: 'bg-orange-100 text-orange-800',
    'LOW RATING': 'bg-pink-100 text-pink-800',
    'AI FAILED': 'bg-violet-100 text-violet-800',
  }[type]
  return <span className={`${pill} ${c}`}>{type}</span>
}

export function ResultPill({ result }: { result: LogResult }) {
  const c = {
    OK: 'bg-emerald-100 text-emerald-800',
    SENT: 'bg-sky-100 text-sky-800',
    HOLD: 'bg-amber-100 text-amber-800',
    BLOCKED: 'bg-rose-100 text-rose-800',
    FAILED: 'bg-violet-100 text-violet-800',
  }[result]
  return <span className={`${pill} ${c}`}>{result}</span>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

export const YesNo = ({ v }: { v: boolean }) => (
  <span className={`font-semibold ${v ? 'text-rose-700' : 'text-slate-600'}`}>{v ? 'YES' : 'NO'}</span>
)

export function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-500" aria-label={`${n} out of 5`}>
      {'★'.repeat(n)}
      <span className="text-slate-300">{'★'.repeat(5 - n)}</span>
    </span>
  )
}
