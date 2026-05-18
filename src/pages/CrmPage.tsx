import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Zap, Layers, TrendingUp, CheckCircle2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRtl } from '@/hooks/useRtl'
import { supabase } from '@/lib/supabase'
import { ISRAELI_CITIES } from '@/constants/israeliCities'

const CRM_SCREENS = [
  '/crm-dashboard.png',
  '/crm-tournaments.png',
  '/crm-calendar.jpg',
  '/crm-customers.png',
  '/crm-notifications.png',
  '/crm-shop.jpg',
]

export default function CrmPage() {
  const { t } = useTranslation()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 4500)
    return () => clearInterval(id)
  }, [])

  return (
    <main className="relative overflow-hidden">
      {/* Animated background blobs */}
      <AnimatedBackground />

      {/* HERO */}
      <section className="relative pt-8 sm:pt-12 pb-12 sm:pb-16">
        <div className="relative container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            {/* Text + form (mobile order: 1, desktop order: 1) */}
            <div className="text-center lg:text-start order-1">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rally-blue/40 bg-rally-blue/10 text-rally-blue text-xs sm:text-sm font-bold mb-5 backdrop-blur">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="tracking-wide">{t('crm.eyebrow')}</span>
              </span>

              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-5">
                {t('crm.title')}
              </h1>

              <p className="text-base sm:text-lg text-rally-text-2 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                {t('crm.subtitle')}
              </p>

              <LeadCaptureForm />
            </div>

            {/* Mockup (mobile order: 2 → after form, desktop order: 2 → side) */}
            <div className="order-2">
              <MockupCascade tick={tick} />
            </div>
          </div>
        </div>
      </section>

      {/* TEASE — vague value props (no specifics) */}
      <section className="relative py-12 sm:py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3">
              {t('crm.teaseTitle')}
            </h2>
            <p className="text-sm sm:text-base text-rally-text-muted uppercase tracking-widest">
              {t('crm.teaseHint')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            <TeaseCard
              icon={<Zap className="w-6 h-6" />}
              title={t('crm.card1Title')}
              desc={t('crm.card1Desc')}
            />
            <TeaseCard
              icon={<Layers className="w-6 h-6" />}
              title={t('crm.card2Title')}
              desc={t('crm.card2Desc')}
            />
            <TeaseCard
              icon={<TrendingUp className="w-6 h-6" />}
              title={t('crm.card3Title')}
              desc={t('crm.card3Desc')}
            />
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="relative py-12 sm:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="relative rounded-2xl bg-gradient-to-br from-rally-blue/20 via-rally-surface to-rally-accent/10 border border-rally-border p-8 sm:p-12 text-center overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,255,0,0.15),transparent_50%)]"
            />
            <div className="relative">
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3">
                {t('crm.closingTitle')}
              </h2>
              <p className="text-base sm:text-lg text-rally-text-2 mb-6">
                {t('crm.closingSubtitle')}
              </p>
              <a
                href="#crm-form"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById('crm-form')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  })
                }}
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold text-base shadow-glow-electric hover:bg-rally-accent-hover transition-colors"
              >
                {t('crm.closingCta')}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function AnimatedBackground() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute top-[5%] start-[5%] w-[420px] h-[420px] rounded-full bg-rally-blue/20 blur-3xl"
        style={{ animation: 'blob-drift 18s ease-in-out infinite' }}
      />
      <div
        className="absolute top-[40%] end-[10%] w-[380px] h-[380px] rounded-full bg-rally-accent/15 blur-3xl"
        style={{
          animation: 'blob-drift 24s ease-in-out infinite',
          animationDelay: '-8s',
        }}
      />
      <div
        className="absolute bottom-[10%] start-[20%] w-[460px] h-[460px] rounded-full bg-rally-blue/10 blur-3xl"
        style={{
          animation: 'blob-drift 28s ease-in-out infinite',
          animationDelay: '-14s',
        }}
      />
    </div>
  )
}

function MockupCascade({ tick }: { tick: number }) {
  return (
    <div className="relative w-full max-w-[560px] mx-auto h-[320px] sm:h-[400px] md:h-[440px]">
      {/* Top-end window (hidden on mobile) */}
      <BrowserWindow
        tick={tick}
        offset={2}
        className="hidden sm:block absolute top-0 end-0 w-[58%] rotate-[5deg] z-10 opacity-90"
      />
      {/* Bottom-start window (hidden on mobile) */}
      <BrowserWindow
        tick={tick}
        offset={4}
        className="hidden sm:block absolute bottom-0 start-0 w-[58%] -rotate-[4deg] z-20 opacity-90"
      />
      {/* Center featured */}
      <BrowserWindow
        tick={tick}
        offset={0}
        featured
        className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[88%] sm:w-[72%] z-30"
      />
    </div>
  )
}

