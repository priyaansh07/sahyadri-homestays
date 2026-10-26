import { useEffect, useMemo, useState } from 'react'
import { emptyBookingForm, type BookingForm, type BookingResult } from './booking'
import BookRoom from './components/BookRoom'
import Dashboard from './components/Dashboard'
import FeedbackView, { type FeedbackRunState } from './components/FeedbackView'
import LogView from './components/LogView'
import Settings from './components/Settings'
import TestLab from './components/TestLab'
import { processFeedback, type FeedbackInput, type PipelineOptions } from './feedback'
import type { TestResult, TestUI } from './testlab'

const TABS = [
  { key: 'book', label: 'Book a Room' },
  { key: 'dashboard', label: 'Owner Dashboard' },
  { key: 'feedback', label: 'Guest Feedback' },
  { key: 'log', label: 'Log' },
  { key: 'test', label: 'Test Lab' },
] as const
type TabKey = (typeof TABS)[number]['key']

const emptyFeedback: FeedbackInput = { bookingId: '', rating: 0, comment: '' }

function parseHash(): { tab: TabKey; booking?: string } {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  const tab = (TABS.find((t) => t.key === path)?.key ?? 'book') as TabKey
  const booking = new URLSearchParams(query).get('booking') ?? undefined
  return { tab, booking }
}

export default function App() {
  const initial = useMemo(parseHash, [])
  const [tab, setTab] = useState<TabKey>(initial.tab)
  const [showSettings, setShowSettings] = useState(false)
  const [bookingForm, setBookingForm] = useState<BookingForm>(emptyBookingForm)
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)
  const [feedbackForm, setFeedbackForm] = useState<FeedbackInput>({ ...emptyFeedback, bookingId: initial.booking ?? '' })
  const [feedbackRun, setFeedbackRun] = useState<FeedbackRunState | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])

  useEffect(() => {
    const onHash = () => {
      const h = parseHash()
      setTab(h.tab)
      if (h.booking) {
        setFeedbackForm({ ...emptyFeedback, bookingId: h.booking })
        setFeedbackRun(null)
      }
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const goto = (t: TabKey) => {
    if (parseHash().tab !== t || window.location.hash.includes('?')) window.location.hash = `#/${t}`
    setTab(t)
    window.scrollTo({ top: 0 })
  }

  const runFeedback = async (input: FeedbackInput, opts: PipelineOptions = {}) => {
    setFeedbackForm(input)
    setFeedbackRun({ running: true, steps: [] })
    const result = await processFeedback(input, { ...opts, onStep: (steps) => setFeedbackRun({ running: true, steps }) })
    setFeedbackRun({ running: false, steps: result.steps, result })
    return result
  }

  const testUI: TestUI = {
    showBooking: (form, run) => {
      setBookingForm(form)
      const r = run()
      setBookingResult(r)
      goto('book')
      return r
    },
    runFeedback: (input, opts) => {
      goto('feedback')
      return runFeedback(input, opts)
    },
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="bg-brand text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold sm:text-xl">Sahyadri Homestays · Lonavala</h1>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white ring-1 ring-white/30">Prototype · fictional data</span>
            </div>
            <p className="text-xs text-blue-100">Booking & Feedback Assistant</p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
            aria-label="Settings"
          >
            ⚙ <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => goto(t.key)}
                className={`whitespace-nowrap rounded-t-xl px-4 py-2.5 text-sm font-medium transition ${
                  tab === t.key ? 'bg-white text-brand' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 bg-white px-4 py-6">
        {tab === 'book' && <BookRoom form={bookingForm} setForm={setBookingForm} result={bookingResult} setResult={setBookingResult} />}
        {tab === 'dashboard' && <Dashboard openFeedbackLink={(id) => (window.location.hash = `#/feedback?booking=${encodeURIComponent(id)}`)} />}
        {tab === 'feedback' && (
          <FeedbackView
            form={feedbackForm}
            setForm={setFeedbackForm}
            run={feedbackRun}
            onSubmit={(input) => {
              if (!feedbackRun?.running) runFeedback(input)
            }}
          />
        )}
        {tab === 'log' && <LogView />}
        {tab === 'test' && (
          <TestLab
            ui={testUI}
            results={testResults}
            setResults={setTestResults}
            onReset={() => {
              setBookingForm(emptyBookingForm)
              setBookingResult(null)
              setFeedbackForm(emptyFeedback)
              setFeedbackRun(null)
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">CIA 3 · Group 8 · Low-Code Tools</footer>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
