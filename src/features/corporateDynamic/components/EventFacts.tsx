import { useTranslation } from 'react-i18next'
import { Calendar, Clock, MapPin, TrendingUp, Trophy, Users } from 'lucide-react'
import { FactCard } from '@/components/tournaments/FactCard'
import { useRtl } from '@/hooks/useRtl'
import { formatTournamentCardDate } from '@/lib/tournamentHelpers'
import { formatLabelKey, structureLabelKey } from '@/lib/tournamentTheme'
import { detailLabelsFor } from '../hero'
import type { PublicCategory, PublicCorporateEvent } from '../types'

/** "Tournament today / tomorrow / N days" — the countdown pill TournamentDetailPage shows beside its date. */
function Countdown({ startAt }: { startAt: string }) {
  const { t } = useTranslation()
  const startMs = new Date(startAt).getTime()
  if (!Number.isFinite(startMs)) return null
  const days = Math.ceil((startMs - Date.now()) / 86_400_000)
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-2 text-rally-text-2 text-sm">
        <Clock className="w-4 h-4" />
        {t('tournament.tournamentPast')}
      </span>
    )
  }
  if (days === 0) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rally-accent text-rally-accent-text font-bold text-sm">
        <Clock className="w-4 h-4" />
        {t('tournament.tournamentToday')}
      </span>
    )
  }
  if (days === 1) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rally-accent/20 text-rally-accent font-bold text-sm">
        <Clock className="w-4 h-4" />
        {t('tournament.tournamentTomorrow')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rally-blue/15 text-rally-blue font-semibold text-sm">
      <Clock className="w-4 h-4" />
      {t('tournament.daysRemainingToTournament', { count: days })}
    </span>
  )
}

/** The date strip under the title, same card as the tournament page's. Nothing without a date. */
export function DateCard({ event }: { event: PublicCorporateEvent }) {
  const { locale } = useRtl()
  const labels = detailLabelsFor(event)
  if (!labels.enabled) return null
  const fromEvent = event.start_at
    ? formatTournamentCardDate(event.start_at, event.end_at ?? event.start_at, locale, true)
    : ''
  // The manager's own wording wins; it is copy, so it is not parsed or localised.
  const text = labels.date ? [labels.date, labels.time].filter(Boolean).join(' · ') : fromEvent || labels.time
  if (!text) return null
  return (
    <section className="rounded-2xl bg-rally-surface border border-rally-border p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex items-center gap-3 text-rally-text">
        <Calendar className="w-5 h-5 text-rally-accent shrink-0" />
        <span dir="auto" className="font-semibold text-base md:text-lg">{text}</span>
      </div>
      {event.start_at && <Countdown startAt={event.start_at} />}
    </section>
  )
}

/** Where it is played: the club and its address, as a fact card in its own titled section. */
export function VenueSection({ event }: { event: PublicCorporateEvent }) {
  const { t } = useTranslation()
  const labels = detailLabelsFor(event)
  if (!labels.enabled) return null
  const value = labels.venue || [event.club_name, event.club_address].filter(Boolean).join('\n')
  if (!value.trim()) return null
  return (
    <section>
      <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text mb-5">{t('corporate.detailsLocation')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FactCard
          icon={<MapPin className="w-5 h-5" />}
          label={t('corporate.detailsLocation')}
          value={<span dir="auto" className="whitespace-pre-line">{value}</span>}
        />
      </div>
    </section>
  )
}

/**
 * One category as the tournament page's Format / Level / Structure cards, plus how full it is.
 * The registered/capacity line is the one the tournament cards carry ("12/16 pairs", never a
 * count of free seats); a full category gets the badge instead of a number.
 */
function CategoryFacts({ category, titled }: { category: PublicCategory; titled: boolean }) {
  const { t } = useTranslation()
  const unit = t(
    category.format === 'singles' ? 'tournament.tournamentsRegisteredUnitPlayers' : 'tournament.tournamentsRegisteredUnitPairs',
  )
  const capacity = category.max_participants ?? 0
  return (
    <div data-testid="category-facts" className="space-y-3">
      {titled && (
        <div className="flex flex-wrap items-center gap-2">
          <h3 dir="auto" className="font-display text-lg md:text-xl font-bold text-rally-text">{category.name}</h3>
          {category.is_full && (
            <span className="rounded-full border border-rally-warning/50 bg-rally-warning/10 px-2.5 py-0.5 text-xs font-bold text-rally-warning">
              {t('corporate.dyn.categoryFull')}
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FactCard icon={<Users className="w-5 h-5" />} label={t('tournament.factCardFormat')} value={t(formatLabelKey(category.format))} />
        {category.level_label && (
          <FactCard
            icon={<TrendingUp className="w-5 h-5" />}
            label={t('tournament.factCardSkill')}
            value={<span dir="ltr">{category.level_label}</span>}
          />
        )}
        <FactCard icon={<Trophy className="w-5 h-5" />} label={t('tournament.factCardStructure')} value={t(structureLabelKey(category.structure))} />
      </div>
      {(capacity > 0 || (!titled && category.is_full)) && (
        <p className="text-sm text-rally-text-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {capacity > 0 && (
            <>
              {/* The pair is isolated LTR: "12/16" mirrors to "16/12" in an RTL line and reads as over capacity. */}
              <span dir="ltr" className="tabular-nums font-bold text-rally-text">
                <span>{category.confirmed_count}</span>/<span>{capacity}</span>
              </span>
              <span>{unit}</span>
            </>
          )}
          {!titled && category.is_full && (
            <span className="rounded-full border border-rally-warning/50 bg-rally-warning/10 px-2.5 py-0.5 text-xs font-bold text-rally-warning">
              {t('corporate.dyn.categoryFull')}
            </span>
          )}
        </p>
      )}
    </div>
  )
}

export function CategoriesSection({ categories }: { categories: PublicCategory[] }) {
  const { t } = useTranslation()
  if (categories.length === 0) return null
  return (
    <section>
      <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text mb-5">
        {t('tournament.tournamentDetailCategory')}
      </h2>
      <div className="space-y-8">
        {categories.map((c) => (
          <CategoryFacts key={c.tournament_id} category={c} titled={categories.length > 1} />
        ))}
      </div>
    </section>
  )
}
