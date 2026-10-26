import { classifyWithGemini, MAX_ATTEMPTS } from './gemini'
import { applyGuardrail, RULE_NO_POST } from './guardrail'
import { maskPII } from './mask'
import { addAlert, addLog, getDb, setDb } from './store'
import type { AlertType, Feedback } from './types'
import { nowIso, sleep, uid } from './util'

export type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'failed' | 'warn'

export interface Step {
  key: string
  label: string
  status: StepStatus
  detail?: string
  code?: string
}

export interface FeedbackInput {
  bookingId: string
  rating: number
  comment: string
}

export interface FeedbackRun {
  steps: Step[]
  feedback?: Feedback
  error?: string
}

export interface PipelineOptions {
  onStep?: (steps: Step[]) => void
  simulateAiDown?: boolean
  stepDelay?: number
}

const STEP_LABELS: [string, string][] = [
  ['lookup', 'Find booking'],
  ['mask', 'a) Mask personal data (code, before AI)'],
  ['empty', 'b) Empty-comment check'],
  ['ai', 'c) AI classification – Gemini, temperature 0'],
  ['guard', 'd) Guardrail check (code, not AI)'],
  ['alert', 'Owner alert'],
  ['save', 'Save & log'],
]

export const needsAttention = (f: Pick<Feedback, 'tag' | 'mixed' | 'rating' | 'negativePoints'>) =>
  f.tag === 'negative' || f.tag === 'NEEDS HUMAN REVIEW' || f.mixed || f.rating <= 2 || f.negativePoints.length > 0

