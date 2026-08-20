import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  Check,
  CheckCircle2,
  ChevronDown,
  Smartphone,
  CalendarCheck,
  TrendingUp,
  Mail,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRtl } from '@/hooks/useRtl'
import { submitLead } from '@/services/api/leads'
import { trackLead } from '@/lib/analytics'
import LeadSubmitError from '@/components/forms/LeadSubmitError'
import { ISRAEL_REGIONS } from '@/constants/israelRegions'
import { ISRAELI_CITIES } from '@/constants/israeliCities'

type LevelPreference = 'beginners' | 'advanced' | 'all'

const inputClass =
  'rounded-md bg-rally-surface-2 border border-rally-border text-rally-text text-base px-3 py-3 placeholder:text-rally-text-muted focus:outline-none focus:border-rally-accent focus:ring-4 focus:ring-rally-accent-dim transition-colors'

export default function CoachesPage() {
  const { t } = useTranslation()

  const scrollToForm = () => {
    document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="relative overflow-hidden">
      <AnimatedBackground />

      {/* HERO */}
      <section className="relative pt-8 sm:pt-12 pb-6 sm:pb-8">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <span className="hero-rise hero-rise-1 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rally-accent/40 bg-rally-accent/10 text-rally-accent text-xs sm:text-sm font-bold mb-5 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="tracking-wide">{t('coaches.eyebrow')}</span>
          </span>
          <h1 className="hero-rise hero-rise-2 font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] mb-4">
            {t('coaches.heroTitle')}
            <br />
            <span className="text-rally-accent">{t('coaches.heroTitleAccent')}</span>
          </h1>
          <p className="hero-rise hero-rise-3 text-base sm:text-lg text-rally-text-2 max-w-2xl mx-auto leading-relaxed mb-7">
            {t('coaches.heroSubtitle')}
          </p>
          <button
            type="button"
            onClick={scrollToForm}
            className="hero-rise hero-rise-4 inline-flex items-center gap-3 px-8 py-4 rounded-full bg-rally-accent text-rally-accent-text font-display font-black text-base sm:text-lg hover:bg-rally-accent-hover shadow-glow-electric transition-all active:scale-[0.98]"
          >
            {t('coaches.heroCta')}
          </button>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="relative py-6 sm:py-8">
        <div className="container mx-auto px-4 max-w-2xl space-y-4">
          <ValueProp
            icon={<Smartphone className="w-5 h-5" />}
            title={t('coaches.value1Title')}
            desc={t('coaches.value1Desc')}
          />
          <ValueProp
            icon={<CalendarCheck className="w-5 h-5" />}
            title={t('coaches.value2Title')}
            desc={t('coaches.value2Desc')}
          />
          <ValueProp
            icon={<TrendingUp className="w-5 h-5" />}
            title={t('coaches.value3Title')}
            desc={t('coaches.value3Desc')}
          />
        </div>
      </section>

      {/* APPLICATION FORM */}
      <section id="apply" className="relative py-8 sm:py-12 scroll-mt-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <CoachApplicationForm />

          {/* trust footnote */}
          <p className="text-center text-xs text-rally-text-muted mt-5">
            {t('coaches.footnote')}{' '}
            <a
              href={`mailto:${t('contact.preferEmailValue')}`}
              dir="ltr"
              className="inline-flex items-center gap-1 text-rally-accent hover:text-rally-accent-hover transition-colors font-bold"
            >
              <Mail className="w-3 h-3" />
              {t('contact.preferEmailValue')}
            </a>
          </p>
        </div>
      </section>
    </main>
  )
}

function AnimatedBackground() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute top-[5%] start-[10%] w-[420px] h-[420px] rounded-full bg-rally-accent/15 blur-3xl"
        style={{ animation: 'blob-drift 22s ease-in-out infinite' }}
      />
      <div
        className="absolute top-[35%] end-[5%] w-[380px] h-[380px] rounded-full bg-rally-blue/15 blur-3xl"
        style={{
          animation: 'blob-drift 26s ease-in-out infinite',
          animationDelay: '-9s',
        }}
      />
      <div
        className="absolute bottom-[10%] start-[15%] w-[460px] h-[460px] rounded-full bg-rally-accent/10 blur-3xl"
        style={{
          animation: 'blob-drift 30s ease-in-out infinite',
          animationDelay: '-15s',
        }}
      />
    </div>
  )
}

