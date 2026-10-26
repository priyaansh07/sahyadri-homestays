import { useState } from 'react'
import { resetDemo } from '../store'
import { runAll, TESTS, type T5Detail, type TestResult, type TestUI } from '../testlab'
import { Button, Card } from './ui'

export default function TestLab({
  ui,
  results,
  setResults,
  onReset,
}: {
  ui: TestUI
  results: TestResult[]
  setResults: (r: TestResult[]) => void
  onReset: () => void
}) {
  const [busy, setBusy] = useState('')
  const [t5, setT5] = useState<T5Detail | null>(null)

  const record = (r: TestResult) => setResults([...results.filter((x) => x.id !== r.id), r].sort((a, b) => a.id.localeCompare(b.id)))

  const runOne = async (id: string) => {
    const t = TESTS.find((x) => x.id === id)!
    setBusy(id)
    try {
      const r = await t.run(ui)
      if ('detail' in r) setT5((r as TestResult & { detail: T5Detail }).detail)
      record(r)
    } finally {
      setBusy('')
    }
  }

  const all = async () => {
    setBusy('all')
    setResults([])
    try {
      await runAll(setResults)
    } finally {
      setBusy('')
    }
  }

  const passed = results.filter((r) => r.pass).length

  return (
    <div className="space-y-5">
      <Card
        title="Test Lab – one-click demo"
        right={
          <div className="flex gap-2">
            <Button onClick={all} disabled={!!busy}>
              {busy === 'all' ? 'Running…' : '▶ Run all tests'}
            </Button>
            <Button
              variant="ghost"
              disabled={!!busy}
              onClick={() => {
                if (confirm('Reset all demo data to the 3 sample bookings and 2 feedback rows?')) {
                  resetDemo()
                  setResults([])
                  setT5(null)
                  onReset()
                }
              }}
            >
              Reset demo data
            </Button>
          </div>
        }
      >
        <p className="mb-4 text-sm text-slate-600">Each button fills in real test data and submits it through the same code as the real screens, then jumps to the result.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TESTS.map((t) => {
            const r = results.find((x) => x.id === t.id)
            return (
              <button
                key={t.id}
                disabled={!!busy}
                onClick={() => runOne(t.id)}
                className={`rounded-2xl border p-4 text-left transition hover:border-brand hover:shadow disabled:opacity-60 ${
                  r ? (r.pass ? 'border-emerald-300 bg-emerald-50/50' : 'border-rose-300 bg-rose-50/50') : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-brand">{t.id}</span>
                  {busy === t.id && <span className="text-xs text-slate-500">running…</span>}
                  {r && busy !== t.id && <span className={`text-xs font-bold ${r.pass ? 'text-emerald-700' : 'text-rose-700'}`}>{r.pass ? 'PASS' : 'FAIL'}</span>}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-800">{t.label}</div>
                <div className="mt-1 text-xs text-slate-500">{t.hint}</div>
              </button>
            )
          })}
        </div>
      </Card>

      {t5 && (
        <Card title="T5 – guardrail on a fake AI answer (no AI called)">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium text-slate-500">Fake AI answer fed in</div>
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-2 text-xs text-emerald-200">{t5.input}</pre>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-slate-500">After guardrail (code)</div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-2 text-xs text-emerald-200">
                {JSON.stringify({ tag: t5.result.tag, mixed: t5.result.mixed, negative_points: t5.result.negativePoints }, null, 0)}
              </pre>
            </div>
          </div>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
            {t5.result.actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Results" right={results.length > 0 && <span className="text-sm font-semibold text-slate-700">{passed}/{results.length} passed</span>}>
        {results.length === 0 ? (
          <p className="text-sm text-slate-500">Run a test to see Expected vs Actual.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Test</th>
                  <th className="py-2 pr-3">Expected</th>
                  <th className="py-2 pr-3">Actual</th>
                  <th className="py-2">Pass/Fail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-2 pr-3">
                      <span className="font-mono font-bold text-brand">{r.id}</span> {r.name}
                    </td>
                    <td className="py-2 pr-3 text-slate-700">{r.expected}</td>
                    <td className="py-2 pr-3 text-slate-700">{r.actual}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.pass ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>{r.pass ? 'PASS' : 'FAIL'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
