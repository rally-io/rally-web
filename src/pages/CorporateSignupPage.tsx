import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, MapPin, CheckCircle2, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitLead } from '@/services/api/leads'
import LeadSubmitError from '@/components/forms/LeadSubmitError'
import { getCorporateEvent } from '@/constants/corporateEvents'
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  APP_STORE_BADGE,
  PLAY_STORE_BADGE,
} from '@/lib/appLinks'

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
  const event = useMemo(() => getCorporateEvent(slug), [slug])
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
      <EventHero />
      <section className="relative px-4 pt-6 pb-10">
        <div className="mx-auto w-full max-w-xl">
          <SignupForm />
        </div>
      </section>
      <AppDownloadFooter />
    </main>
  )

  function EventHero() {
    if (!event) return null
    const isContain = event.heroFit === 'contain'
    return (
      <header className="relative">
        {/* Taller on mobile than on desktop: the heading wraps to three lines
            in a narrow column, and it has to clear the artwork above it. */}
        <div className="relative h-[430px] sm:h-[380px] overflow-hidden">
          {/* Blurred, over-scaled copy of the same image fills the band edge
              to edge. It means a logo card, a square asset or an odd aspect
              ratio all still produce a full-bleed header — and it supplies the
              surrounding colour without anyone hardcoding a brand hex. */}
          <img
            src={event.heroImage}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover scale-125 blur-2xl"
          />
          {/* In 'contain' the crisp copy is pinned to the upper band so the
              title below lands on flat blurred colour instead of across the
              artwork. 'cover' fills as normal — a real photo wants the crop. */}
          <img
            src={event.heroImage}
            alt={event.clubName}
            /* w-full is load-bearing: without it an absolutely-positioned
               <img> resolves to its intrinsic width, and RTL then drops the
               `left` edge rather than `right`, pinning it to the corner. */
            className={cn(
              'absolute inset-x-0 top-0 w-full',
              isContain ? 'h-[36%] sm:h-[50%] object-contain' : 'h-full object-cover',
            )}
          />
          {/* Two stacked scrims: one to sink the image so white type stays
              legible on any photo the club sends, one to fade the bottom edge
              into the page so the form card sits on the seam. A logo card is
              already flat and dark, so it gets much less of the first — full
              strength turns the brand colour to mud. */}
          <div
            aria-hidden
            className={cn('absolute inset-0', isContain ? 'bg-rally-bg/20' : 'bg-rally-bg/55')}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-rally-bg/70 via-transparent to-rally-bg"
          />

          <div className="relative h-full container mx-auto px-4 max-w-xl flex flex-col">
            <div className="pt-6 sm:pt-8">
              <RallyWordmark />
            </div>

            <div className="mt-auto pb-8 sm:pb-24">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rally-accent/40 bg-rally-accent/10 text-rally-accent text-xs font-bold backdrop-blur mb-4">
                <Lock className="w-3.5 h-3.5" />
                <span className="tracking-wide">{t('corporate.eyebrow')}</span>
              </span>

              <p className="font-display text-sm sm:text-base font-bold text-rally-accent mb-1">
                {event.company}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight leading-[1.1] text-rally-text whitespace-pre-line">
                {event.tournamentName}
              </h1>

              <p className="text-sm sm:text-base text-rally-text-2 mt-2">
                {t('corporate.hostedAt')} {event.clubName}
              </p>
            </div>
          </div>
        </div>

        {/* On desktop the chips are one row, lifted to straddle the seam
            between photo and page (the hero reserves matching bottom padding).
            On mobile they stack into a tall column, so the same lift would
            drive them straight through the heading — they just sit below. */}
        <div className="container mx-auto px-4 max-w-xl mt-4 sm:-mt-12 relative">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DetailChip
              icon={<CalendarDays className="w-4 h-4" />}
              label={t('corporate.detailsDate')}
              value={event.dateLabel}
            />
            <DetailChip
              icon={<Clock className="w-4 h-4" />}
              label={t('corporate.detailsTime')}
              value={event.timeLabel}
            />
            <DetailChip
              icon={<MapPin className="w-4 h-4" />}
              label={t('corporate.detailsLocation')}
              value={event.clubAddress}
            />
          </dl>
        </div>
      </header>
    )
  }

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
              <span className="flex items-center px-3 font-display font-bold text-rally-text-2 bg-white/[0.04] border-e border-rally-border select-none">
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

/**
 * Store links at the foot of the page.
 *
 * Deliberately framed as "keep playing after the tournament", not "track your
 * tournament here" — signups create no Rally account, so there is nothing for
 * an employee to log into and no bracket for them to follow. Promising that
 * would be a promise the product can't keep.
 */
function AppDownloadFooter() {
  const { t } = useTranslation()
  return (
    <footer className="border-t border-rally-border px-4 py-10">
      <div className="mx-auto w-full max-w-xl text-center">
        <p className="font-display font-bold text-rally-text">{t('corporate.appTitle')}</p>
        <p className="text-sm text-rally-text-2 mt-2 leading-relaxed">
          {t('corporate.appBody')}
        </p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img src={APP_STORE_BADGE} alt="App Store" className="h-10" />
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img src={PLAY_STORE_BADGE} alt="Google Play" className="h-10" />
          </a>
        </div>
      </div>
    </footer>
  )
}

/** Israeli local number: digits only, drop the trunk 0, cap at 9. */
function normalizeIsraeliLocal(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9)
}

function inputClass(hasError: boolean): string {
  return cn(
    'w-full rounded-md bg-rally-surface-2 border text-rally-text px-3 py-3',
    'placeholder:text-rally-text-muted focus:outline-none focus:ring-4 focus:ring-rally-accent-dim transition-colors',
    hasError ? 'border-rally-error' : 'border-rally-border focus:border-rally-accent',
  )
}

function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  error?: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block font-display font-bold text-sm text-rally-text mb-2"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-rally-error mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-xs text-rally-text-muted mt-1.5 leading-relaxed">{hint}</p>
      ) : null}
    </div>
  )
}

function DetailChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-rally-surface border border-rally-border px-4 py-3">
      <dt className="flex items-center gap-1.5 text-xs text-rally-text-muted font-bold mb-1">
        {icon}
        {label}
      </dt>
      <dd className="text-sm font-display font-bold text-rally-text leading-snug">{value}</dd>
    </div>
  )
}

function RallyWordmark({ className }: { className?: string }) {
  return (
    <img
      src="/rally-logo.jpg"
      alt="Rally"
      className={cn('h-9 w-auto rounded-md', className)}
    />
  )
}
