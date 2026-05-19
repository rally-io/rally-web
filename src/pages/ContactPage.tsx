import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  Building2,
  Trophy,
  Users,
  Megaphone,
  Handshake,
  CheckCircle2,
  Clock,
  PhoneCall,
  Target,
  Mail,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRtl } from '@/hooks/useRtl'
import { supabase } from '@/lib/supabase'

type SegmentId = 'club' | 'tournament' | 'coach' | 'sponsor' | 'partnership'

interface Segment {
  id: SegmentId
  icon: LucideIcon
  labelKey: string
  descKey: string
  openKey: string
}

const SEGMENTS: Segment[] = [
  {
    id: 'club',
    icon: Building2,
    labelKey: 'contact.segmentClub',
    descKey: 'contact.segmentClubDesc',
    openKey: 'contact.openClub',
  },
  {
    id: 'tournament',
    icon: Trophy,
    labelKey: 'contact.segmentTournament',
    descKey: 'contact.segmentTournamentDesc',
    openKey: 'contact.openTournament',
  },
  {
    id: 'coach',
    icon: Users,
    labelKey: 'contact.segmentCoach',
    descKey: 'contact.segmentCoachDesc',
    openKey: 'contact.openCoach',
  },
  {
    id: 'sponsor',
    icon: Megaphone,
    labelKey: 'contact.segmentSponsor',
    descKey: 'contact.segmentSponsorDesc',
    openKey: 'contact.openSponsor',
  },
  {
    id: 'partnership',
    icon: Handshake,
    labelKey: 'contact.segmentPartnership',
    descKey: 'contact.segmentPartnershipDesc',
    openKey: 'contact.openPartnership',
  },
]

