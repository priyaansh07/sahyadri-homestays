const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
// Indian mobiles: optional +91 / 91 / 0, then 10 digits starting 6–9, any spaces or dashes between digits.
const PHONE = /(?<!\d)(?:\+?91[\s-]*|0)?[6-9](?:[\s-]*\d){9}(?!\d)/g

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Runs in code BEFORE the AI sees anything.
 * Replaces e-mails, Indian phone numbers and the guest's own first/last name.
 */
export function maskPII(text: string, guestName: string): string {
  let out = text.replace(EMAIL, '[EMAIL]').replace(PHONE, '[PHONE]')
  const parts = guestName.trim().split(/\s+/).filter((p) => p.length >= 2)
  if (parts.length > 1) out = out.replace(new RegExp(`\\b${escapeRe(parts.join(' '))}\\b`, 'gi'), '[NAME]')
  for (const p of parts) out = out.replace(new RegExp(`\\b${escapeRe(p)}\\b`, 'gi'), '[NAME]')
  return out
}
