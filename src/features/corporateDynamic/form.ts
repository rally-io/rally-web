import { isValidIsraeliLocal, normalizeIsraeliLocal } from '@/components/corporate/phone'
import type {
  ApiFailure, CustomQuestion, ParticipantInput, PublicCategory, PublicRegistrationRequest,
} from './types'

export type AnswerValue = string | string[] | boolean

export interface ParticipantState {
  firstName: string
  lastName: string
  countryCode: string
  /** Local digits only (no country code, no trunk 0). */
  phone: string
  email: string
  /** '' = not given. Otherwise the band's lower bound as a string. */
  skillLevel: string
}

export interface FormState {
  tournamentId: string
  participants: ParticipantState[]
  requestedLevel: string
  preferredDay: string
  /** question id -> one value per participant (index 0 only for a shared question). */
  answers: Record<string, AnswerValue[]>
  termsAccepted: boolean
  /** Honeypot. Real users never see it. */
  website: string
  evidence: Record<1 | 2, File[]>
}

/** Field errors are i18n keys under `corporate.dyn.err.*`, keyed by field path. */
export type FieldErrors = Record<string, string>

/** Everything validation needs to know about the event, flattened out of the landing config. */
export interface FormRules {
  categories: PublicCategory[]
  /** Per-event: false makes the field optional (an empty one is valid; a typed one must still be well-formed). */
  requirePhone: boolean
  requireEmail: boolean
  askLevel: boolean
  levelOptions: string[]
  askPreferredDay: boolean
  dayOptions: string[]
  questions: CustomQuestion[]
  termsRequired: boolean
  termsShown: boolean
  evidenceRequired: boolean
  evidencePerParticipant: boolean
}

export const COUNTRY_CODES = ['+972', '+1', '+44', '+33', '+49', '+7', '+971', '+90', '+30', '+357'] as const
export const DEFAULT_COUNTRY_CODE = '+972'

export function emptyParticipant(): ParticipantState {
  return { firstName: '', lastName: '', countryCode: DEFAULT_COUNTRY_CODE, phone: '', email: '', skillLevel: '' }
}

export function emptyAnswer(q: CustomQuestion): AnswerValue {
  if (q.type === 'checkbox') return false
  if (q.type === 'multiselect') return []
  return ''
}

export function initialFormState(categories: PublicCategory[], questions: CustomQuestion[]): FormState {
  const first = categories[0]
  const answers: Record<string, AnswerValue[]> = {}
  for (const q of questions) answers[q.id] = [emptyAnswer(q), emptyAnswer(q)]
  return {
    tournamentId: categories.length === 1 && first ? first.tournament_id : '',
    participants: [emptyParticipant(), emptyParticipant()],
    requestedLevel: '',
    preferredDay: '',
    answers,
    termsAccepted: false,
    website: '',
    evidence: { 1: [], 2: [] },
  }
}

/** Local phone digits for the chosen country: Israeli numbers keep the shared 9-digit rule. */
export function normalizePhone(countryCode: string, raw: string): string {
  if (countryCode === DEFAULT_COUNTRY_CODE) return normalizeIsraeliLocal(raw)
  return raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 14)
}

export function isValidPhone(countryCode: string, local: string): boolean {
  if (countryCode === DEFAULT_COUNTRY_CODE) return isValidIsraeliLocal(local)
  return local.length >= 6 && local.length <= 14
}

// Same shape the API enforces (EMAIL_RE): something@something.something, no spaces.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
export const isValidEmail = (email: string) => EMAIL_RE.test(email.trim())

// Consumer mailboxes. Used ONLY to nudge when the event is restricted to company addresses; the
// API alone decides (the real allowlist is never sent to the browser).
const FREE_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com',
  'walla.co.il', 'walla.com', 'aol.com', 'proton.me', 'protonmail.com', 'msn.com',
])

/**
 * With an allowlist, only ONE of the two players needs a company address (the other may use any),
 * and the single player of a singles category must. The allowlist itself never reaches the browser,
 * so this is a nudge, never a block: true when the event is restricted, at least one email has
 * been typed, and every typed email is clearly a personal mailbox.
 */