export async function processFeedback(input: FeedbackInput, opts: PipelineOptions = {}): Promise<FeedbackRun> {
  const delay = opts.stepDelay ?? 350
  const steps: Step[] = STEP_LABELS.map(([key, label]) => ({ key, label, status: 'pending' }))
  const emit = () => opts.onStep?.(steps.map((s) => ({ ...s })))
  const set = async (key: string, patch: Partial<Step>, pause = true) => {
    Object.assign(steps.find((s) => s.key === key)!, patch)
    emit()
    if (pause && delay) await sleep(delay)
  }
  emit()

  try {
    const bookingId = input.bookingId.trim()
    const rating = input.rating
    const comment = input.comment.trim()

    // Find booking
    await set('lookup', { status: 'running' }, false)
    const booking = getDb().bookings.find((b) => b.id.toLowerCase() === bookingId.toLowerCase())
    if (!booking || !(rating >= 1 && rating <= 5)) {
      const error = !booking ? `Booking ID "${bookingId || '(empty)'}" not found – please check your feedback link.` : 'Please choose a rating from 1 to 5.'
      await set('lookup', { status: 'failed', detail: error }, false)
      addLog(bookingId || '—', 'Feedback received', 'HOLD', error)
      return { steps, error }
    }
    await set('lookup', { status: 'done', detail: `${booking.id} · room ${booking.room} · rating ${rating}/5` })
    addLog(booking.id, 'Feedback received', 'OK', `Rating ${rating}/5, ${comment ? 'with comment' : 'no comment'}`)

    // a) Mask
    await set('mask', { status: 'running' }, false)
    const masked = maskPII(comment, booking.name)
    await set('mask', {
      status: 'done',
      detail: comment ? (masked === comment ? 'No personal data found.' : 'Personal data replaced before the AI sees anything:') : 'Nothing to mask (no comment).',
      code: comment ? masked : undefined,
    })
    addLog(booking.id, 'Mask personal data', 'OK', comment ? `Masked text: ${masked}` : 'No comment')

    const base: Feedback = {
      id: uid(),
      bookingId: booking.id,
      guestName: booking.name,
      createdAt: nowIso(),
      rating,
      comment,
      maskedComment: masked,
      tag: 'neutral',
      mixed: false,
      positivePoints: [],
      negativePoints: [],
      reason: '',
      guardrail: [],
      aiStatus: 'NOT CALLED',
      ownerAlerted: false,
      needsAttention: false,
      replyDraft: '',
    }
    let fb: Feedback
    let alertType: AlertType | null = null
    let alertMsg = ''
    const who = `${booking.name} (${booking.room}), rating ${rating}/5`

    // b) Empty comment → no AI
    await set('empty', { status: 'running' }, false)
    if (!comment) {
      fb = { ...base, tag: 'no comment', reason: 'Guest left no comment.', guardrail: ['No comment → AI not called', RULE_NO_POST] }
      await set('empty', { status: 'done', detail: 'Comment is empty → tag "no comment". AI NOT called.' })
      await set('ai', { status: 'skipped', detail: 'Skipped – nothing to classify.' }, false)
      await set('guard', { status: 'skipped', detail: 'Skipped – no AI answer to check.' }, false)
      addLog(booking.id, 'AI classification', 'OK', 'Not called (no comment)')
      if (rating <= 2) {
        alertType = 'LOW RATING'
        alertMsg = `${who} – no comment left.`
      }
    } else {
      await set('empty', { status: 'done', detail: 'Comment present → send masked text to AI.' })

      // c) AI
      await set('ai', { status: 'running', detail: `Calling Gemini (attempt 1/${MAX_ATTEMPTS})…` }, false)
      let raw: string | null = null
      let aiError = ''
      try {
        const r = await classifyWithGemini(masked, {
          simulateDown: opts.simulateAiDown,
          onAttempt: (n, err) => {
            Object.assign(steps.find((s) => s.key === 'ai')!, {
              detail: err ? `Attempt ${n}/${MAX_ATTEMPTS} failed: ${err}` : `Calling Gemini (attempt ${n}/${MAX_ATTEMPTS})…`,
            })
            emit()
            if (err) addLog(booking.id, `AI call attempt ${n}`, 'FAILED', err)
          },
        })
        raw = r.raw
        await set('ai', { status: 'done', detail: `Answer received on attempt ${r.attempts}/${MAX_ATTEMPTS}:`, code: raw })
        addLog(booking.id, 'AI classification', 'OK', `Gemini answered: ${raw.replace(/\s+/g, ' ').slice(0, 300)}`)
      } catch (e) {
        aiError = e instanceof Error ? e.message : String(e)
      }

      if (raw === null) {
        // e) Fail-safe
        fb = {
          ...base,
          tag: 'NEEDS HUMAN REVIEW',
          aiStatus: 'FAILED',
          reason: `AI unavailable: ${aiError}`,
          guardrail: ['Fail-safe: AI failed → NEEDS HUMAN REVIEW', RULE_NO_POST],
        }
        await set('ai', { status: 'failed', detail: `FAILED – ${aiError}. Fail-safe engaged.` })
        await set('guard', { status: 'warn', detail: 'Fail-safe: tag set to NEEDS HUMAN REVIEW. Nothing posted.' })
        addLog(booking.id, 'AI classification', 'FAILED', `${aiError} → NEEDS HUMAN REVIEW`)
        alertType = 'AI FAILED'
        alertMsg = `${who} – AI could not classify, please review. Full comment: "${comment}"`
      } else {
        // d) Guardrail
        await set('guard', { status: 'running' }, false)
        const g = applyGuardrail(raw, rating)
        fb = {
          ...base,
          tag: g.tag,
          mixed: g.mixed,
          positivePoints: g.positivePoints,
          negativePoints: g.negativePoints,
          reason: g.reason,
          guardrail: g.actions,
          aiStatus: g.valid ? 'OK' : 'INVALID',
        }
        await set('guard', { status: g.valid ? 'done' : 'warn', detail: g.actions.join('\n') })
        addLog(booking.id, 'Guardrail check', g.valid ? 'OK' : 'FAILED', g.actions.join(' | '))
        if (!g.valid) {
          alertType = 'AI FAILED'
          alertMsg = `${who} – AI output invalid, needs human review. Full comment: "${comment}"`
        } else if (g.ownerAlert) {
          alertType = rating <= 2 ? 'LOW RATING' : 'COMPLAINT'
          alertMsg = `${who} – ${g.negativePoints.length ? 'complaint: ' + g.negativePoints.join('; ') : `tagged ${g.tag}`}.`
        }
      }
    }

    // Owner alert
    if (alertType) {
      fb.ownerAlerted = true
      addAlert(booking.id, alertType, alertMsg)
      await set('alert', { status: 'done', detail: `YES – ${alertType}: ${alertMsg}` })
    } else {
      await set('alert', { status: 'done', detail: 'NO – nothing needs the owner (logged only).' })
    }

    // Save
    fb.needsAttention = needsAttention(fb)
    setDb((d) => ({ ...d, feedback: [...d.feedback, fb] }))
    addLog(booking.id, 'Feedback saved', 'OK', `Tag: ${fb.tag}${fb.mixed ? ' (mixed)' : ''} · ${fb.needsAttention ? 'shown to owner' : 'logged only (management by exception)'}`)
    await set('save', { status: 'done', detail: fb.needsAttention ? 'Saved – listed under "Feedback needing attention".' : 'Saved – logged only (management by exception).' }, false)
    return { steps, feedback: fb }
  } catch (e) {
    // The app must never crash.
    const error = `Unexpected error: ${e instanceof Error ? e.message : String(e)}`
    const running = steps.find((s) => s.status === 'running' || s.status === 'pending')
    if (running) Object.assign(running, { status: 'failed', detail: error })
    emit()
    addLog(input.bookingId || '—', 'Feedback pipeline', 'FAILED', error)
    return { steps, error }
  }
}

/** A reply is only "sent" after the owner approves it – once. The AI never writes or sends replies. */
export function approveAndSendReply(feedbackId: string, text: string): boolean {
  const fb = getDb().feedback.find((f) => f.id === feedbackId)
  if (!fb || fb.replySentAt || !text.trim()) return false
  const t = nowIso()
  setDb((d) => ({
    ...d,
    feedback: d.feedback.map((f) => (f.id === feedbackId ? { ...f, replyDraft: text.trim(), replyApproved: 'Y', replySentAt: t } : f)),
  }))
  addLog(fb.bookingId, 'Public reply (owner approved)', 'SENT', text.trim().slice(0, 200))
  return true
}

export function saveReplyDraft(feedbackId: string, text: string) {
  setDb((d) => ({ ...d, feedback: d.feedback.map((f) => (f.id === feedbackId && !f.replySentAt ? { ...f, replyDraft: text } : f)) }))
}
