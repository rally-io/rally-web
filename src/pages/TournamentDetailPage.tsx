import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Share2,
  Trophy,
  Users,
} from 'lucide-react'

import { useTournament } from '@/hooks/useTournament'
import { TournamentRegistration } from '@/components/tournaments/TournamentRegistration'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  getMockOrganizer,
  getMockPlayers,
  getMockSchedule,
  getMockCancellationPolicy,
  colorForIndex,
} from '@/components/tournaments/tournamentMockData'
import type { Prize, Sponsor } from '@/types/api'

function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return useMemo(() => {
    if (!target) return null
    const diff = target.getTime() - now
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff / 3_600_000) % 24),
      minutes: Math.floor((diff / 60_000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      done: false,
    }
  }, [target, now])
}

export default function TournamentDetailPage() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const locale = isRtl ? 'he-IL' : 'en-US'
  const { id } = useParams<{ id: string }>()
  const { data: tournament, isLoading, isError } = useTournament(id!)
  const [registerOpen, setRegisterOpen] = useState(false)

  const startTarget = useMemo(
    () => (tournament ? new Date(tournament.start_date) : null),
    [tournament],
  )
  const countdown = useCountdown(startTarget)

  if (isLoading) {
    return (
      <main className="pt-28 pb-24 container mx-auto px-4">
        <Skeleton className="h-[80vh] rounded-3xl" />
      </main>
    )
  }
  if (isError || !tournament) {
    return (
      <main className="pt-32 container mx-auto px-4 text-center text-gray-400">
        {t('tournaments.not_found')}
      </main>
    )
  }

  const deadline = new Date(tournament.registration_deadline)
  const isClosed = Number.isFinite(deadline.getTime()) && deadline < new Date()
  const maxParticipants = tournament.max_participants ?? 10
  const available = tournament.available_seats ?? 0
  const filled = Math.max(0, maxParticipants - available)
  const isFull = available <= 0
  const fillPercent = Math.min(100, Math.round((filled / Math.max(1, maxParticipants)) * 100))

  const organizer = getMockOrganizer(tournament)
  const players = getMockPlayers(tournament)
  const schedule = getMockSchedule(tournament)
  const policy = getMockCancellationPolicy(tournament)

  const currencyFmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  })

  const formatLabel =
    tournament.format === 'singles'
      ? t('tournaments.format_singles')
      : tournament.format === 'doubles'
      ? t('tournaments.format_doubles')
      : t('tournaments.format_mixed')

  const shortDate = (d: string) =>
    new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const longDate = (d: string) =>
    new Date(d).toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  const time = (d: string) =>
    new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: tournament.name, url })
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        /* no-op */
      }
    }
  }

  const ctaLabel = tournament.my_registration
    ? tournament.registration_status ?? t('tournaments.your_registration')
    : isClosed
    ? t('tournaments.closed')
    : isFull
    ? t('tournaments.join_waitlist')
    : t('tournaments.register_for', { amount: currencyFmt.format(tournament.entry_fee) })

  const ctaDisabled = !!tournament.my_registration || isClosed

  return (
    <main className="relative">
      {/* ============= IMMERSIVE HERO ============= */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          {tournament.image_url ? (
            <img
              src={tournament.image_url}
              alt={tournament.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-900 to-slate-950" />
          )}
          {/* Gradient overlay — heavier on the start (LTR: left, RTL: right) */}
          <div
            className={`absolute inset-0 ${
              isRtl
                ? 'bg-gradient-to-l from-slate-950 via-slate-950/80 to-slate-950/10'
                : 'bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/10'
            }`}
          />
          {/* Bottom fade into next section */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-slate-950" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 container mx-auto px-4 lg:px-10 pt-24 pb-20 min-h-screen flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-12">
            <Link
              to="/tournaments"
              className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              {t('tournaments.back')}
            </Link>
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 text-sm text-white">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-electric-green text-slate-950 text-xs font-bold">
                {organizer.name.slice(0, 1)}
              </span>
              <span className="text-white/70">{t('tournaments.organizer')},</span>
              <span className="font-semibold">{organizer.name}</span>
            </div>
          </div>

          {/* Two-column hero body */}
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 flex-1 items-start">
            {/* LEFT — info card + players */}
            <div className="lg:col-span-5 max-w-md w-full space-y-10 lg:pt-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/60 mb-3">
                  {t('tournaments.find_your_spot')}
                </p>

                {/* Light info card on dark hero */}
                <div className="rounded-3xl bg-white text-slate-900 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] p-4">
                  <Field
                    icon={<MapPin className="w-4 h-4 text-electric-green" />}
                    value={tournament.club_name}
                  />
                  <Divider />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      icon={<Calendar className="w-4 h-4 text-electric-green" />}
                      hint={t('tournaments.schedule_start')}
                      value={`${shortDate(tournament.start_date)} · ${time(tournament.start_date)}`}
                    />
                    <Field
                      hint={t('tournaments.schedule_end')}
                      value={`${shortDate(tournament.end_date)} · ${time(tournament.end_date)}`}
                    />
                  </div>
                  <Divider />
                  <Field
                    icon={<Users className="w-4 h-4 text-electric-green" />}
                    value={`${formatLabel} · ${tournament.skill_level}`}
                  />
                </div>

                {/* Primary CTA pill */}
                <Button
                  onClick={() => setRegisterOpen(true)}
                  disabled={ctaDisabled}
                  className={`mt-4 w-full h-14 rounded-full font-semibold text-base inline-flex items-center justify-center gap-3 ${
                    isFull && !ctaDisabled
                      ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                      : 'bg-electric-green text-slate-950 hover:bg-electric-green/90 disabled:bg-white/10 disabled:text-white/40'
                  }`}
                >
                  {ctaLabel}
                  {!ctaDisabled && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
                </Button>

                {/* Capacity micro-bar */}
                <div className="mt-3 flex items-center gap-3 text-xs text-white/70">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-electric-green"
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                  <span className="font-medium whitespace-nowrap">
                    {t('tournaments.spots_filled', { filled, total: maxParticipants })}
                  </span>
                </div>
              </div>

              {/* "Registered Players" list */}
              <div>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                    {t('tournaments.registered_players')}
                  </h2>
                  <span className="text-xs text-white/50 font-mono">
                    {filled}/{maxParticipants}
                  </span>
                </div>
                <p className="text-sm text-white/60 mt-1">
                  {t('tournaments.in_club', { club: tournament.club_name })}
                </p>

                <div className="mt-5 space-y-3">
                  {players.slice(0, 3).map((p, i) => (
                    <PlayerStrip key={p.id} index={i} name={p.name} skill={p.skill ?? tournament.skill_level} initials={p.initials} t={t} />
                  ))}
                  {players.length === 0 && (
                    <p className="text-white/40 text-sm">—</p>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT — display headline floating over image */}
            <div className="lg:col-span-7 lg:pt-16 flex flex-col">
              <p className="text-lg lg:text-2xl text-white/80 font-light">
                {t('tournaments.hero_eyebrow')}
              </p>
              <h1 className="mt-3 text-5xl sm:text-6xl lg:text-8xl font-black text-white leading-[0.92] tracking-tight">
                {tournament.name}
              </h1>
              <p className="mt-4 text-lg lg:text-2xl text-white/80 italic font-light">
                {t('tournaments.hero_outro', { club: tournament.club_name })}
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                {countdown && !countdown.done && (
                  <span className="inline-flex items-center gap-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-5 py-3 text-white">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono tabular-nums">
                      {String(countdown.days).padStart(2, '0')}
                      <span className="text-white/50 text-xs ms-0.5">d</span>{' '}
                      {String(countdown.hours).padStart(2, '0')}
                      <span className="text-white/50 text-xs ms-0.5">h</span>{' '}
                      {String(countdown.minutes).padStart(2, '0')}
                      <span className="text-white/50 text-xs ms-0.5">m</span>
                    </span>
                    <span className="text-white/60 text-sm">{t('tournaments.starts_in')}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 text-sm text-white hover:bg-white/20 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  {t('tournaments.share')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= BELOW HERO ============= */}
      <section className="bg-slate-950 py-20">
        <div className="container mx-auto px-4 max-w-4xl space-y-20">
          {tournament.description && (
            <CleanSection title={t('tournaments.section_about')}>
              <p className="text-lg leading-relaxed text-gray-300 whitespace-pre-line">
                {tournament.description}
              </p>
            </CleanSection>
          )}

          <CleanSection title={t('tournaments.section_schedule')}>
            <ol className="space-y-4">
              {schedule.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-6 rounded-2xl bg-slate-900/60 border border-white/5 p-4"
                >
                  <span className="inline-flex items-center gap-3 text-gray-400">
                    <Calendar className="w-4 h-4 text-electric-green" />
                    {t(`tournaments.${row.label}`)}
                  </span>
                  <span className="text-white text-end">
                    <span className="block text-sm">{longDate(row.date)}</span>
                    <span className="text-xs text-gray-400">{time(row.date)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </CleanSection>

          {tournament.prizes && tournament.prizes.length > 0 && (
            <CleanSection title={t('tournaments.section_podium')}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {tournament.prizes.slice(0, 3).map((prize: Prize, i) => (
                  <PrizeCard key={prize.id} prize={prize} rank={i + 1} />
                ))}
              </div>
            </CleanSection>
          )}

          <CleanSection title={t('tournaments.section_players')}>
            <div className="flex -space-x-3 rtl:space-x-reverse rtl:-space-x-reverse mb-5">
              {players.slice(0, 10).map((p, i) => (
                <span
                  key={p.id}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-white text-sm font-semibold ring-2 ring-slate-950 ${colorForIndex(i)}`}
                >
                  {p.initials}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl bg-slate-900/60 border border-white/5 p-3"
                >
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-semibold ${colorForIndex(i)}`}
                  >
                    {p.initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.skill ?? 'N/A'}</p>
                  </div>
                  <span className="text-xs text-gray-500">#{i + 1}</span>
                </div>
              ))}
            </div>
          </CleanSection>

          <CleanSection title={t('tournaments.section_requirements')}>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              <Spec label={t('tournaments.skill_level_label')} value={tournament.skill_level} />
              <Spec label={t('tournaments.format_label')} value={formatLabel} />
              <Spec label={t('tournaments.min_players')} value={String(maxParticipants)} />
              <Spec label={t('tournaments.max_players')} value={String(maxParticipants)} />
              <Spec
                label={t('tournaments.entry_fee')}
                value={currencyFmt.format(tournament.entry_fee)}
              />
              <Spec label={t('tournaments.organizer')} value={organizer.name} />
            </dl>
          </CleanSection>

          <CleanSection title={t('tournaments.section_policy')}>
            <p className="text-sm text-gray-500 mb-2">
              {t('tournaments.last_cancellation')}:{' '}
              <span className="text-white">{longDate(policy.deadline)}</span>
            </p>
            <p className="text-base leading-relaxed text-gray-300">
              {t('tournaments.cancellation_policy_body', { percent: policy.cancelFeePercent })}
            </p>
          </CleanSection>

          {tournament.sponsors && tournament.sponsors.length > 0 && (
            <CleanSection title={t('tournaments.section_sponsors')}>
              <div className="flex flex-wrap gap-4">
                {tournament.sponsors.map((sponsor: Sponsor) => (
                  <a
                    key={sponsor.id}
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-electric-green hover:underline"
                  >
                    {sponsor.name}
                  </a>
                ))}
              </div>
            </CleanSection>
          )}
        </div>
      </section>

      <TournamentRegistration
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        tournament={tournament}
      />
    </main>
  )
}

function Field({
  icon,
  hint,
  value,
}: {
  icon?: React.ReactNode
  hint?: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {icon && <span className="mt-0.5">{icon}</span>}
      <div className="min-w-0 flex-1">
        {hint && <p className="text-[10px] uppercase tracking-wider text-slate-500">{hint}</p>}
        <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-slate-100 mx-1" />
}

function PlayerStrip({
  index,
  name,
  skill,
  initials,
  t,
}: {
  index: number
  name: string
  skill: string | null
  initials: string
  t: any
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/8 backdrop-blur-md border border-white/10 p-3">
      <span
        className={`inline-flex h-14 w-14 items-center justify-center rounded-xl text-white text-base font-semibold flex-shrink-0 ${colorForIndex(index)}`}
      >
        {initials}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-white/50">
          {t('tournaments.your_match')}
        </p>
        <p className="text-base font-bold text-white truncate">{name}</p>
        <p className="text-sm text-electric-green">{skill ?? 'N/A'}</p>
      </div>
      <span className="text-xs text-white/40 font-mono me-1">#{index + 1}</span>
    </div>
  )
}

function CleanSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-6">{title}</h2>
      {children}
    </section>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</dt>
      <dd className="text-base text-white">{value}</dd>
    </div>
  )
}

function PrizeCard({ prize, rank }: { prize: Prize; rank: number }) {
  const accents = ['from-electric-green/20 border-electric-green/40', 'from-slate-700/40 border-white/10', 'from-amber-600/20 border-amber-700/40']
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-b to-transparent border p-5 ${accents[rank - 1] ?? 'border-white/10'}`}
    >
      <Trophy className={`w-5 h-5 ${rank === 1 ? 'text-electric-green' : 'text-gray-400'}`} />
      <p className="mt-3 text-3xl font-black text-white">#{rank}</p>
      <p className="mt-2 text-sm font-semibold text-white">{prize.title}</p>
      <p className="text-xs text-gray-400 mt-1">{prize.description}</p>
    </div>
  )
}
