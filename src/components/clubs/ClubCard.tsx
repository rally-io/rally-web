import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import type { Club } from '@/types/api'

interface ClubCardProps {
  club: Club
}

export function ClubCard({ club }: ClubCardProps) {
  const { t } = useTranslation()
  return (
    <Link to={`/clubs/${club.id}`}>
      <Card className="bg-rally-surface border border-rally-border rounded-[20px] overflow-hidden hover:border-rally-accent/50 transition-colors cursor-pointer h-full">
        <div className="aspect-video bg-rally-surface-2 relative">
          {club.thumb_url ? (
            <img src={club.thumb_url} alt={club.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-rally-text-muted">
              <MapPin className="w-10 h-10 opacity-30" />
            </div>
          )}
          {club.has_availability && (
            <span className="absolute top-3 start-3 inline-flex items-center px-3 py-1.5 rounded-md bg-rally-accent text-rally-accent-text text-xs font-bold">
              {t('clubs.available', { defaultValue: 'Available' })}
            </span>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-extrabold text-lg text-rally-text line-clamp-2 flex-1 leading-tight">
              {club.name}
            </h3>
            {club.court_types.length > 0 && (
              <span className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-md bg-rally-surface-2 border border-rally-border text-rally-text-2 text-xs font-semibold">
                {club.court_types[0]}
              </span>
            )}
          </div>
          <p className="text-sm text-rally-text-2 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 shrink-0" />
            {club.city}
            {club.distance_km != null && (
              <span className="text-rally-accent">· {club.distance_km.toFixed(1)} km</span>
            )}
          </p>
          {club.court_types.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {club.court_types.slice(1).map((type) => (
                <span key={type} className="rounded-full bg-rally-surface-2 px-2.5 py-1 text-xs text-rally-text-2">
                  {type}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">
                {t('clubs.from', { defaultValue: 'From' })}
              </p>
              <p className="text-2xl font-black text-rally-accent">
                ₪{club.starts_from}
                <span className="text-sm font-normal text-rally-text-2"> /hour</span>
              </p>
            </div>
            <span className="inline-flex items-center justify-center min-w-[100px] h-10 rounded-full bg-rally-accent text-rally-accent-text font-bold">
              {t('clubs.view', { defaultValue: 'View' })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}