import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, MapPin, Clock, Flame, User, Users } from 'lucide-react'
import type { Tournament } from '@/types/api'
import { useRtl } from '@/hooks/useRtl'
import {
  isRegistrationOpen,
  isTournamentLive,
  isLastSpots,
  registrationSummary,
  formatCurrency,
  formatTournamentCardDate,
} from '@/lib/tournamentHelpers'
import { formatLabelKey } from '@/lib/tournamentTheme'
import { StatusBadge } from './StatusBadge'
import { LiveBadge } from './LiveBadge'

interface Props {
  tournament: Tournament
  tab?: 'upcoming' | 'my'
  variant?: 'default' | 'past'
}

export function TournamentCard({
  tournament: tr,
  tab = 'upcoming',
  variant = 'default',
}: Props) {
  const isPast = variant === 'past'
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { locale } = useRtl()
  const open = isRegistrationOpen(tr.registration_deadline)
  const live = !isPast && isTournamentLive(tr)
  const img = tr.thumb_url ?? tr.image_url
  const dateLine = formatTournamentCardDate(tr.start_date, tr.end_date, locale)

  const deadlineMs = tr.registration_deadline
    ? new Date(tr.registration_deadline).getTime()
    : NaN
  const daysToDeadline = Number.isFinite(deadlineMs)
    ? Math.ceil((deadlineMs - Date.now()) / 86_400_000)
    : null
  let countdownText: string | null = null
  if (open && daysToDeadline !== null && daysToDeadline >= 0) {
    if (daysToDeadline === 0)
      countdownText = t('tournament.tournamentsCountdownToday')
    else if (daysToDeadline === 1)
      countdownText = t('tournament.tournamentsCountdownOneDay')
    else
      countdownText = t('tournament.tournamentsCountdownDays', {
        count: daysToDeadline,
      })
  }

  // Only payment_pending still needs a card added — registered/approved/etc.
  // already have a registration in hand, so the card is just informational.
  const needsPayment = tr.registration_status === 'payment_pending'

  // How full, and how big — a player sizing up a card needs the cap as much as
  // the count. Counted in pairs for a doubles draw, so the unit switches on
  // the format rather than calling everything "players".
  const fill = isPast ? null : registrationSummary(tr)
  const fillUnit = t(
    tr.format === 'singles'
      ? 'tournament.tournamentsRegisteredUnitPlayers'
      : 'tournament.tournamentsRegisteredUnitPairs',
  )

  const ctaLabel = needsPayment
    ? t('tournament.tournamentsCompleteRegistration')
    : tr.registration_status || tab === 'my'
    ? t('tournament.tournamentsViewDetails')
    : open
    ? t('tournament.tournamentsRegister')
    : t('tournament.tournamentsViewDetails')

  // The detail page's sticky CTA handles payment completion directly (Pay Now
  // → Add Card), so every card just routes to the detail page.
  const linkTo = `/tournaments/${tr.id}`

  return (
    <Link
      to={linkTo}
      className="block rounded-[20px] bg-rally-surface border border-rally-border overflow-hidden hover:border-rally-accent/50 transition-colors"
    >
      <div
        className={`relative aspect-video bg-rally-surface-2${
          isPast ? ' grayscale opacity-75' : ''
        }`}
      >
        {img ? (
          <img src={img} alt={tr.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-rally-text-muted">
            <Calendar className="w-10 h-10 opacity-30" />
          </div>
        )}
        {isPast ? (
          <div className="absolute bottom-3 start-3">
            <span className="inline-flex items-center rounded-full bg-black/70 backdrop-blur px-2.5 py-1 text-[11px] font-extrabold text-rally-text-2 border border-rally-border">
              {t('clubs.endedBadge')}
            </span>
          </div>
        ) : (
          tr.registration_status && (
            <div className="absolute bottom-3 start-3">
              <StatusBadge status={tr.registration_status} />
            </div>
          )
        )}
        {/* A tournament in play takes the badge slot: urging registration on
            something already under way would read as a mistake. */}
        {live ? (
          <div className="absolute top-3 end-3">
            <LiveBadge />
          </div>
        ) : (
          open && !isPast && isLastSpots(tr.available_seats) && (
            <div className="absolute top-3 end-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rally-warning text-rally-text-on-light text-[11px] font-black uppercase tracking-wider shadow-md animate-pulse">
              <Flame className="w-3.5 h-3.5" />
              <span>{t('tournament.tournamentsLastSpots')}</span>
            </div>
          )
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-extrabold text-lg text-rally-text line-clamp-2 flex-1 leading-tight">
            {tr.name}
          </h3>
          <span
            dir="ltr"
            className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-md bg-rally-surface-2 border border-rally-accent/40 text-rally-accent text-xs font-black tracking-wider"
          >
            {tr.skill_level}
          </span>
        </div>
        <p className="text-sm text-rally-text-2 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{dateLine}</span>
        </p>
        <p className="mt-1 text-sm text-rally-text-2 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="line-clamp-1">{tr.club_name}</span>
        </p>
        {tr.organizer_name && (
          <p className="mt-1 text-sm text-rally-text-2 flex items-center gap-1.5">
            <User className="w-4 h-4 shrink-0 text-rally-accent/80" />
            {tr.organizer_slug ? (
              <span
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  navigate(`/organizers/${tr.organizer_slug}`)
                }}
                className="line-clamp-1 hover:text-rally-accent hover:underline transition-colors cursor-pointer"
              >
                {tr.organizer_name}
              </span>
            ) : (
              <span className="line-clamp-1">{tr.organizer_name}</span>
            )}
          </p>
        )}
        {fill && (
          <p className="mt-1 text-sm text-rally-accent flex items-center gap-1.5 font-semibold">
            <Users className="w-4 h-4 shrink-0" />
            {/* dir="ltr" with the two numbers as separate children: joined as
                one "12/16" string under the site's RTL this mirrors to
                "16/12", which would read as over capacity. See
                wiki/gotchas/web-rtl-score-string-mirroring. */}
            <span dir="ltr" className="tabular-nums">
              <span>{fill.registered}</span>/<span>{fill.capacity}</span>
            </span>
            <span>{fillUnit}</span>
          </p>
        )}
        {countdownText && !isPast && !live && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rally-blue/15 text-rally-blue text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>{countdownText}</span>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-rally-surface-2 px-2.5 py-1 text-xs text-rally-text-2">
            {t(formatLabelKey(tr.format))}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">
              {t('tournament.tournamentsEntryFee')}
            </p>
            <p
              className={
                isPast
                  ? 'text-lg font-black text-rally-text-muted'
                  : 'text-2xl font-black text-rally-accent'
              }
            >
              {formatCurrency(tr.entry_fee)}
            </p>
          </div>
          {isPast ? (
            <span className="inline-flex items-center justify-center min-w-[120px] h-10 px-4 rounded-full border border-rally-border text-rally-text-2 font-bold">
              {t('clubs.viewDetails')}
            </span>
          ) : (
            <span
              className={`inline-flex items-center justify-center min-w-[120px] h-10 rounded-full bg-rally-accent text-rally-accent-text font-bold ${
                needsPayment ? 'shadow-[0_0_20px_rgba(204,255,0,0.5)]' : ''
              }`}
            >
              {ctaLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