function BrowserWindow({
  tick,
  offset = 0,
  featured,
  className,
}: {
  tick: number
  offset?: number
  featured?: boolean
  className?: string
}) {
  const index = (tick + offset) % CRM_SCREENS.length
  return (
    <div
      className={cn(
        'rounded-xl bg-rally-surface-2 border border-white/10 overflow-hidden shadow-2xl',
        featured && 'shadow-glow-electric ring-1 ring-rally-accent/30',
        className,
      )}
    >
      {/* Title bar with traffic lights */}
      <div
        dir="ltr"
        className="flex items-center gap-1.5 px-3 py-2 bg-rally-surface border-b border-white/5"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      </div>
      {/* Content area — screenshots cycling, lightly blurred */}
      <div className="relative aspect-[16/10] bg-black overflow-hidden">
        {CRM_SCREENS.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            className={cn(
              'absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-1000 ease-in-out',
              i === index ? 'opacity-100' : 'opacity-0',
            )}
            style={{ filter: 'blur(0.6px)' }}
          />
        ))}
        {/* Subtle overlay to push it further into "mood, not info" territory */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-rally-blue/10 via-transparent to-rally-accent/5 mix-blend-overlay"
        />
      </div>
    </div>
  )
}

function LeadCaptureForm() {
  const { t } = useTranslation()
  const { isRTL } = useRtl()
  const [name, setName] = useState('')
  const [club, setClub] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const lead = {
      name: name.trim(),
      club: club.trim(),
      email: email.trim(),
      phone: phone.trim(),
      city,
      source: 'crm_waitlist',
      created_at: new Date().toISOString(),
    }

    // Safety net: always persist locally so a lead is never silently lost
    // even if the backend table doesn't exist yet.
    try {
      const existing = JSON.parse(localStorage.getItem('rallyLeads') || '[]')
      existing.push(lead)
      localStorage.setItem('rallyLeads', JSON.stringify(existing))
    } catch {
      // localStorage may be unavailable — non-fatal
    }

    // BACKEND-TODO (Shahaf): create Supabase table `crm_leads` with INSERT
    // policy for anon, plus a DB trigger / Edge Function that forwards each
    // new row to info@rallypadel.app. Until then, this insert may fail and
    // the lead survives only in localStorage above.
    try {
      const { error } = await supabase.from('crm_leads').insert([lead])
      if (error) console.error('[crm_leads] insert failed:', error.message)
    } catch (err) {
      console.error('[crm_leads] insert threw:', err)
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div
        id="crm-form"
        className="rounded-2xl bg-rally-surface border border-rally-accent/40 p-6 sm:p-7 shadow-glow-electric text-center lg:text-start"
      >
        <CheckCircle2 className="w-10 h-10 text-rally-accent mb-3 mx-auto lg:mx-0" />
        <h3 className="font-display text-xl sm:text-2xl font-black text-rally-text mb-2">
          {t('crm.formSuccessTitle')}
        </h3>
        <p className="text-sm sm:text-base text-rally-text-2 leading-relaxed">
          {t('crm.formSuccessMessage')}
        </p>
      </div>
    )
  }

  const inputClass =
    'rounded-md bg-rally-surface-2 border border-rally-border text-rally-text px-3 py-2.5 placeholder:text-rally-text-muted focus:outline-none focus:border-rally-accent focus:ring-4 focus:ring-rally-accent-dim transition-colors'

  return (
    <form
      id="crm-form"
      onSubmit={handleSubmit}
      className="rounded-2xl bg-rally-surface border border-rally-border p-5 sm:p-6 space-y-3"
    >
      <div className="text-center lg:text-start mb-2">
        <h3 className="font-display text-lg sm:text-xl font-bold text-rally-text">
          {t('crm.formTitle')}
        </h3>
        <p className="text-xs sm:text-sm text-rally-text-2 mt-1">
          {t('crm.formSubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('crm.formName')}
          className={inputClass}
        />
        <input
          type="text"
          required
          value={club}
          onChange={(e) => setClub(e.target.value)}
          placeholder={t('crm.formClub')}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('crm.formEmail')}
          className={inputClass}
        />
        <input
          type="tel"
          required
          dir={isRTL ? 'rtl' : 'ltr'}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('crm.formPhone')}
          className={inputClass}
        />
      </div>

      <div className="relative">
        <select
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={cn(inputClass, 'w-full appearance-none pe-10 cursor-pointer')}
        >
          <option value="" disabled>
            {t('crm.formCityPlaceholder')}
          </option>
          {ISRAELI_CITIES.map((c) => (
            <option key={c.value} value={c.value}>
              {isRTL ? c.he : c.en}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rally-text-muted" />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold text-base shadow-glow-electric hover:bg-rally-accent-hover disabled:opacity-50 transition-colors"
      >
        {submitting ? t('crm.formSubmitting') : t('crm.formCta')}
      </button>
    </form>
  )
}

function TeaseCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="rounded-2xl bg-rally-surface border border-rally-border p-5 sm:p-6 hover:border-rally-accent/40 transition-colors">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-rally-accent/15 text-rally-accent mb-4">
        {icon}
      </div>
      <h3 className="font-display text-lg sm:text-xl font-bold text-rally-text mb-1.5">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-rally-text-2 leading-relaxed">
        {desc}
      </p>
    </div>
  )
}