export function noCompanyEmailLikely(emails: string[], restricted: boolean): boolean {
  if (!restricted) return false
  const typed = emails.map((e) => e.trim()).filter((e) => isValidEmail(e))
  if (typed.length === 0) return false
  return typed.every((e) => FREE_MAIL.has(e.toLowerCase().split('@')[1] ?? ''))
}

export function categoryById(categories: PublicCategory[], id: string): PublicCategory | undefined {
  return categories.find((c) => c.tournament_id === id)
}

export function participantCountFor(categories: PublicCategory[], tournamentId: string): 1 | 2 {
  return categoryById(categories, tournamentId)?.participants_per_registration ?? 2
}

const isBlank = (v: AnswerValue | undefined) =>
  v === undefined || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'string' && v.trim() === '')

export function validateForm(form: FormState, rules: FormRules): FieldErrors {
  const errors: FieldErrors = {}
  const req = 'corporate.dyn.err.required'

  if (!form.tournamentId || !categoryById(rules.categories, form.tournamentId)) errors.category = 'corporate.dyn.err.category'
  const count = participantCountFor(rules.categories, form.tournamentId)

  const seenPhones = new Map<string, number>()
  const seenEmails = new Map<string, number>()
  for (let i = 0; i < count; i++) {
    const p = form.participants[i]
    if (!p.firstName.trim()) errors[`p.${i}.firstName`] = req
    // Empty is only an error when the event insists; anything typed must still be well-formed.
    if (p.phone === '' ? rules.requirePhone : !isValidPhone(p.countryCode, p.phone)) errors[`p.${i}.phone`] = 'corporate.dyn.err.phone'
    if (!p.email.trim()) {
      if (rules.requireEmail) errors[`p.${i}.email`] = req
    } else if (!isValidEmail(p.email)) errors[`p.${i}.email`] = 'corporate.dyn.err.email'

    const phoneKey = `${p.countryCode}${p.phone}`
    if (p.phone !== '' && isValidPhone(p.countryCode, p.phone)) {
      if (seenPhones.has(phoneKey)) errors[`p.${i}.phone`] = 'corporate.dyn.err.samePhone'
      seenPhones.set(phoneKey, i)
    }
    const emailKey = p.email.trim().toLowerCase()
    if (isValidEmail(p.email)) {
      if (seenEmails.has(emailKey)) errors[`p.${i}.email`] = 'corporate.dyn.err.sameEmail'
      seenEmails.set(emailKey, i)
    }
  }

  if (rules.levelOptions.length > 0 && !form.requestedLevel) errors.requestedLevel = req

  for (const q of rules.questions) {
    if (q.archived || !q.required) continue
    const slots = q.per_participant ? count : 1
    for (let i = 0; i < slots; i++) {
      const v = form.answers[q.id]?.[i]
      const missing = q.type === 'checkbox' ? v !== true : isBlank(v)
      if (missing) errors[`q.${q.id}.${i}`] = req
    }
  }

  if (rules.termsShown && rules.termsRequired && !form.termsAccepted) errors.terms = 'corporate.dyn.err.termsRequired'

  if (rules.evidenceRequired) {
    const slots = rules.evidencePerParticipant ? count : 1
    for (let i = 0; i < slots; i++) {
      if (form.evidence[(i + 1) as 1 | 2].length === 0) errors[`evidence.${i}`] = 'corporate.dyn.err.evidenceRequired'
    }
  }
  return errors
}

