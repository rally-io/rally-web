import { useTranslation } from 'react-i18next'
import { MapPin, Phone, Clock, Globe, Instagram, Facebook } from 'lucide-react'
import type { Club } from '@/types/api'

interface Props {
  club: Club
  onOpenApp?: () => void
}

function mapsUrl(club: Club): string {
  if (club.latitude != null && club.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${club.latitude},${club.longitude}`,
    )}`
  }
  const addr = [club.address_line1, club.city].filter(Boolean).join(', ')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`
}

function hhmm(t?: string | null): string | null {
  return t ? t.slice(0, 5) : null
}

export function ClubInfoCard({ club, onOpenApp }: Props) {
  const { t } = useTranslation()
  const open = hhmm(club.opening_time)
  const close = hhmm(club.closing_time)

  return (
    <div className="rounded-2xl bg-rally-surface border border-rally-border p-5 space-y-4">
      <h2 className="font-display text-xl font-bold text-rally-text">{t('clubs.infoTitle')}</h2>

      <a
        href={mapsUrl(club)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('clubs.directions')}
        className="block relative h-28 rounded-xl overflow-hidden border border-rally-border bg-rally-surface-2 group"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(204,255,0,0.12),transparent_60%)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-rally-accent group-hover:scale-110 transition-transform" />
        </div>
        <span className="absolute bottom-2 inset-x-0 text-center text-xs font-semibold text-rally-text-2">
          {t('clubs.directions')}
        </span>
      </a>

      <p className="flex items-start gap-2 text-sm text-rally-text-2">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          {club.address_line1}
          {club.city ? `, ${club.city}` : ''}
        </span>
      </p>

      {club.contact_number && (
        <a
          href={`tel:${club.contact_number}`}
          className="flex items-center gap-2 text-sm text-rally-text-2 hover:text-rally-text"
        >
          <Phone className="w-4 h-4 shrink-0" />
          <span dir="ltr">{club.contact_number}</span>
          <span className="sr-only">{t('clubs.phone')}</span>
        </a>
      )}

      {open && close && (
        <p className="flex items-center gap-2 text-sm text-rally-text-2">
          <Clock className="w-4 h-4 shrink-0" />
          <span dir="ltr">
            {open}–{close}
          </span>
          <span className="sr-only">{t('clubs.hours')}</span>
        </p>
      )}

      {club.website_url && (
        <a
          href={club.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-rally-accent hover:text-rally-accent-hover break-all"
        >
          <Globe className="w-4 h-4 shrink-0" />
          <span>{t('clubs.website')}</span>
        </a>
      )}

      {(club.instagram_url || club.facebook_url) && (
        <div className="flex gap-3 pt-1">
          {club.instagram_url && (
            <a href={club.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
              className="w-9 h-9 rounded-full bg-rally-surface-2 border border-rally-border flex items-center justify-center text-rally-text-2 hover:text-rally-accent hover:border-rally-accent/50 transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
          )}
          {club.facebook_url && (
            <a href={club.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
              className="w-9 h-9 rounded-full bg-rally-surface-2 border border-rally-border flex items-center justify-center text-rally-text-2 hover:text-rally-accent hover:border-rally-accent/50 transition-colors">
              <Facebook className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {onOpenApp && (
        <button
          type="button"
          onClick={onOpenApp}
          className="w-full h-11 rounded-full bg-rally-accent text-rally-accent-text font-bold hover:bg-rally-accent-hover transition-colors"
        >
          {t('clubs.openInApp')}
        </button>
      )}
    </div>
  )
}
