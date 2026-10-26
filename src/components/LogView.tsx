import { useState } from 'react'
import { purgeOldContacts } from '../booking'
import { useDb } from '../store'
import { formatIST } from '../util'
import { Button, Card, inputCls, ResultPill } from './ui'

export default function LogView() {
  const db = useDb()
  const [filter, setFilter] = useState('')
  const [purgeMsg, setPurgeMsg] = useState('')
  const ids = Array.from(new Set(db.logs.map((l) => l.bookingId))).sort()
  const rows = db.logs.filter((l) => !filter || l.bookingId.toLowerCase().includes(filter.trim().toLowerCase())).slice().reverse()

  return (
    <Card
      title={`Log – audit trail (${rows.length})`}
      right={
        <Button
          variant="ghost"
          className="text-xs"
          onClick={() => {
            const n = purgeOldContacts()
            setPurgeMsg(n ? `Deleted contact details for ${n} stay(s).` : 'No stays checked out more than 180 days ago – nothing to delete.')
          }}
        >
          🗑 Delete contact details older than 180 days
        </Button>
      }
    >
      {purgeMsg && <p className="mb-3 rounded-lg bg-brand-soft p-2 text-sm text-brand">{purgeMsg} (logged below)</p>}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input list="log-ids" className={`${inputCls} max-w-xs font-mono`} placeholder="Filter by Booking ID…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <datalist id="log-ids">
          {ids.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
        {filter && (
          <button className="text-sm text-slate-500 underline" onClick={() => setFilter('')}>
            Clear
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-3">Timestamp (IST)</th>
              <th className="py-2 pr-3">Booking ID</th>
              <th className="py-2 pr-3">Step</th>
              <th className="py-2 pr-3">Result</th>
              <th className="py-2">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((l) => (
              <tr key={l.id} className="align-top">
                <td className="whitespace-nowrap py-2 pr-3 text-xs text-slate-600">{formatIST(l.time)}</td>
                <td className="py-2 pr-3">
                  <button className="font-mono text-xs font-semibold text-brand hover:underline" onClick={() => setFilter(l.bookingId)}>
                    {l.bookingId}
                  </button>
                </td>
                <td className="py-2 pr-3">{l.step}</td>
                <td className="py-2 pr-3">
                  <ResultPill result={l.result} />
                </td>
                <td className="break-words py-2 text-xs text-slate-600">{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
