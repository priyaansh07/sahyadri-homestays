import { useState } from 'react'
import { MODEL } from '../gemini'
import { getApiKey, maskKey, setApiKey } from '../store'
import { Button, inputCls } from './ui'

export default function Settings({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState(getApiKey())
  const [value, setValue] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-20" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand">Settings</h2>
          <button onClick={onClose} className="text-xl text-slate-400 hover:text-slate-600" aria-label="Close">
            ×
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Gemini API key for the one AI step (<span className="font-mono">{MODEL}</span>). Stored only in this browser's localStorage. Without a key the app still works and the AI step goes to the fail-safe.
        </p>
        <p className="mt-3 text-sm">
          Current key: <span className="font-mono font-semibold">{maskKey(current)}</span>
        </p>
        <input
          type="password"
          autoComplete="off"
          className={`${inputCls} mt-3 font-mono`}
          placeholder="Paste API key…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="mt-3 flex gap-2">
          <Button
            disabled={!value.trim()}
            onClick={() => {
              setApiKey(value.trim())
              setCurrent(value.trim())
              setValue('')
            }}
          >
            Save key
          </Button>
          <Button
            variant="ghost"
            disabled={!current}
            onClick={() => {
              setApiKey('')
              setCurrent('')
            }}
          >
            Remove key
          </Button>
        </div>
      </div>
    </div>
  )
}
