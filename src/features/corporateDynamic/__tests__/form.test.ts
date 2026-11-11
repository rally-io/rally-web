import { describe, expect, it } from 'vitest'
import {
  buildRequest, initialFormState, noCompanyEmailLikely, mapSubmitFailure, validateForm, ERROR_KEYS,
  type FormState,
} from '../form'
import { rulesFor } from '../rules'
import { AMERICANO, DOUBLES, Q_FOOD, Q_OLD, Q_SIZE, Q_TEXT, config, eventFixture } from './fixtures'
import en from '@/i18n/locales/en.json'
import he from '@/i18n/locales/he.json'

function filled(over: Partial<FormState> = {}, questions = rulesFor(eventFixture()).questions): FormState {
  const f = initialFormState([DOUBLES], questions)
  f.participants[0] = { firstName: 'Dana', lastName: 'Levi', countryCode: '+972', phone: '501234567', email: 'Dana@Acme.com', skillLevel: '3' }
  f.participants[1] = { firstName: 'Omer', lastName: '', countryCode: '+972', phone: '521112222', email: 'omer@acme.com', skillLevel: '' }
  f.termsAccepted = true
  return { ...f, ...over }
}

describe('validateForm', () => {
  const rules = rulesFor(eventFixture())

  it('accepts a complete pair', () => {
    expect(validateForm(filled(), rules)).toEqual({})
  })

  it('requires a category, names, phones and emails for BOTH players of a doubles category', () => {
    const errors = validateForm(initialFormState([DOUBLES], []), rules)
    expect(errors.p0).toBeUndefined()
    expect(errors['p.0.firstName']).toBe('corporate.dyn.err.required')
    expect(errors['p.1.firstName']).toBe('corporate.dyn.err.required')
    expect(errors['p.1.phone']).toBe('corporate.dyn.err.phone')
    expect(errors['p.1.email']).toBe('corporate.dyn.err.required')
  })

  it('asks a singles (Americano) category for ONE participant only', () => {
    const rules1 = rulesFor(eventFixture({ categories: [DOUBLES, AMERICANO] }))
    const f = filled({ tournamentId: AMERICANO.tournament_id })
    f.participants[1] = { ...f.participants[1], firstName: '', phone: '', email: '' }
    expect(validateForm(f, rules1)).toEqual({})
  })

  it('rejects a malformed email and an Israeli number of the wrong length', () => {
    const f = filled()
    f.participants[0].email = 'not-an-email'
    f.participants[0].phone = '12345'
    const errors = validateForm(f, rules)
    expect(errors['p.0.email']).toBe('corporate.dyn.err.email')
    expect(errors['p.0.phone']).toBe('corporate.dyn.err.phone')
  })

  it('rejects the same phone or email typed for both players', () => {
    const f = filled()
    f.participants[1].phone = f.participants[0].phone
    f.participants[1].email = 'DANA@acme.com'
    const errors = validateForm(f, rules)
    expect(errors['p.1.phone']).toBe('corporate.dyn.err.samePhone')
    expect(errors['p.1.email']).toBe('corporate.dyn.err.sameEmail')
  })

  it('requires required terms consent only when the terms component is on', () => {
    expect(validateForm(filled({ termsAccepted: false }), rules).terms).toBe('corporate.dyn.err.termsRequired')
    const noTerms = rulesFor(eventFixture({
      landing_config: config({ components: config().components.map((c) => (c.type === 'terms' ? { ...c, enabled: false } : c)) }),
    }))
    expect(validateForm(filled({ termsAccepted: false }), noTerms).terms).toBeUndefined()
  })

  it('enforces required custom questions per participant and skips archived ones', () => {
    const qrules = rulesFor(eventFixture({ landing_config: config({ questions: [Q_TEXT, Q_SIZE, Q_FOOD, Q_OLD] }) }))
    const f = filled({}, qrules.questions)
    f.answers[Q_SIZE.id] = ['M', '']
    const errors = validateForm(f, qrules)
    expect(errors[`q.${Q_TEXT.id}.0`]).toBe('corporate.dyn.err.required')
    expect(errors[`q.${Q_SIZE.id}.0`]).toBeUndefined()
    expect(errors[`q.${Q_SIZE.id}.1`]).toBe('corporate.dyn.err.required')
    expect(errors[`q.${Q_FOOD.id}.0`]).toBeUndefined() // optional
    expect(Object.keys(errors).some((k) => k.includes(Q_OLD.id))).toBe(false)
  })

  it('requires a level category and a document only when configured', () => {
    const comps = config().components.map((c) =>
      c.type === 'registration' ? { ...c, level_options: ['A', 'B'] }
        : c.type === 'evidence' ? { ...c, enabled: true, required: true } : c)
    const r = rulesFor(eventFixture({ landing_config: config({ components: comps }) }))
    const errors = validateForm(filled(), r)
    expect(errors.requestedLevel).toBe('corporate.dyn.err.required')
    expect(errors['evidence.0']).toBe('corporate.dyn.err.evidenceRequired')
    expect(errors['evidence.1']).toBe('corporate.dyn.err.evidenceRequired')
    const f = filled({ requestedLevel: 'A' })
    f.evidence = { 1: [new File(['x'], 'a.pdf')], 2: [new File(['x'], 'b.pdf')] }
    expect(validateForm(f, r)).toEqual({})
  })
})

