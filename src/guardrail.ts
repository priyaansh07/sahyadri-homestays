export const RULE_NO_POST = 'Agent cannot post publicly: reply column is for a human only'

export interface GuardrailResult {
  tag: 'positive' | 'neutral' | 'negative'
  mixed: boolean
  positivePoints: string[]
  negativePoints: string[]
  reason: string
  actions: string[]
  valid: boolean
  needsReview: boolean
  ownerAlert: boolean
}

const toList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => (x as string).trim()) : []

/** GUARDRAIL in code (not AI), applied to Gemini's raw answer. */
export function applyGuardrail(rawAnswer: string, rating: number): GuardrailResult {
  const actions: string[] = []
  let parsed: Record<string, unknown> | null = null
  try {
    const cleaned = rawAnswer.replace(/```(?:json)?/gi, '').trim()
    const obj = JSON.parse(cleaned)
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) parsed = obj
  } catch {
    parsed = null
  }

  const rawTag = typeof parsed?.tag === 'string' ? parsed.tag.trim().toLowerCase() : ''
  if (!parsed || !['positive', 'neutral', 'negative'].includes(rawTag)) {
    actions.push('Rule: AI output invalid (not JSON or bad tag) → neutral, needs human review')
    actions.push(RULE_NO_POST)
    return {
      tag: 'neutral',
      mixed: false,
      positivePoints: [],
      negativePoints: [],
      reason: '(AI output invalid)',
      actions,
      valid: false,
      needsReview: true,
      ownerAlert: true,
    }
  }

  let tag = rawTag as GuardrailResult['tag']
  let mixed = parsed.mixed === true || parsed.mixed === 'true'
  const positivePoints = toList(parsed.positive_points)
  const negativePoints = toList(parsed.negative_points)
  const reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : ''

  if (tag === 'positive' && negativePoints.length > 0) {
    tag = 'neutral'
    mixed = true
    actions.push('Rule: complaint found, cannot be positive → neutral (mixed)')
  }
  if (tag === 'positive' && rating <= 2) {
    tag = 'neutral'
    actions.push(`Rule: rating ${rating} (1–2), cannot be positive → neutral`)
  }
  if (!mixed && positivePoints.length > 0 && negativePoints.length > 0) {
    mixed = true
    actions.push('Rule: praise and complaint both present → mixed = YES')
  }
  actions.push(RULE_NO_POST)

  return {
    tag,
    mixed,
    positivePoints,
    negativePoints,
    reason,
    actions,
    valid: true,
    needsReview: false,
    ownerAlert: tag === 'negative' || negativePoints.length > 0 || rating <= 2,
  }
}