export default function ContactPage() {
  const { t } = useTranslation()

  return (
    <main className="relative overflow-hidden">
      <AnimatedBackground />

      {/* HERO */}
      <section className="relative pt-8 sm:pt-12 pb-6 sm:pb-8">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rally-accent/40 bg-rally-accent/10 text-rally-accent text-xs sm:text-sm font-bold mb-5 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="tracking-wide">{t('contact.eyebrow')}</span>
          </span>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-4">
            {t('contact.heroTitle')}
          </h1>
          <p className="text-base sm:text-lg text-rally-text-2 max-w-2xl mx-auto leading-relaxed">
            {t('contact.heroSubtitle')}
          </p>
        </div>
      </section>

      {/* FORM + BENEFITS */}
      <section className="relative py-8 sm:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-3 order-1">
              <ContactForm />
            </div>
            <div className="lg:col-span-2 order-2">
              <BenefitsBlock />
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

function ContactForm() {
  const { t } = useTranslation()
  const { isRTL } = useRtl()
  const [segment, setSegment] = useState<SegmentId>('club')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [openAnswer, setOpenAnswer] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const activeSegment = SEGMENTS.find((s) => s.id === segment) ?? SEGMENTS[0]

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const lead = {
      segment,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      open_answer: openAnswer.trim(),
      message: message.trim(),
      source: 'contact_form',
      created_at: new Date().toISOString(),
    }

    // Safety net: persist locally so a lead is never silently lost.
    try {
      const existing = JSON.parse(localStorage.getItem('rallyContactLeads') || '[]')
      existing.push(lead)
      localStorage.setItem('rallyContactLeads', JSON.stringify(existing))
    } catch {
      // localStorage may be unavailable — non-fatal
    }

    // BACKEND-TODO (Shahaf): create Supabase table `contact_leads` with INSERT
    // policy for anon, plus a DB trigger / Edge Function that forwards each new
    // row to info@rallypadel.app. Until then, this insert may fail and the
    // lead survives only in localStorage above.
    try {
      const { error } = await supabase.from('contact_leads').insert([lead])
      if (error) console.error('[contact_leads] insert failed:', error.message)
    } catch (err) {
      console.error('[contact_leads] insert threw:', err)
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-rally-surface border border-rally-accent/40 p-8 shadow-glow-electric text-center">
        <CheckCircle2 className="w-12 h-12 text-rally-accent mb-4 mx-auto" />
        <h3 className="font-display text-2xl sm:text-3xl font-black text-rally-text mb-3">
          {t('contact.successTitle')}
        </h3>
        <p className="text-base text-rally-text-2 leading-relaxed max-w-md mx-auto">
          {t('contact.successMessage')}
        </p>
      </div>
    )
  }

  const inputClass =
    'rounded-md bg-rally-surface-2 border border-rally-border text-rally-text px-3 py-3 placeholder:text-rally-text-muted focus:outline-none focus:border-rally-accent focus:ring-4 focus:ring-rally-accent-dim transition-colors'

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-rally-surface border border-rally-border p-5 sm:p-6 space-y-5"
    >
      {/* Segment selector */}
      <div>
        <p className="text-sm sm:text-base font-display font-bold text-rally-text mb-3">
          {t('contact.segmentTitle')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {SEGMENTS.map((s) => {
            const Icon = s.icon
            const isActive = s.id === segment
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSegment(s.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 px-3 py-3 rounded-xl border text-center transition-all min-h-[88px]',
                  isActive
                    ? 'bg-rally-accent/10 border-rally-accent text-rally-accent shadow-glow-electric'
                    : 'bg-rally-surface-2 border-rally-border text-rally-text-2 hover:border-rally-border-strong hover:text-rally-text',
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-display font-bold text-xs sm:text-sm leading-tight">
                  {t(s.labelKey)}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-rally-text-muted mt-2 text-center">
          {t(activeSegment.descKey)}
        </p>
      </div>

      {/* Name + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('contact.name')}
          className={inputClass}
        />
        <input
          type="tel"
          required
          dir={isRTL ? 'rtl' : 'ltr'}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('contact.phone')}
          className={inputClass}
        />
      </div>

      {/* Email */}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('contact.email')}
        className={cn(inputClass, 'w-full')}
      />

      {/* Segment-specific open question */}
      <textarea
        required
        rows={3}
        value={openAnswer}
        onChange={(e) => setOpenAnswer(e.target.value)}
        placeholder={t(activeSegment.openKey)}
        className={cn(inputClass, 'w-full resize-none')}
      />

      {/* Optional message */}
      <textarea
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t('contact.messagePlaceholder')}
        className={cn(inputClass, 'w-full resize-none')}
      />

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold text-base shadow-glow-electric hover:bg-rally-accent-hover disabled:opacity-50 transition-colors"
      >
        {submitting ? t('contact.submitting') : t('contact.submitCta')}
      </button>
    </form>
  )
}

function BenefitsBlock() {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl bg-gradient-to-br from-rally-blue/10 via-rally-surface to-rally-accent/5 border border-rally-border p-6 sm:p-7">
      <h3 className="font-display text-xl sm:text-2xl font-black text-rally-text mb-5">
        {t('contact.benefitsTitle')}
      </h3>
      <div className="space-y-5">
        <Benefit
          icon={<Clock className="w-5 h-5" />}
          title={t('contact.benefit1Title')}
          desc={t('contact.benefit1Desc')}
        />
        <Benefit
          icon={<PhoneCall className="w-5 h-5" />}
          title={t('contact.benefit2Title')}
          desc={t('contact.benefit2Desc')}
        />
        <Benefit
          icon={<Target className="w-5 h-5" />}
          title={t('contact.benefit3Title')}
          desc={t('contact.benefit3Desc')}
        />
      </div>

      <div className="mt-6 pt-5 border-t border-rally-border">
        <p className="text-xs text-rally-text-muted mb-2">
          {t('contact.preferEmailLabel')}
        </p>
        <a
          href={`mailto:${t('contact.preferEmailValue')}`}
          dir="ltr"
          className="inline-flex items-center gap-2 text-rally-accent font-display font-bold text-base hover:text-rally-accent-hover transition-colors"
        >
          <Mail className="w-4 h-4" />
          <span>{t('contact.preferEmailValue')}</span>
        </a>
      </div>
    </div>
  )
}

function Benefit({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-rally-accent/15 text-rally-accent">
        {icon}
      </div>
      <div>
        <p className="font-display font-bold text-rally-text leading-tight">
          {title}
        </p>
        <p className="text-sm text-rally-text-2 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
