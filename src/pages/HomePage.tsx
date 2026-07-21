import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  CalendarClock,
  Trophy,
  ShoppingBag,
  Newspaper,
  Dumbbell,
} from 'lucide-react'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/constants/appLinks'
import AvailabilityGrid from '@/components/home/AvailabilityGrid'
import { useDevicePlatform } from '@/hooks/useDevicePlatform'
import { cn } from '@/lib/utils'

const APP_SCREENS = [
  '/app-screen-home-kash.jpg',
  '/app-screen-tournaments.png',
  '/app-screen-my-tournaments.jpg',
  '/app-screen-booking.jpg',
  '/app-screen-clubs.jpg',
  '/app-screen-filter.png',
]

const TICKER_KEYS = [
  'home.ticker1',
  'home.ticker2',
  'home.ticker3',
  'home.ticker4',
  'home.ticker5',
  'home.ticker6',
] as const

const PILLARS = [
  {
    icon: CalendarClock,
    titleKey: 'home.pillar1Title',
    descKey: 'home.pillar1Desc',
    soon: false,
  },
  { icon: Trophy, titleKey: 'home.pillar2Title', descKey: 'home.pillar2Desc', soon: false },
  { icon: Dumbbell, titleKey: 'home.pillar3Title', descKey: 'home.pillar3Desc', soon: true },
  {
    icon: ShoppingBag,
    titleKey: 'home.pillar4Title',
    descKey: 'home.pillar4Desc',
    soon: true,
  },
  { icon: Newspaper, titleKey: 'home.pillar5Title', descKey: 'home.pillar5Desc', soon: false },
] as const

const CRM_SCREENS = [
  '/crm-dashboard.png',
  '/crm-calendar.jpg',
  '/crm-customers.png',
  '/crm-notifications.png',
]

