import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Field } from '@/components/corporate/Field'
import { Select } from '@/components/ui/select'
import { registerForEvent, toApiFailure } from '../api'
import {
  buildRequest, categoryById, initialFormState, mapSubmitFailure, noCompanyEmailLikely, participantCountFor, validateForm,
  type AnswerValue, type FieldErrors, type FormState, type ParticipantState,
} from '../form'
import { rulesFor, WEEKDAY_CODES } from '../rules'
import { findComponent, type PublicCorporateEvent, type PublicRegistrationResult } from '../types'
import { EvidenceBlock } from './EvidenceBlock'
import { FormToast } from './FormToast'
import { ParticipantFields } from './ParticipantFields'
import { QuestionField } from './QuestionField'

export interface RegisteredPayload {
  result: PublicRegistrationResult
  evidence: Record<1 | 2, File[]>
  slots: (1 | 2)[]
}

/** The registration section: category, 1–2 participants, extras, questions, evidence, consent. */
export function RegistrationForm({
  event, startedAtMs, onRegistered, onClosed,
}: {
  event: PublicCorporateEvent
  /** Page-load time; sent so the API can reject an instant (scripted) submit. */
  startedAtMs: number
  onRegistered: (payload: RegisteredPayload) => void
  onClosed: () => void
}) {
  const { t } = useTranslation()
  const rules = useMemo(() => rulesFor(event), [event])
  const cfg = event.landing_config
  const terms = findComponent(cfg, 'terms')
  const evidence = findComponent(cfg, 'evidence')
  const [form, setForm] = useState<FormState>(() => initialFormState(event.categories, rules.questions))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  // Bumped on every refused submit (client or API field errors): scrolls to the first problem and raises the toast.
  const [errorTick, setErrorTick] = useState(0)

  const category = categoryById(event.categories, form.tournamentId)
  const count = participantCountFor(event.categories, form.tournamentId)
  const multiCategory = event.categories.length > 1
  const waitlisting = Boolean(category?.is_full)
  const perParticipantQuestions = rules.questions.filter((q) => q.per_participant)
  const sharedQuestions = rules.questions.filter((q) => !q.per_participant)
  const evidenceSlots: (1 | 2)[] = evidence?.enabled
    ? (evidence.per_participant && count === 2 ? [1, 2] : [1])
    : []

  const patch = (next: Partial<FormState>) => setForm((f) => ({ ...f, ...next }))
  const setParticipant = (i: number, next: ParticipantState) =>
    setForm((f) => ({ ...f, participants: f.participants.map((p, idx) => (idx === i ? next : p)) }))
  const setAnswer = (qid: string, i: number, value: AnswerValue) =>
    setForm((f) => ({ ...f, answers: { ...f.answers, [qid]: (f.answers[qid] ?? []).map((v, idx) => (idx === i ? value : v)) } }))

  // After the errors have rendered: smooth-scroll to the first invalid field (DOM order is visual
  // order) and focus it. The field errors themselves stay on screen until the next submit.
  useEffect(() => {
    if (errorTick === 0) return
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (!first) return
    first.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    first.focus?.({ preventScroll: true })
  }, [errorTick])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setBanner(null)
    const found = validateForm(form, rules)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setErrorTick((n) => n + 1)
      return
    }
    setSubmitting(true)
    try {
      const result = await registerForEvent(event.slug, buildRequest(form, rules, startedAtMs))
      onRegistered({ result, evidence: form.evidence, slots: evidenceSlots })
    } catch (error) {
      const firstTyped = form.participants.slice(0, count).findIndex((p) => p.email.trim() !== '')
      const view = mapSubmitFailure(toApiFailure(error), rules.questions, count, Math.max(firstTyped, 0))
      setErrors(view.fieldErrors)
      setBanner(view.banner)
      if (Object.keys(view.fieldErrors).length > 0) setErrorTick((n) => n + 1)
      if (view.closed) onClosed()
      setSubmitting(false)
    }
  }

  const levelHint = category?.level_label ?? null

  return (
    <form
      ref={formRef} onSubmit={handleSubmit} noValidate
      className="rounded-2xl bg-rally-surface border border-rally-border p-5 sm:p-7 shadow-lg space-y-6"
      data-testid="corporate-dynamic-form"
    >
      <FormToast tick={errorTick} />
      {multiCategory && (
        <fieldset className="space-y-3" disabled={submitting}>
          <legend className="font-display font-bold text-sm text-rally-text mb-2">{t('corporate.dyn.categoryTitle')}</legend>
          {event.categories.map((c) => {
            const selected = c.tournament_id === form.tournamentId
            return (
              <label
                key={c.tournament_id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors',
                  selected ? 'border-rally-accent bg-rally-accent/10' : 'border-rally-border hover:border-rally-border-strong',
                )}
              >
                <input
                  type="radio" name="corp-category" value={c.tournament_id} checked={selected}
                  aria-invalid={!!errors.category && c === event.categories[0]}
                  onChange={() => patch({ tournamentId: c.tournament_id })}
                  className="mt-1 h-4 w-4 accent-[var(--color-rally-accent,#ccff00)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span dir="auto" className="font-display font-bold text-sm text-rally-text">{c.name}</span>
                    {c.is_full && (
                      <span className="rounded-full border border-rally-warning/50 bg-rally-warning/10 px-2 py-0.5 text-xs font-bold text-rally-warning">
                        {t('corporate.dyn.categoryFull')}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-rally-text-muted">
                    {c.level_label && <span dir="ltr">{c.level_label}</span>}
                    <span>{c.participants_per_registration === 1 ? t('corporate.dyn.formatSingles') : t('corporate.dyn.formatPairs')}</span>
                  </span>
                  {c.is_full && <span className="mt-1 block text-xs text-rally-text-2">{t('corporate.dyn.categoryFullHint')}</span>}
                </span>
              </label>
            )
          })}
          {errors.category && <p role="alert" className="text-xs text-rally-error">{t(errors.category)}</p>}
        </fieldset>
      )}

      {!multiCategory && waitlisting && (
        <p role="status" className="rounded-xl border border-rally-warning/40 bg-rally-warning/10 p-4 text-sm text-rally-text-2">
          {t('corporate.dyn.categoryFullHint')}
        </p>
      )}

      {(form.tournamentId || !multiCategory) && (
        <>
          <p className="flex items-center gap-2 text-xs text-rally-text-muted">
            <Users className="w-4 h-4" aria-hidden />
            {count === 1 ? t('corporate.dyn.registersOne') : t('corporate.dyn.registersTwo')}
            {levelHint && <span dir="ltr">· {levelHint}</span>}
          </p>

          {event.email_domain_restricted && (
            // With an allowlist only ONE of the two emails has to be a company one (a singles
            // registration's only email must be). The list itself is never sent to the browser.
            <p data-testid="email-rule" className="rounded-xl border border-rally-border-subtle bg-rally-surface-2/40 p-3 text-sm text-rally-text-2">
              {count === 1 ? t('corporate.dyn.emailRuleSingle') : t('corporate.dyn.emailRulePair')}
            </p>
          )}

          {form.participants.slice(0, count).map((p, i) => (
            <ParticipantFields
              key={i} index={i} total={count} value={p} onChange={(next) => setParticipant(i, next)}
              errors={errors} askLevel={rules.askLevel} requirePhone={rules.requirePhone} requireEmail={rules.requireEmail} disabled={submitting}
            >
              {perParticipantQuestions.map((q) => (
                <QuestionField
                  key={q.id} question={q} idSuffix={`p${i}`} disabled={submitting}
                  value={form.answers[q.id]?.[i]} onChange={(v) => setAnswer(q.id, i, v)}
                  error={errors[`q.${q.id}.${i}`]}
                />
              ))}
            </ParticipantFields>
          ))}

          {noCompanyEmailLikely(form.participants.slice(0, count).map((p) => p.email), event.email_domain_restricted) && (
            <p data-testid="email-hint" role="status" className="text-xs text-rally-warning">
              {count === 1 ? t('corporate.dyn.personalEmailSingle') : t('corporate.dyn.personalEmailPair')}
            </p>
          )}

          {rules.levelOptions.length > 0 && (
            <Field label={t('corporate.dyn.requestedLevel')} hint={t('corporate.dyn.requestedLevelHint')} error={errors.requestedLevel ? t(errors.requestedLevel) : undefined} htmlFor="corp-requested-level">
              <Select id="corp-requested-level" disabled={submitting} aria-invalid={!!errors.requestedLevel} value={form.requestedLevel} onChange={(e) => patch({ requestedLevel: e.target.value })}>
                <option value="">{t('corporate.dyn.choose')}</option>
                {rules.levelOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
          )}

          {rules.askPreferredDay && rules.dayOptions.length > 0 && (
            <Field label={t('corporate.dyn.preferredDay')} hint={t('corporate.dyn.preferredDayHint')} htmlFor="corp-preferred-day">
              <Select id="corp-preferred-day" disabled={submitting} value={form.preferredDay} onChange={(e) => patch({ preferredDay: e.target.value })}>
                <option value="">{t('corporate.dyn.preferredDayAny')}</option>
                {rules.dayOptions.map((d) => (
                  <option key={d} value={d}>{dayLabel(t, d)}</option>
                ))}
              </Select>
            </Field>
          )}

          {sharedQuestions.map((q) => (
            <QuestionField
              key={q.id} question={q} idSuffix="shared" disabled={submitting}
              value={form.answers[q.id]?.[0]} onChange={(v) => setAnswer(q.id, 0, v)}
              error={errors[`q.${q.id}.0`]}
            />
          ))}

          {evidence?.enabled && (
            <section aria-labelledby="corp-evidence-title" className="space-y-3">
              <h3 id="corp-evidence-title" className="font-display font-bold text-sm text-rally-text">
                {evidence.required ? t('corporate.dyn.evidenceTitle') : t('corporate.dyn.evidenceTitleOptional')}
              </h3>
              <EvidenceBlock
                idPrefix="corp-evidence" instructions={evidence.instructions_md} slots={evidenceSlots}
                names={{ 1: form.participants[0].firstName, 2: form.participants[1].firstName }}
                files={form.evidence} maxFiles={evidence.max_files} disabled={submitting}
                onChange={(slot, files) => setForm((f) => ({ ...f, evidence: { ...f.evidence, [slot]: files } }))}
                errors={{ 1: errors['evidence.0'] ? t(errors['evidence.0']) : null, 2: errors['evidence.1'] ? t(errors['evidence.1']) : null }}
              />
            </section>
          )}

          {terms?.enabled && (
            <div className="space-y-3">
              <div>
                <label htmlFor="corp-terms" className="flex items-start gap-3 text-sm text-rally-text cursor-pointer">
                  <input
                    id="corp-terms" type="checkbox" checked={form.termsAccepted} disabled={submitting}
                    onChange={(e) => patch({ termsAccepted: e.target.checked })}
                    aria-invalid={!!errors.terms} aria-describedby={errors.terms ? 'corp-terms-error' : undefined}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-rally-accent,#ccff00)]"
                  />
                  <span dir="auto">{terms.consent_label || t('corporate.dyn.consentDefault')}</span>
                </label>
                {errors.terms && <p id="corp-terms-error" role="alert" className="text-xs text-rally-error mt-1.5">{t(errors.terms)}</p>}
              </div>
            </div>
          )}

          {/* Honeypot. Humans never see or tab to it; a bot that fills every input trips it. */}
          <div aria-hidden="true" className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="corp-website">Website</label>
            <input
              id="corp-website" name="website" type="text" tabIndex={-1} autoComplete="off"
              value={form.website} onChange={(e) => patch({ website: e.target.value })}
            />
          </div>

          {banner && (
            <p role="alert" className="rounded-xl border border-rally-error/40 bg-rally-error/10 p-4 text-sm text-rally-text" data-testid="submit-error">
              {t(banner)}
            </p>
          )}

          <button
            type="submit" disabled={submitting}
            className="w-full h-12 md:h-14 rounded-full bg-rally-accent text-rally-accent-text font-bold enabled:hover:bg-rally-accent-hover enabled:shadow-glow-electric disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {submitting ? t('corporate.submitting') : waitlisting ? t('corporate.dyn.submitWaitlist') : t('corporate.dyn.submit')}
          </button>
        </>
      )}
    </form>
  )
}

function dayLabel(t: (k: string) => string, code: string): string {
  return (WEEKDAY_CODES as readonly string[]).includes(code) ? t(`corporate.dyn.day.${code}`) : code
}
