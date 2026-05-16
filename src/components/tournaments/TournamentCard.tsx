import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, MapPin } from 'lucide-react'
import type { Tournament } from '@/types/api'
import { useRtl } from '@/hooks/useRtl'
import { isRegistrationOpen, formatCurrency } from '@/lib/tournamentHelpers'
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
  const dateFmt = (d: string) =>
    new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short' })

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
        <h3 className="font-extrabold text-lg text-rally-text line-clamp-2">{tr.name}</h3>
        <p className="mt-1 text-sm text-rally-text-2 flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {dateFmt(tr.start_date)} – {dateFmt(tr.end_date)}
        </p>
        <p className="text-sm text-rally-text-2 flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          {tr.club_name}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-rally-surface-2 px-2.5 py-1 text-xs text-rally-text-2">
            {tr.skill_level}
          </span>
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
