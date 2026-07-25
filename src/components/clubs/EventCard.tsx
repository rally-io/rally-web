import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, User, GraduationCap } from 'lucide-react'
import type { ClubEvent } from '@/types/api'
import { useRtl } from '@/hooks/useRtl'
import { formatCurrency } from '@/lib/tournamentHelpers'
import { tryOpenInApp } from '@/lib/appLinks'
import { AppDownloadModal } from '@/components/app-download/AppDownloadModal'

interface Props {
  event: ClubEvent
  variant?: 'default' | 'past'
}

// Compact card mirroring TournamentCard's visual language. Events have no web
// detail page, so the whole card funnels to the app (deep link → download modal).
export function EventCard({ event, variant = 'default' }: Props) {
  const { t } = useTranslation()
  const { locale } = useRtl()
  const [appModal, setAppModal] = useState(false)
  const isPast = variant === 'past'

  const img = event.thumb_url ?? event.image_url
  const start = new Date(event.start_at)
  const end = new Date(event.end_at)
  const dateLabel = Number.isFinite(start.getTime())
    ? start.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
    : ''
  const timeLabel =
    Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())
      ? `${start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
      : ''
  const priceLabel = event.price > 0 ? formatCurrency(event.price) : t('clubs.eventFree')
  const typeLabel = event.type === 'class' ? t('clubs.eventClass') : event.type

  const handleJoin = () => {
    if (!tryOpenInApp(`/events/${event.id}`)) setAppModal(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleJoin}
        className="group flex w-full flex-col text-start rounded-[18px] bg-rally-surface border border-rally-border overflow-hidden hover:border-rally-accent/50 transition-colors"
      >
        <div className={`relative aspect-[16/10] bg-rally-surface-2${isPast ? ' grayscale opacity-75' : ''}`}>
          {img ? (
            <img src={img} alt={event.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-rally-text-muted">
              <GraduationCap className="w-9 h-9 opacity-30" />
            </div>
          )}
          {typeLabel && (
            <span className="absolute top-2.5 end-2.5 inline-flex items-center rounded-full bg-black/55 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-white">
              {typeLabel}
            </span>
          )}
          {isPast && (
            <span className="absolute bottom-2.5 start-2.5 inline-flex items-center rounded-full bg-black/70 backdrop-blur px-2.5 py-1 text-[11px] font-extrabold text-rally-text-2 border border-rally-border">
              {t('clubs.endedBadge')}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="flex-1 font-bold text-base text-rally-text line-clamp-2 leading-tight">
              {event.name}
            </h3>
            <span
              className={`shrink-0 text-base font-black whitespace-nowrap ${
                isPast ? 'text-rally-text-muted' : 'text-rally-accent'
              }`}
            >
              {priceLabel}
            </span>
          </div>
          {dateLabel && (
            <p className="mt-1.5 text-sm text-rally-text-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{dateLabel}</span>
            </p>
          )}
          {timeLabel && (
            <p className="mt-1 text-sm text-rally-text-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 shrink-0" />
              <span dir="ltr">{timeLabel}</span>
            </p>
          )}
          {event.coach_name && (
            <p className="mt-1 text-sm text-rally-text-2 flex items-center gap-1.5">
              <User className="w-4 h-4 shrink-0" />
              <span>{t('clubs.eventCoach', { name: event.coach_name })}</span>
            </p>
          )}
          <div className="mt-auto pt-3.5">
            <span
              className={
                isPast
                  ? 'flex items-center justify-center h-9 rounded-full border border-rally-border text-rally-text-2 text-sm font-bold group-hover:text-rally-text transition-colors'
                  : 'flex items-center justify-center h-9 rounded-full bg-rally-accent text-rally-accent-text text-sm font-bold group-hover:bg-rally-accent-hover transition-colors'
              }
            >
              {isPast ? t('clubs.eventViewInApp') : t('clubs.eventJoin')}
            </span>
          </div>
        </div>
      </button>

      <AppDownloadModal
        open={appModal}
        variant="join"
        deepLinkPath={`/events/${event.id}`}
        onOpenChange={setAppModal}
      />
    </>
  )
}
