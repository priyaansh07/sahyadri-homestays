export type BookingStatus =
  | 'CONFIRMED'
  | 'NOT CONFIRMED – room taken'
  | 'ON HOLD – missing data'
  | 'ON HOLD – invalid dates'

export interface Booking {
  id: string
  createdAt: string // ISO
  name: string
  email: string
  phone: string
  room: string // R1..R12
  checkIn: string // YYYY-MM-DD
  checkOut: string // YYYY-MM-DD
  guests: number | ''
  consent: boolean
  status: BookingStatus
  clashWith?: string
  checkedOutAt?: string
  feedbackRequestedAt?: string
  contactDeletedAt?: string
}

export type Tag = 'positive' | 'neutral' | 'negative' | 'no comment' | 'NEEDS HUMAN REVIEW'

export interface Feedback {
  id: string
  bookingId: string
  guestName: string
  createdAt: string
  rating: number
  comment: string // original, owner-only
  maskedComment: string // what the AI saw
  tag: Tag
  mixed: boolean
  positivePoints: string[]
  negativePoints: string[]
  reason: string
  guardrail: string[]
  aiStatus: 'OK' | 'NOT CALLED' | 'FAILED' | 'INVALID'
  ownerAlerted: boolean
  needsAttention: boolean
  replyDraft: string
  replyApproved?: 'Y'
  replySentAt?: string
}

export type AlertType = 'ON HOLD' | 'ROOM TAKEN' | 'COMPLAINT' | 'LOW RATING' | 'AI FAILED'

export interface OwnerAlert {
  id: string
  createdAt: string
  bookingId: string
  type: AlertType
  message: string
}

export type LogResult = 'OK' | 'SENT' | 'HOLD' | 'BLOCKED' | 'FAILED'

export interface LogRow {
  id: string
  time: string
  bookingId: string
  step: string
  result: LogResult
  detail: string
}

export interface DB {
  bookings: Booking[]
  feedback: Feedback[]
  alerts: OwnerAlert[]
  logs: LogRow[]
}