describe('buildRequest', () => {
  it('shapes participants, answers ([p1,p2] for per-participant), honeypot and started_at_ms', () => {
    const qrules = rulesFor(eventFixture({ landing_config: config({ questions: [Q_TEXT, Q_SIZE, Q_FOOD] }) }))
    const f = filled({}, qrules.questions)
    f.answers[Q_TEXT.id] = ['Sales', '']
    f.answers[Q_SIZE.id] = ['M', 'L']
    f.answers[Q_FOOD.id] = [[], []]
    f.tournamentId = DOUBLES.tournament_id
    const req = buildRequest(f, qrules, 1234)
    expect(req.tournament_id).toBe(DOUBLES.tournament_id)
    expect(req.participants).toEqual([
      { first_name: 'Dana', last_name: 'Levi', country_code: '+972', phone: '501234567', email: 'dana@acme.com', skill_level: 3 },
      { first_name: 'Omer', last_name: '', country_code: '+972', phone: '521112222', email: 'omer@acme.com', skill_level: null },
    ])
    expect(req.answers).toEqual({ [Q_TEXT.id]: 'Sales', [Q_SIZE.id]: ['M', 'L'] })
    expect(req.website).toBe('')
    expect(req.started_at_ms).toBe(1234)
    expect(req.terms_accepted).toBe(true)
    expect(req.requested_level).toBeNull()
  })

  it('sends one participant for a singles category and never the allowlist', () => {
    const rules1 = rulesFor(eventFixture({ categories: [DOUBLES, AMERICANO], email_domain_restricted: true }))
    const req = buildRequest(filled({ tournamentId: AMERICANO.tournament_id }), rules1, 1)
    expect(req.participants).toHaveLength(1)
    expect(JSON.stringify(req)).not.toMatch(/allowlist|domain/i)
  })

  it('passes a filled honeypot through, so the API can reject it', () => {
    expect(buildRequest(filled({ website: 'http://spam' }), rulesFor(eventFixture()), 1).website).toBe('http://spam')
  })
})

describe('email domain hint (client-side only)', () => {
  it('nudges only when the event is restricted and every typed email is a personal mailbox', () => {
    expect(noCompanyEmailLikely(['x@gmail.com', 'y@hotmail.com'], true)).toBe(true)
    expect(noCompanyEmailLikely(['x@gmail.com'], true)).toBe(true)
    expect(noCompanyEmailLikely(['x@gmail.com', 'y@hotmail.com'], false)).toBe(false)
    // ONE company email is enough for a pair: no nudge while either looks like it could be one.
    expect(noCompanyEmailLikely(['x@gmail.com', 'y@acme.com'], true)).toBe(false)
    expect(noCompanyEmailLikely(['x@gmail.com', ''], true)).toBe(true)
    expect(noCompanyEmailLikely(['', ''], true)).toBe(false)
    expect(noCompanyEmailLikely(['broken'], true)).toBe(false)
  })
})