export default function HomePage() {
  const { t } = useTranslation()
  const platform = useDevicePlatform()
  const [phoneTick, setPhoneTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setPhoneTick((n) => n + 1), 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {/* HERO */}
      <section className="relative flex flex-col items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/padel-community-hero.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-rally-bg/55 via-rally-bg/80 to-rally-bg" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-rally-bg)_92%)]"
          />
        </div>

        <div className="relative container mx-auto px-4 pt-12 sm:pt-16 pb-10 sm:pb-14 text-center max-w-4xl">
          <span className="hero-rise hero-rise-1 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rally-accent/40 bg-rally-accent/10 text-rally-accent text-xs sm:text-sm font-bold mb-5 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rally-accent opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rally-accent" />
            </span>
            <span className="tracking-wide">{t('home.heroEyebrow')}</span>
          </span>

          <h1 className="hero-rise hero-rise-2 font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-5">
            {t('home.heroTitle')}
            <br />
            <span className="text-rally-accent">{t('home.heroTitleAccent')}</span>
          </h1>

          <p className="hero-rise hero-rise-3 text-base sm:text-lg md:text-xl text-rally-text-2 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t('home.heroSubtitle')}
          </p>

          <div className="hero-rise hero-rise-3 flex flex-col gap-2 justify-center items-center mb-7">
            {platform === 'desktop' ? (
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <AppBadge
                  href={APP_STORE_URL}
                  icon={<AppleIcon />}
                  sublabel={t('home.downloadNow')}
                  label={t('home.appStoreLabel')}
                />
                <AppBadge
                  href={GOOGLE_PLAY_URL}
                  icon={<GooglePlayIcon />}
                  sublabel={t('home.downloadNow')}
                  label={t('home.googlePlayLabel')}
                />
              </div>
            ) : (
              <>
                <a
                  href={platform === 'android' ? GOOGLE_PLAY_URL : APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 w-full max-w-xs px-8 py-4 rounded-full bg-rally-accent text-rally-accent-text font-display font-black text-lg hover:bg-rally-accent-hover shadow-glow-electric transition-all active:scale-[0.98]"
                >
                  {platform === 'android' ? <GooglePlayIcon /> : <AppleIcon />}
                  <span>{t('home.downloadFree')}</span>
                </a>
                <span className="text-[11px] text-rally-text-muted tracking-wide">
                  {t('home.downloadStores')}
                </span>
              </>
            )}
          </div>

          {/* SIGNATURE — live court-availability grid (the killer feature, made visible) */}
          <div className="hero-rise hero-rise-4 mb-8">
            <AvailabilityGrid />
          </div>

          <a
            href={
              platform === 'android'
                ? GOOGLE_PLAY_URL
                : platform === 'ios'
                  ? APP_STORE_URL
                  : APP_STORE_URL
            }
            target="_blank"
            rel="noopener noreferrer"
            className="hero-rise hero-rise-5 inline-flex items-center gap-3 px-7 sm:px-9 py-3.5 sm:py-4 rounded-full bg-rally-accent text-rally-accent-text font-display font-black text-base sm:text-lg hover:bg-rally-accent-hover shadow-glow-electric transition-all active:scale-[0.98] group"
          >
            <span>{t('home.downloadNow')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
          </a>
        </div>
      </section>

      {/* LIVE TICKER — scoreboard strip */}
      <section
        aria-hidden
        className="relative border-y border-rally-border bg-rally-surface/50 py-3 overflow-hidden"
      >
        <div className="ticker-track gap-10">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center gap-10 shrink-0">
              {TICKER_KEYS.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-mono text-rally-text-2 whitespace-nowrap"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rally-accent" />
                  {t(key)}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* PILLARS — the killer feature + the rest of the padel world */}
      <section className="relative py-12 sm:py-16 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(204,255,0,0.06)_0%,transparent_60%)]"
        />
        <div className="relative container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 leading-tight">
              {t('home.pillarsTitle')}
            </h2>
            <p className="text-base sm:text-lg text-rally-text-2 max-w-xl mx-auto">
              {t('home.pillarsSubtitle')}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
            {PILLARS.map(({ icon: Icon, titleKey, descKey, soon }, i) => (
              <div
                key={titleKey}
                className={cn(
                  'group relative rounded-2xl border border-rally-border bg-rally-surface/60 p-6 backdrop-blur transition-all hover:border-rally-accent/50 hover:bg-rally-surface',
                  'w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]',
                  i === 0 && 'ring-1 ring-rally-accent/30',
                )}
              >
                {soon && (
                  <span className="absolute top-4 end-4 px-2.5 py-1 rounded-full bg-rally-blue/15 border border-rally-blue/40 text-rally-blue text-[10px] font-bold uppercase tracking-widest">
                    {t('home.soonLabel')}
                  </span>
                )}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rally-accent/10 text-rally-accent mb-4 transition-colors group-hover:bg-rally-accent/20">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2 leading-tight">
                  {t(titleKey)}
                </h3>
                <p className="text-sm text-rally-text-2 leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROOF — real tournaments, real courts, we live padel */}
      <section className="relative py-12 sm:py-16 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(204,255,0,0.05)_0%,transparent_55%)]"
        />
        <div className="relative container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* text */}
            <div>
              <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-rally-accent uppercase tracking-widest mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-rally-accent opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rally-accent" />
                </span>
                {t('home.proofEyebrow')}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
                {t('home.proofTitle')}
                <br />
                <span className="text-rally-accent">{t('home.proofTitleAccent')}</span>
              </h2>
              <p className="text-base sm:text-lg text-rally-text-2 leading-relaxed mb-6 max-w-lg">
                {t('home.proofDesc')}
              </p>
              <Link
                to="/tournaments"
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-rally-accent text-rally-accent-text font-bold text-sm sm:text-base hover:bg-rally-accent-hover hover:shadow-glow-electric transition-all group"
              >
                <span>{t('home.proofCta')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Link>
            </div>

            {/* visual: the app itself, live */}
            <div className="flex justify-center items-end gap-3 md:gap-6">
              <CyclingPhoneMockup
                tick={phoneTick}
                offset={2}
                className="hidden sm:block rotate-[-6deg] translate-y-4 opacity-90"
              />
              <CyclingPhoneMockup tick={phoneTick} offset={0} featured />
              <CyclingPhoneMockup
                tick={phoneTick}
                offset={5}
                className="hidden lg:block rotate-[6deg] translate-y-4 opacity-90"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CLUBS STRIP — dual audience */}
      <section className="relative py-12 sm:py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-rally-border bg-rally-surface/70 p-8 sm:p-12 backdrop-blur">
            <div
              aria-hidden
              className="absolute -inset-40 bg-[radial-gradient(circle_at_var(--x,80%)_20%,rgba(0,85,255,0.14),transparent_55%)]"
            />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-block text-xs sm:text-sm font-bold text-rally-blue uppercase tracking-widest mb-3">
                  {t('home.clubsEyebrow')}
                </span>
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 leading-tight">
                  {t('home.clubsTitle')}
                </h2>
                <p className="text-base text-rally-text-2 leading-relaxed mb-6">
                  {t('home.clubsDesc')}
                </p>
                <Link
                  to="/crm"
                  className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-rally-blue text-white font-bold text-sm sm:text-base hover:bg-rally-blue-hover hover:shadow-glow-blue transition-all group"
                >
                  <span>{t('home.clubsCta')}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </Link>
              </div>

              {/* CRM screens cycling — blurred on purpose (mood, not info) */}
              <div className="relative rounded-xl border border-rally-border bg-rally-surface-2 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-rally-border bg-rally-surface">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                </div>
                <div className="relative aspect-[16/10]">
                  {CRM_SCREENS.map((src, i) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      loading="lazy"
                      className={cn(
                        'absolute inset-0 w-full h-full object-cover object-top blur-[3px] scale-105 transition-opacity duration-1000 ease-in-out',
                        i === phoneTick % CRM_SCREENS.length ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-rally-bg/40 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function AppBadge({
  href,
  icon,
  sublabel,
  label,
}: {
  href: string
  icon: React.ReactNode
  sublabel: string
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-black border border-white/15 hover:border-rally-accent/60 hover:shadow-glow-electric transition-all"
    >
      <span className="text-white">{icon}</span>
      <div className="flex flex-col text-start leading-tight">
        <span className="text-[10px] uppercase tracking-widest text-white/70">
          {sublabel}
        </span>
        <span className="text-base font-bold text-white">{label}</span>
      </div>
    </a>
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
