import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, MapPin, Clock } from 'lucide-react'
import type { Tournament } from '@/types/api'
import { useRtl } from '@/hooks/useRtl'
import {
  isRegistrationOpen,
  formatCurrency,
  formatTournamentCardDate,
} from '@/lib/tournamentHelpers'
import { formatLabelKey } from '@/lib/tournamentTheme'
import { StatusBadge } from './StatusBadge'

interface Props {
  tournament: Tournament
  tab?: 'upcoming' | 'my'
}

export function TournamentCard({ tournament: tr, tab = 'upcoming' }: Props) {
  const { t } = useTranslation()
  const { locale } = useRtl()
  const open = isRegistrationOpen(tr.registration_deadline)
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

  const payState =
    tr.registration_status === 'payment_pending' ||
    tr.registration_status === 'approved'

  const ctaLabel = payState
    ? t('tournament.tournamentsPayNow')
    : tab === 'my'
    ? t('tournament.tournamentsViewDetails')
    : open
    ? t('tournament.tournamentsRegister')
    : t('tournament.tournamentsViewDetails')

  return (
    <Link
      to={`/tournaments/${tr.id}`}
      className="block rounded-[20px] bg-rally-surface border border-rally-border overflow-hidden hover:border-rally-accent/50 transition-colors"
    >
      <div className="relative aspect-video bg-rally-surface-2">
        {img ? (
          <img src={img} alt={tr.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-rally-text-muted">
            <Calendar className="w-10 h-10 opacity-30" />
          </div>
        )}
        {tr.registration_status && (
          <div className="absolute bottom-3 start-3">
            <StatusBadge status={tr.registration_status} />
          </div>
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
        {countdownText && (
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
            <p className="text-2xl font-black text-rally-accent">
              {formatCurrency(tr.entry_fee)}
            </p>
          </div>
          <span
            className={`inline-flex items-center justify-center min-w-[120px] h-10 rounded-full bg-rally-accent text-rally-accent-text font-bold ${
              payState ? 'shadow-[0_0_20px_rgba(204,255,0,0.5)]' : ''
            }`}
          >
            {ctaLabel}
          </span>
        </div>
      </div>
    </Link>
  )
}