describe('optional phone / email (require_phone / require_email = false)', () => {
  const optional = rulesFor(eventFixture({ landing_config: config({ require_phone: false, require_email: false }) }))
  const blank = (f: FormState) => {
    f.participants[0] = { ...f.participants[0], phone: '', email: '' }
    f.participants[1] = { ...f.participants[1], phone: '', email: '' }
    return f
  }

  it('reads the flags from the config, defaulting to required', () => {
    expect(rulesFor(eventFixture())).toMatchObject({ requirePhone: true, requireEmail: true })
    expect(optional).toMatchObject({ requirePhone: false, requireEmail: false })
    expect(rulesFor(eventFixture({ landing_config: config({ require_email: false }) }))).toMatchObject({ requirePhone: true, requireEmail: false })
  })

  it('an empty phone and email are valid when optional, and still required otherwise', () => {
    expect(validateForm(blank(filled()), optional)).toEqual({})
    const strict = validateForm(blank(filled()), rulesFor(eventFixture()))
    expect(strict['p.0.phone']).toBe('corporate.dyn.err.phone')
    expect(strict['p.0.email']).toBe('corporate.dyn.err.required')
  })

  it('still checks the FORMAT of whatever is typed', () => {
    const f = blank(filled())
    f.participants[0].phone = '123'
    f.participants[1].email = 'nope'
    const errors = validateForm(f, optional)
    expect(errors['p.0.phone']).toBe('corporate.dyn.err.phone')
    expect(errors['p.1.email']).toBe('corporate.dyn.err.email')
    expect(errors['p.0.email']).toBeUndefined()
  })

  it('two empty phones/emails are not "the same" as each other', () => {
    expect(validateForm(blank(filled()), optional)).toEqual({})
  })

  it('sends empty strings for the missing ones', () => {
    const req = buildRequest(blank(filled()), optional, 1)
    expect(req.participants.map((p) => [p.phone, p.email])).toEqual([['', ''], ['', '']])
  })
})

describe('mapSubmitFailure', () => {
  const qs = [Q_SIZE, Q_TEXT]
  const f = (code: string, details?: Record<string, unknown>, status = 400) => mapSubmitFailure({ status, code, message: '', details }, qs, 2)

  it('puts a duplicate on the offending participant and field', () => {
    expect(f('CORPORATE_DUPLICATE_PARTICIPANT', { index: 1, field: 'email' }).fieldErrors).toEqual({ 'p.1.email': 'corporate.dyn.err.duplicateEmail' })
    expect(f('CORPORATE_DUPLICATE_PARTICIPANT', { index: 0, field: 'phone' }).fieldErrors).toEqual({ 'p.0.phone': 'corporate.dyn.err.duplicatePhone' })
  })
  it('shows an email-domain refusal on the first TYPED email, whatever index the server names', () => {
    expect(f('CORPORATE_EMAIL_DOMAIN', { index: 0 }).fieldErrors).toEqual({ 'p.0.email': 'corporate.dyn.err.emailDomain' })
    expect(mapSubmitFailure({ status: 400, code: 'CORPORATE_EMAIL_DOMAIN', message: '', details: { index: 0 } }, qs, 2, 1).fieldErrors)
      .toEqual({ 'p.1.email': 'corporate.dyn.err.emailDomain' })
    expect(mapSubmitFailure({ status: 400, code: 'CORPORATE_EMAIL_DOMAIN', message: '' }, qs, 1).fieldErrors)
      .toEqual({ 'p.0.email': 'corporate.dyn.err.emailDomainSingle' })
  })
  it('maps the terms and answer-required codes inline', () => {
    expect(f('CORPORATE_TERMS_REQUIRED').fieldErrors).toEqual({ terms: 'corporate.dyn.err.termsRequired' })
    expect(f('CORPORATE_ANSWER_REQUIRED', { question_id: Q_SIZE.id }).fieldErrors).toEqual({
      [`q.${Q_SIZE.id}.0`]: 'corporate.dyn.err.required', [`q.${Q_SIZE.id}.1`]: 'corporate.dyn.err.required',
    })
  })
  it('flags a closed event, and banners rate limits, network and unknown failures', () => {
    expect(f('CORPORATE_REGISTRATION_CLOSED')).toMatchObject({ banner: 'corporate.dyn.err.closed', closed: true })
    expect(f('RATE_LIMITED', undefined, 429).banner).toBe('corporate.dyn.err.rateLimited')
    expect(f('SERVER_ERROR', undefined, 429).banner).toBe('corporate.dyn.err.rateLimited')
    expect(f('NETWORK_ERROR').banner).toBe('corporate.dyn.err.network')
    expect(f('WHATEVER', undefined, 500).banner).toBe('corporate.dyn.err.generic')
    expect(f('CORPORATE_EVIDENCE_REQUIRED').banner).toBe('corporate.dyn.err.evidenceRequired')
  })
})