function ValueProp({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-rally-surface/70 border border-rally-border p-4 backdrop-blur">
      <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-rally-accent/15 text-rally-accent">
        {icon}
      </div>
      <div>
        <p className="font-display font-bold text-rally-text leading-tight">{title}</p>
        <p className="text-sm text-rally-text-2 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function SectionHeader({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="font-mono text-xs font-bold text-rally-accent tracking-widest">
        {number}
      </span>
      <span className="font-display font-bold text-rally-text text-base sm:text-lg">
        {label}
      </span>
      <span className="flex-1 h-px bg-rally-border" />
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all min-h-[44px]',
        active
          ? 'bg-rally-accent/10 border-rally-accent text-rally-accent'
          : 'bg-rally-surface-2 border-rally-border text-rally-text-2 hover:border-rally-border-strong hover:text-rally-text',
      )}
    >
      {active && <Check className="w-3.5 h-3.5 shrink-0" />}
      <span>{children}</span>
    </button>
  )
}

function CoachApplicationForm() {
  const { t } = useTranslation()
  const { isRTL } = useRtl()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [regions, setRegions] = useState<string[]>([])
  const [citiesOpen, setCitiesOpen] = useState(false)
  const [cities, setCities] = useState<string[]>([])
  const [level, setLevel] = useState<LevelPreference>('all')
  const [about, setAbout] = useState('')
  const [regionError, setRegionError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitFailed, setSubmitFailed] = useState(false)
  const [appNumber, setAppNumber] = useState('')

  const wrapperRef = useRef<HTMLDivElement>(null)
  const regionsRef = useRef<HTMLDivElement>(null)

  const toggleRegion = (value: string) => {
    setRegionError(false)
    setRegions((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  const addCity = (value: string) => {
    if (!value) return
    setCities((prev) => (prev.includes(value) ? prev : [...prev, value]))
  }

  const removeCity = (value: string) => {
    setCities((prev) => prev.filter((v) => v !== value))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (regions.length === 0) {
      setRegionError(true)
      regionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)

    const lead = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      regions,
      cities,
      level_preference: level,
      about: about.trim(),
      source: 'coach_application',
      created_at: new Date().toISOString(),
    }

    // Safety net: persist locally so an application is never silently lost.
    try {
      const existing = JSON.parse(localStorage.getItem('rallyCoachLeads') || '[]')
      existing.push(lead)
      localStorage.setItem('rallyCoachLeads', JSON.stringify(existing))
    } catch {
      // localStorage may be unavailable — non-fatal
    }

    // Forward to the Google Sheet via the /api/lead proxy. Never claim success
    // we didn't achieve — on failure show the retry state (the lead is still in
    // localStorage above).
    let delivered = false
    try {
      await submitLead(lead)
      delivered = true
    } catch (err) {
      console.error('[coach lead] submit failed:', err)
    }

    if (!delivered) {
      setSubmitFailed(true)
      setSubmitting(false)
      requestAnimationFrame(() => {
        wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }

    trackLead('coach_application')
    setAppNumber(`RC-${Date.now().toString(36).toUpperCase().slice(-6)}`)
    setSubmitted(true)
    setSubmitting(false)
    requestAnimationFrame(() => {
      wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  return (
    <div ref={wrapperRef}>
      {submitFailed ? (
        <LeadSubmitError onRetry={() => setSubmitFailed(false)} />
      ) : submitted ? (
        <div className="rounded-2xl bg-rally-surface border border-rally-accent/40 p-8 shadow-glow-electric text-center">
          <CheckCircle2 className="w-12 h-12 text-rally-accent mb-4 mx-auto" />
          <h3 className="font-display text-2xl sm:text-3xl font-black text-rally-text mb-3">
            {t('coaches.successTitle')}
          </h3>
          <span className="inline-block px-3 py-1.5 rounded-full bg-rally-accent/10 border border-rally-accent/40 text-rally-accent font-mono text-xs font-bold mb-4">
            {t('coaches.successAppLabel', { number: appNumber })}
          </span>
          <p className="text-base text-rally-text-2 leading-relaxed max-w-md mx-auto">
            {t('coaches.successMessage')}
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-rally-surface border border-rally-border p-5 sm:p-6 space-y-5"
        >
          <h2 className="font-display text-xl sm:text-2xl font-black text-rally-text">
            {t('coaches.formTitle')}
          </h2>

          {/* 01 · Personal details */}
          <SectionHeader number="01" label={t('coaches.section1')} />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t('coaches.firstName')}
              className={inputClass}
            />
            <input
              type="text"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t('coaches.lastName')}
              className={inputClass}
            />
          </div>
          <input
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            dir={isRTL ? 'rtl' : 'ltr'}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('coaches.phone')}
            className={cn(inputClass, 'w-full')}
          />
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('coaches.email')}
            className={cn(inputClass, 'w-full')}
          />

          {/* 02 · Where do you coach */}
          <SectionHeader number="02" label={t('coaches.section2')} />
          <div ref={regionsRef}>
            <p className="text-sm text-rally-text-2 mb-2">{t('coaches.regionsLabel')}</p>
            <div className="grid grid-cols-2 gap-2">
              {ISRAEL_REGIONS.map((r) => (
                <Chip
                  key={r.value}
                  active={regions.includes(r.value)}
                  onClick={() => toggleRegion(r.value)}
                >
                  {isRTL ? r.he : r.en}
                </Chip>
              ))}
            </div>
            {regionError && (
              <p className="text-sm text-rally-error mt-2">{t('coaches.regionsError')}</p>
            )}
          </div>

          {/* optional cities */}
          {citiesOpen ? (
            <div className="space-y-2">
              <div className="relative">
                <select
                  value=""
                  onChange={(e) => addCity(e.target.value)}
                  className={cn(inputClass, 'w-full appearance-none pe-10 cursor-pointer')}
                >
                  <option value="" disabled>
                    {t('coaches.citiesSelectPlaceholder')}
                  </option>
                  {ISRAELI_CITIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {isRTL ? c.he : c.en}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rally-text-muted pointer-events-none" />
              </div>
              {cities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {cities.map((v) => {
                    const city = ISRAELI_CITIES.find((c) => c.value === v)
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => removeCity(v)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rally-accent/10 border border-rally-accent/40 text-rally-accent text-sm font-bold"
                      >
                        <span>{city ? (isRTL ? city.he : city.en) : v}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCitiesOpen(true)}
              className="text-sm font-bold text-rally-accent hover:text-rally-accent-hover transition-colors"
            >
              {t('coaches.citiesToggle')}
            </button>
          )}

          {/* 03 · About you */}
          <SectionHeader number="03" label={t('coaches.section3')} />
          <div>
            <p className="text-sm text-rally-text-2 mb-2">{t('coaches.levelLabel')}</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['beginners', 'coaches.levelBeginners'],
                  ['advanced', 'coaches.levelAdvanced'],
                  ['all', 'coaches.levelAll'],
                ] as [LevelPreference, string][]
              ).map(([value, key]) => (
                <Chip key={value} active={level === value} onClick={() => setLevel(value)}>
                  {t(key)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-rally-text-2 mb-2">{t('coaches.aboutLabel')}</p>
            <textarea
              rows={4}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder={t('coaches.aboutPlaceholder')}
              className={cn(inputClass, 'w-full resize-none')}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold text-base shadow-glow-electric hover:bg-rally-accent-hover disabled:opacity-50 transition-colors"
          >
            {submitting ? t('coaches.submitting') : t('coaches.submitCta')}
          </button>
        </form>
      )}
    </div>
  )
}