/** The POST body. `now` is injectable so a test does not depend on the clock. */
export function buildRequest(
  form: FormState,
  rules: FormRules,
  startedAtMs: number,
): PublicRegistrationRequest {
  const count = participantCountFor(rules.categories, form.tournamentId)
  const participants: ParticipantInput[] = form.participants.slice(0, count).map((p) => ({
    first_name: p.firstName.trim(),
    last_name: p.lastName.trim(),
    country_code: p.countryCode,
    phone: p.phone,
    // An optional, empty email/phone goes out as '' — the API stores an empty phone and skips it in dedupe.
    email: p.email.trim().toLowerCase(),
    skill_level: rules.askLevel && p.skillLevel !== '' ? Number(p.skillLevel) : null,
  }))

  const answers: Record<string, unknown> = {}
  for (const q of rules.questions) {
    if (q.archived) continue
    const values = form.answers[q.id] ?? []
    if (q.per_participant) {
      // [p1, p2]; a blank optional answer stays in its slot so the index still means the person.
      const perPerson = values.slice(0, count)
      if (perPerson.some((v) => q.type === 'checkbox' || !isBlank(v))) answers[q.id] = perPerson
    } else {
      const v = values[0]
      if (q.type === 'checkbox' || !isBlank(v)) answers[q.id] = v
    }
  }

  return {
    tournament_id: form.tournamentId,
    participants,
    requested_level: form.requestedLevel || null,
    preferred_day: form.preferredDay || null,
    answers,
    terms_accepted: form.termsAccepted,
    website: form.website,
    started_at_ms: startedAtMs,
  }
}

export interface SubmitFailureView {
  fieldErrors: FieldErrors
  /** i18n key for the banner above the submit button, when no field owns the problem. */
  banner: string | null
  /** The event stopped taking registrations: the page re-reads its config and shows the closed card. */
  closed: boolean
}

/** Maps rally-api's error codes onto inline field errors and (he+en) copy. */
export function mapSubmitFailure(
  failure: ApiFailure,
  questions: CustomQuestion[],
  count: number,
  /** The first participant who typed an email: where an email-domain refusal is shown. */
  firstEmailIndex = 0,
): SubmitFailureView {
  const fieldErrors: FieldErrors = {}
  const index = Number(failure.details?.index ?? 0)
  switch (failure.code) {
    case 'CORPORATE_DUPLICATE_PARTICIPANT': {
      const field = failure.details?.field === 'email' ? 'email' : 'phone'
      fieldErrors[`p.${index}.${field}`] = field === 'email' ? 'corporate.dyn.err.duplicateEmail' : 'corporate.dyn.err.duplicatePhone'
      return { fieldErrors, banner: null, closed: false }
    }
    case 'CORPORATE_EMAIL_DOMAIN':
      // Only one of the two emails has to be a company one, so the server's verdict is about the
      // pair; it is shown on the first email that was typed.
      fieldErrors[`p.${firstEmailIndex}.email`] = count === 1 ? 'corporate.dyn.err.emailDomainSingle' : 'corporate.dyn.err.emailDomain'
      return { fieldErrors, banner: null, closed: false }
    case 'CORPORATE_TERMS_REQUIRED':
      fieldErrors.terms = 'corporate.dyn.err.termsRequired'
      return { fieldErrors, banner: null, closed: false }
    case 'CORPORATE_ANSWER_REQUIRED': {
      const id = String(failure.details?.question_id ?? '')
      const q = questions.find((x) => x.id === id)
      const slots = q?.per_participant ? count : 1
      for (let i = 0; i < slots; i++) fieldErrors[`q.${id}.${i}`] = 'corporate.dyn.err.required'
      return { fieldErrors, banner: q ? null : 'corporate.dyn.err.generic', closed: false }
    }
    case 'CORPORATE_REGISTRATION_CLOSED':
      return { fieldErrors, banner: 'corporate.dyn.err.closed', closed: true }
    case 'CORPORATE_EVIDENCE_REQUIRED':
      return { fieldErrors, banner: 'corporate.dyn.err.evidenceRequired', closed: false }
    case 'RATE_LIMITED':
      return { fieldErrors, banner: 'corporate.dyn.err.rateLimited', closed: false }
    case 'NETWORK_ERROR':
      return { fieldErrors, banner: 'corporate.dyn.err.network', closed: false }
    default:
      return { fieldErrors, banner: failure.status === 429 ? 'corporate.dyn.err.rateLimited' : 'corporate.dyn.err.generic', closed: false }
  }
}

/** Every `corporate.dyn.err.*` key this module can return — the explicit list the i18n test checks. */
export const ERROR_KEYS = [
  'required', 'category', 'phone', 'email', 'samePhone', 'sameEmail', 'termsRequired', 'evidenceRequired',
  'duplicatePhone', 'duplicateEmail', 'emailDomain', 'emailDomainSingle', 'closed', 'rateLimited', 'network', 'generic',
] as const