// Dynamic keys (`t(errors[...])`, `t(\`...${state}\`)`) are invisible to literalKeys.test.ts, so every
// one the code can build is listed here and must exist in BOTH locales.
describe('corporate.dyn.* dynamic keys exist in he and en', () => {
  const keys: string[] = [
    ...ERROR_KEYS.map((k) => `corporate.dyn.err.${k}`),
    ...['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((d) => `corporate.dyn.day.${d}`),
    ...['confirmed', 'waitlisted', 'removed', 'cancelled'].flatMap((s) => [`corporate.dyn.status.${s}.title`, `corporate.dyn.status.${s}.body`]),
    'corporate.dyn.status.waitlisted.position',
    ...['not_open', 'paused', 'closed', 'cancelled'].flatMap((s) => [`corporate.dyn.state.${s}.title`, `corporate.dyn.state.${s}.body`]),
    ...['confirmed', 'waitlisted'].map((s) => `corporate.dyn.roster.status.${s}`),
    ...['fixErrors', 'emailRulePair', 'emailRuleSingle', 'personalEmailPair', 'personalEmailSingle'].map((k) => `corporate.dyn.${k}`),
  ]
  const lookup = (bundle: unknown, key: string) =>
    key.split('.').reduce<unknown>((n, p) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[p] : undefined), bundle)

  it.each(keys)('%s', (key) => {
    expect(typeof lookup(en, key)).toBe('string')
    expect(typeof lookup(he, key)).toBe('string')
  })

  it('the keys form.ts returns are all in ERROR_KEYS', () => {
    const returned = [
      f2('CORPORATE_DUPLICATE_PARTICIPANT', { index: 0, field: 'phone' }), f2('CORPORATE_DUPLICATE_PARTICIPANT', { index: 0, field: 'email' }),
      f2('CORPORATE_EMAIL_DOMAIN'), mapSubmitFailure({ status: 400, code: 'CORPORATE_EMAIL_DOMAIN', message: '' }, [Q_TEXT], 1), f2('CORPORATE_TERMS_REQUIRED'), f2('CORPORATE_ANSWER_REQUIRED', { question_id: Q_TEXT.id }),
      f2('CORPORATE_REGISTRATION_CLOSED'), f2('CORPORATE_EVIDENCE_REQUIRED'), f2('RATE_LIMITED'), f2('NETWORK_ERROR'), f2('X'),
    ].flatMap((v) => [...Object.values(v.fieldErrors), ...(v.banner ? [v.banner] : [])])
    for (const key of returned) expect(ERROR_KEYS).toContain(key.replace('corporate.dyn.err.', ''))
  })
  function f2(code: string, details?: Record<string, unknown>) {
    return mapSubmitFailure({ status: 400, code, message: '', details }, [Q_TEXT], 1)
  }
})
