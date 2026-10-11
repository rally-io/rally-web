import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CalendarDays, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCorporateEvent } from '@/constants/corporateEvents'
import type { CorporateHubEvent, CorporateTournamentEvent } from '@/constants/corporateEvents'
import { useTournament } from '@/hooks/useTournament'
import { isRegistrationOpen, registrationSummary } from '@/lib/tournamentHelpers'
import { EventHero } from '@/components/corporate/EventHero'
import { EventTerms } from '@/components/corporate/EventTerms'
import { AppDownloadFooter } from '@/components/corporate/AppDownloadFooter'

/**
 * /join/<slug> in hub mode: an event split into level categories, each its own
 * tournament with its own registration page. Nobody registers HERE — the page
 * says so, then lists the categories with how full each one is and a link to its
 * page. The same brief as the other two modes: no site navigation, the client's
 * hero, the rulebook last.
 */
export default function CorporateHubPage({ event }: { event: CorporateHubEvent }) {
  const { t } = useTranslation()

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  const flatName = event.tournamentName.replace(/\s+/g, ' ').trim()
  useEffect(() => {
    const previous = document.title
    document.title = `${flatName} · ${event.company}`
    return () => {
      document.title = previous
    }
  }, [flatName, event.company])

  // A slug that no longer names a tournament entry is skipped rather than
  // rendered as a dead link; corporateEvents.test.ts fails on one before it ships.
  const categories = event.categories
    .map((slug) => getCorporateEvent(slug))
    .filter((category): category is CorporateTournamentEvent => category?.mode === 'tournament')

  return (
    <main className="min-h-screen bg-rally-bg">
      <EventHero event={event} />
      <section className="px-4 pt-6 pb-10">
        <div className="mx-auto w-full max-w-xl">
          {/* The point of the page: the pair has to know it is NOT registering here. */}
          <div
            role="note"
            data-testid="hub-notice"
            className="rounded-2xl border border-rally-accent/40 bg-rally-accent/10 p-5 flex gap-3"
          >
            <Info aria-hidden className="w-5 h-5 text-rally-accent shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-black text-rally-text">{t('corporate.hub.noticeTitle')}</h2>
              <p className="mt-1 text-sm text-rally-text-2 leading-relaxed">{t('corporate.hub.noticeBody')}</p>
            </div>
          </div>

          <h2 className="mt-8 mb-1 font-display text-xl font-black text-rally-text">{t('corporate.hub.listTitle')}</h2>
          <p className="mb-4 text-sm text-rally-text-2">{t('corporate.hub.listHint')}</p>
          <ul className="space-y-3">
            {categories.map((category) => (
              <li key={category.slug}>
                <CategoryCard category={category} />
              </li>
            ))}
          </ul>

          {event.terms && <EventTerms sections={event.terms} className="mt-8" />}
        </div>
      </section>
      <AppDownloadFooter />
    </main>
  )
}

/**
 * One category: its level, its day, how full it is, and the way in. Reads the
 * tournament live for the count and the full flag, but the link and the copy come
 * from the entry — so a slow or failed fetch costs the count, never the link.
 */
function CategoryCard({ category }: { category: CorporateTournamentEvent }) {
  const { t } = useTranslation()
  const { data: tr } = useTournament(category.tournamentId)

  const fill = tr ? registrationSummary(tr) : null
  // `is_full` is what the category's own page acts on, so it wins; the count is
  // only the fallback for an API build that predates the field (it is optional).
  const soldOut = tr != null && (tr.is_full ?? (fill != null && fill.registered >= fill.capacity))
  const closed = tr != null && !soldOut && !(
    isRegistrationOpen(tr.registration_deadline) && (tr.status == null || tr.status === 'registration_open')
  )
  const unit = t(
    tr?.format === 'singles'
      ? 'tournament.tournamentsRegisteredUnitPlayers'
      : 'tournament.tournamentsRegisteredUnitPairs',
  )

  return (
    <Link
      to={`/join/${category.slug}`}
      data-testid={`hub-category-${category.slug}`}
      data-sold-out={soldOut ? 'true' : undefined}
      className={cn(
        'block rounded-2xl bg-rally-surface border p-4 sm:p-5 transition-colors',
        soldOut || closed
          ? 'border-rally-border hover:border-rally-border-strong'
          : 'border-rally-border hover:border-rally-accent/60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-rally-text-muted">{t('corporate.hub.levelLabel')}</p>
          {/* LTR on purpose: a range like "2.0–2.5" mirrors under the page's RTL and
              reads as 2.5–2.0 — the same isolation the tournament card gives a level. */}
          <p dir="ltr" className="mt-0.5 font-display text-xl font-black text-rally-text text-start">
            {category.levelLabel}
          </p>
        </div>
        {soldOut ? (
          <span
            data-testid="hub-sold-out"
            className="shrink-0 inline-flex items-center rounded-full bg-rally-error/15 border border-rally-error/40 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-rally-error"
          >
            {t('corporate.hub.soldOut')}
          </span>
        ) : closed ? (
          <span
            data-testid="hub-closed"
            className="shrink-0 inline-flex items-center rounded-full bg-rally-surface-2 border border-rally-border px-2.5 py-1 text-[11px] font-black text-rally-text-2"
          >
            {t('corporate.hub.closed')}
          </span>
        ) : null}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-sm text-rally-text-2">
        <CalendarDays aria-hidden className="w-4 h-4 shrink-0" />
        <span>{category.dateLabel} · {category.timeLabel}</span>
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        {/* Registered / capacity, in pairs — the rule that replaced "no numbers" on
            2026-09-01. The pair is isolated LTR: "12/16" mirrors to "16/12" in an
            RTL line and would read as over capacity. */}
        {fill ? (
          <p className="text-sm text-rally-text-2 flex items-center gap-1.5">
            <span dir="ltr" className="tabular-nums font-bold text-rally-text">
              <span>{fill.registered}</span>/<span>{fill.capacity}</span>
            </span>
            <span>{unit}</span>
          </p>
        ) : <span />}
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-rally-accent">
          {soldOut || closed ? t('corporate.hub.viewCta') : t('corporate.hub.registerCta')}
          <ArrowLeft aria-hidden className="h-4 w-4 ltr:rotate-180" />
        </span>
      </div>
    </Link>
  )
}
