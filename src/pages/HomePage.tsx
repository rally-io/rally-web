import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Sparkles } from 'lucide-react'
import { getCountdown } from '@/lib/tournamentHelpers'
import { cn } from '@/lib/utils'

const LAUNCH_DATE = '2026-06-01T00:00:00+03:00'

const APP_SCREENS = [
  '/app-screen-home-kash.jpg',
  '/app-screen-tournaments.png',
  '/app-screen-my-tournaments.jpg',
  '/app-screen-booking.jpg',
  '/app-screen-clubs.jpg',
  '/app-screen-filter.png',
]

export default function HomePage() {
  const { t } = useTranslation()
  const [, setTick] = useState(0)
  const [phoneTick, setPhoneTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setPhoneTick((n) => n + 1), 4000)
    return () => clearInterval(id)
  }, [])

  const { days, hours, expired } = getCountdown(LAUNCH_DATE)

  return (
    <>
      {/* HERO */}
      <section className="relative flex flex-col items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/padel-court-home.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-rally-bg/60 via-rally-bg/85 to-rally-bg" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-rally-bg)_90%)]"
          />
        </div>

        <div className="relative container mx-auto px-4 pt-12 sm:pt-16 pb-10 sm:pb-14 text-center max-w-4xl">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rally-accent/40 bg-rally-accent/10 text-rally-accent text-xs sm:text-sm font-bold mb-5 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="tracking-wide">{t('home.heroEyebrow')}</span>
          </span>

          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.02] mb-5">
            {t('home.heroTitle')}
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-rally-text-2 max-w-2xl mx-auto mb-7 leading-relaxed">
            {t('home.heroSubtitle')}
          </p>

          {!expired && (
            <div className="inline-flex items-center gap-3 sm:gap-5 mb-7 px-5 py-3 sm:px-7 sm:py-4 rounded-2xl bg-rally-surface/70 backdrop-blur border border-rally-border">
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-black text-rally-accent tabular-nums leading-none">
                  {days}
                </span>
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-rally-text-muted">
                  {t('home.countdownDays')}
                </span>
              </span>
              <span className="w-px h-8 sm:h-10 bg-rally-border" />
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-black text-rally-accent tabular-nums leading-none">
                  {hours}
                </span>
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-rally-text-muted">
                  {t('home.countdownHours')}
                </span>
              </span>
              <span className="hidden sm:inline text-xs sm:text-sm text-rally-text-2 ms-1">
                {t('home.countdownUntilLaunch')}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
            <AppBadge
              icon={<AppleIcon />}
              sublabel={t('home.appStoreComingSoon')}
              label={t('home.appStoreLabel')}
            />
            <AppBadge
              icon={<GooglePlayIcon />}
              sublabel={t('home.googlePlayComingSoon')}
              label={t('home.googlePlayLabel')}
            />
          </div>

          <Link
            to="/tournaments"
            className="inline-flex items-center gap-3 px-5 sm:px-7 py-3 sm:py-3.5 rounded-full bg-rally-accent/10 border border-rally-accent/50 text-rally-accent font-bold text-sm sm:text-base hover:bg-rally-accent/20 hover:border-rally-accent hover:shadow-glow-electric transition-all backdrop-blur group"
          >
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rally-accent opacity-75 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-rally-accent" />
            </span>
            <span>{t('home.tournamentsLiveTitle')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
          </Link>
        </div>
      </section>

      {/* TEASE + PHONES */}
      <section className="relative py-10 sm:py-14 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,85,255,0.08)_0%,transparent_60%)]"
        />
        <div className="relative container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 leading-tight">
              {t('home.teaseTitle')}
            </h2>
            <p className="text-base sm:text-lg text-rally-text-2 max-w-xl mx-auto">
              {t('home.teaseSubtitle')}
            </p>
          </div>

          <div className="flex justify-center items-end gap-3 md:gap-6 lg:gap-10">
            <CyclingPhoneMockup
              tick={phoneTick}
              offset={2}
              className="hidden md:block rotate-[-6deg] translate-y-4 opacity-90"
            />
            <CyclingPhoneMockup tick={phoneTick} offset={0} featured />
            <CyclingPhoneMockup
              tick={phoneTick}
              offset={5}
              className="hidden md:block rotate-[6deg] translate-y-4 opacity-90"
            />
          </div>

          <p className="text-center text-xs sm:text-sm text-rally-text-muted uppercase tracking-widest mt-8 sm:mt-10">
            {t('home.teaseFooterHint')}
          </p>
        </div>
      </section>
    </>
  )
}

function AppBadge({
  icon,
  sublabel,
  label,
}: {
  icon: React.ReactNode
  sublabel: string
  label: string
}) {
  return (
    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-black border border-white/15 hover:border-white/30 transition-colors cursor-not-allowed">
      <span className="text-white">{icon}</span>
      <div className="flex flex-col text-start leading-tight">
        <span className="text-[10px] uppercase tracking-widest text-white/70">
          {sublabel}
        </span>
        <span className="text-base font-bold text-white">{label}</span>
      </div>
    </div>
  )
}

function CyclingPhoneMockup({
  tick,
  offset = 0,
  className,
  featured,
}: {
  tick: number
  offset?: number
  className?: string
  featured?: boolean
}) {
  const index = (tick + offset) % APP_SCREENS.length
  return (
    <div
      className={cn(
        'relative rounded-[1.75rem] sm:rounded-[2rem] bg-rally-surface-2 border-[5px] sm:border-[6px] border-rally-surface-2 shadow-2xl overflow-hidden',
        'w-40 sm:w-44',
        featured && 'md:w-52 z-10 shadow-glow-electric ring-1 ring-rally-accent/30',
        className,
      )}
    >
      {APP_SCREENS.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          loading={i === offset % APP_SCREENS.length ? 'eager' : 'lazy'}
          className={cn(
            'block w-full h-auto transition-opacity duration-1000 ease-in-out',
            i === 0 ? '' : 'absolute inset-0',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
    </div>
  )
}

function AppleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09M12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}

function GooglePlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.609 1.814C3.234 2.052 3 2.487 3 3.024v17.953c0 .537.234.972.609 1.21L13.794 12 3.609 1.814z"
        fill="#00B0FF"
      />
      <path
        d="M17.394 8.591L5.182 1.66a1.717 1.717 0 0 0-1.573.155l10.185 10.185 3.6-3.41z"
        fill="#00C853"
      />
      <path
        d="M3.609 22.187a1.717 1.717 0 0 0 1.573.155l12.212-6.931-3.6-3.412L3.609 22.187z"
        fill="#FF3D00"
      />
      <path
        d="M21.063 10.62l-3.668-2.029L13.794 12l3.601 3.412 3.668-2.03c1.296-.726 1.296-2.04 0-2.762z"
        fill="#FFD600"
      />
    </svg>
  )
}
