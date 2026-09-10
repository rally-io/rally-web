import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitLead } from '@/services/api/leads'
import LeadSubmitError from '@/components/forms/LeadSubmitError'
import { getCorporateEvent } from '@/constants/corporateEvents'
import { EventHero } from '@/components/corporate/EventHero'
import { Field } from '@/components/corporate/Field'
import { inputClass } from '@/components/corporate/inputClass'
import { RallyWordmark } from '@/components/corporate/RallyWordmark'
import { AppDownloadFooter } from '@/components/corporate/AppDownloadFooter'
import { normalizeIsraeliLocal } from '@/components/corporate/phone'

/**
 * Unlisted landing page for a closed corporate tournament: /join/<slug>.
 *
 * Deliberately NOT rendered inside <Layout>. The client's brief was that
 * employees sign up and nothing else — no site nav to wander into, no app
 * download prompt, no login. So this page carries its own minimal header.
 *
 * Submissions go to the existing lead pipe (/api/lead → Apps Script → Google
 * Sheet), landing on a per-company tab. No Rally account is created here and
 * nothing is written to the Rally database: staff turn the sheet into
 * tournament registrations afterwards.
 */
export default function CorporateSignupPage() {
  const { slug } = useParams<{ slug: string }>()
  // This page is the LEAD flow only; the /join/:slug route dispatches tournament-mode
  // events to CorporateRegistrationPage. A tournament-mode slug landing here (only
  // possible by rendering this component directly) renders the not-found card.
  const event = useMemo(() => {
    const ev = getCorporateEvent(slug)
    return ev?.mode === 'lead' ? ev : null
  }, [slug])
  const { t } = useTranslation()

  // These links get forwarded around by employees; keep them out of search
  // results. index.html is shared by every route, so the tag is managed here
  // and removed on unmount.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  // The heading honours newlines in tournamentName; nothing else should.
  const flatTournamentName = event ? event.tournamentName.replace(/\s+/g, ' ').trim() : ''

  useEffect(() => {
    if (!event) return
    const previous = document.title
    document.title = `${flatTournamentName} · ${event.company}`
    return () => {
      document.title = previous
    }
  }, [event, flatTournamentName])

  if (!event) {
    return (
      <main className="min-h-screen bg-rally-bg flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <RallyWordmark className="mx-auto mb-8" />
          <h1 className="font-display text-2xl sm:text-3xl font-black text-rally-text mb-3">
            {t('corporate.notFoundTitle')}
          </h1>
          <p className="text-rally-text-2 leading-relaxed">{t('corporate.notFoundBody')}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-rally-bg">
      <EventHero event={event} />
      <section className="relative px-4 pt-6 pb-10">
        <div className="mx-auto w-full max-w-xl">
          <SignupForm />
        </div>
      </section>
      <AppDownloadFooter />
    </main>
  )

  function SignupForm() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [partner, setPartner] = useState('')
    const [honeypot, setHoneypot] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [submitFailed, setSubmitFailed] = useState(false)

    const reset = () => {
      setFullName('')
      setEmail('')
      setPhone('')
      setPartner('')
      setErrors({})
      setSubmitted(false)
    }

    const validate = () => {
      const next: Record<string, string> = {}
      if (!fullName.trim()) next.fullName = t('corporate.errorRequired')
      if (!email.trim()) next.email = t('corporate.errorRequired')
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
        next.email = t('corporate.errorEmail')
      // Local part of an Israeli number, leading 0 already stripped on input:
      // 9 digits for mobile (5X XXX XXXX), 8 for a landline.
      if (!phone) next.phone = t('corporate.errorRequired')
      else if (phone.length < 8 || phone.length > 9) next.phone = t('corporate.errorPhone')
      setErrors(next)
      return Object.keys(next).length === 0
    }

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault()
      if (!event) return
      if (!validate()) return
      setSubmitting(true)

      const lead = {
        source: event.sheetSource,
        company: event.company,
        tournament: flatTournamentName,
        club: event.clubName,
        full_name: fullName.trim(),
        email: email.trim(),
        // Stored E.164 so the value is dial-ready straight out of the sheet.
        phone: `+972${phone}`,
        partner_name: partner.trim(),
        created_at: new Date().toISOString(),
        _hp: honeypot,
      }

      // Same safety net the other lead forms use: keep a local copy so a failed
      // POST never silently loses a signup, and never show success without one.
      try {
        const key = 'rallyCorporateSignups'
        const existing = JSON.parse(localStorage.getItem(key) || '[]')
        existing.push(lead)
        localStorage.setItem(key, JSON.stringify(existing))
      } catch {
        /* private mode / quota — the POST below is still the real path */
      }

      try {
        await submitLead(lead)
      } catch (err) {
        console.error('[corporate signup] submit failed:', err)
        setSubmitFailed(true)
        setSubmitting(false)
        return
      }

      setSubmitted(true)
      setSubmitting(false)
    }

    if (submitFailed) {
      return <LeadSubmitError onRetry={() => setSubmitFailed(false)} />
    }

    if (submitted) {
      return (
        <div className="rounded-2xl bg-rally-surface border border-rally-accent/40 p-8 shadow-glow-electric text-center">
          <CheckCircle2 className="w-12 h-12 text-rally-accent mb-4 mx-auto" />
          <h2 className="font-display text-2xl sm:text-3xl font-black text-rally-text mb-3">
            {t('corporate.successTitle')}
          </h2>
          <p className="text-base text-rally-text-2 leading-relaxed">
            {t('corporate.successMessage')}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 text-sm font-display font-bold text-rally-accent hover:text-rally-accent-hover transition-colors"
          >
            {t('corporate.successAnother')}
          </button>
        </div>
      )
    }

    return (
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl bg-rally-surface border border-rally-border p-5 sm:p-7 shadow-lg"
      >
        <h2 className="font-display text-xl sm:text-2xl font-black text-rally-text mb-6">
          {t('corporate.formTitle')}
        </h2>

        <div className="space-y-5">
          <Field label={t('corporate.fullName')} error={errors.fullName} htmlFor="cs-name">
            <input
              id="cs-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('corporate.fullNamePlaceholder')}
              className={inputClass(!!errors.fullName)}
            />
          </Field>

          <Field label={t('corporate.email')} error={errors.email} htmlFor="cs-email">
            <input
              id="cs-email"
              type="email"
              autoComplete="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('corporate.emailPlaceholder')}
              className={cn(inputClass(!!errors.email), 'text-start')}
            />
          </Field>

          <Field
            label={t('corporate.phone')}
            error={errors.phone}
            hint={t('corporate.phoneHint')}
            htmlFor="cs-phone"
          >
            {/* Phone numbers read LTR regardless of page direction, so this
                group is pinned LTR and the +972 prefix always leads. */}
            <div
              dir="ltr"
              className={cn(
                'flex items-stretch rounded-md overflow-hidden border bg-rally-surface-2 transition-colors',
                'focus-within:border-rally-accent focus-within:ring-4 focus-within:ring-rally-accent-dim',
                errors.phone ? 'border-rally-error' : 'border-rally-border',
              )}
            >
              <span className="flex items-center px-3 font-display font-bold text-rally-text-2 bg-rally-surface border-e border-rally-border select-none">
                +972
              </span>
              <input
                id="cs-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(normalizeIsraeliLocal(e.target.value))}
                placeholder={t('corporate.phonePlaceholder')}
                className="flex-1 min-w-0 bg-transparent px-3 py-3 text-rally-text placeholder:text-rally-text-muted focus:outline-none"
              />
            </div>
          </Field>

          <Field
            label={t('corporate.partner')}
            hint={t('corporate.partnerHint')}
            htmlFor="cs-partner"
          >
            <input
              id="cs-partner"
              type="text"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              placeholder={t('corporate.partnerPlaceholder')}
              className={inputClass(false)}
            />
          </Field>
        </div>

        {/* Honeypot — visually and programmatically hidden from real users. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="absolute w-px h-px -m-px p-0 overflow-hidden border-0 opacity-0 pointer-events-none"
        />

        <button
          type="submit"
          disabled={submitting}
          className="mt-7 w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold text-base shadow-glow-electric hover:bg-rally-accent-hover disabled:opacity-50 transition-colors"
        >
          {submitting ? t('corporate.submitting') : t('corporate.submitCta')}
        </button>

        <p className="text-xs text-rally-text-muted text-center mt-3 leading-relaxed">
          {t('corporate.consent')}
        </p>
      </form>
    )
  }
}
