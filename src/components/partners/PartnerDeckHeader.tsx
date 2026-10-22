import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

/** "Find a partner" with the way back to the tournament. The deck adds the tournament's name
    and its matches / search buttons; the sign-in and profile gates show it bare. */
export function PartnerDeckHeader({
  tournamentId,
  subtitle,
  children,
}: {
  tournamentId: string
  subtitle?: string
  children?: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <header className="flex items-center gap-2 pb-3">
      <Link
        to={`/tournaments/${tournamentId}`}
        aria-label={t('partners.back')}
        data-testid="partner-back"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-rally-text transition hover:bg-rally-surface-2"
      >
        <ChevronLeft aria-hidden className="h-6 w-6 rtl:rotate-180" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl font-black text-rally-text">{t('partners.title')}</h1>
        {subtitle && (
          <p dir="auto" className="truncate text-[13px] text-rally-text-2">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </header>
  )
}
