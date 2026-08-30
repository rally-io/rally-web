import { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Trophy, User } from 'lucide-react'
import { useOrganizer } from '@/hooks/useOrganizer'
import { useOrganizerTournaments } from '@/hooks/useOrganizerTournaments'
import { useOrganizerPastTournaments } from '@/hooks/useOrganizerPastTournaments'
import { TournamentCard } from '@/components/tournaments/TournamentCard'
import { ArchiveFilterChips, useArchiveStatus } from '@/components/clubs/ArchiveFilterChips'
import { MonthSection } from '@/components/clubs/MonthSection'
import { MonthScrubber } from '@/components/clubs/MonthScrubber'
import { groupByMonth, isCurrentMonth } from '@/lib/monthGroups'
import { Skeleton } from '@/components/ui/skeleton'
import { useRtl } from '@/hooks/useRtl'
import type { Tournament } from '@/types/api'

const getStartDate = (t: Tournament) => t.start_date

export default function OrganizerTournamentsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { locale } = useRtl()
  const { slug } = useParams<{ slug: string }>()
  const organizerSlug = slug!

  const { data: organizer, isLoading: organizerLoading } = useOrganizer(organizerSlug)
  const [status, setStatus] = useArchiveStatus()

  const upcoming = useOrganizerTournaments(organizerSlug)
  const past = useOrganizerPastTournaments(organizerSlug, status !== 'open')

  const showUpcoming = status !== 'completed'
  const showPast = status !== 'open'

  // Pre-fetch all upcoming pages for the month scrubber
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = upcoming
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const upcomingItems = useMemo(
    () =>
      (upcoming.data?.pages.flatMap((p) => (p && 'items' in p ? p.items : [])) ?? []).filter(
        (t) => new Date(t.end_date).getTime() >= Date.now(),
      ),
    [upcoming.data],
  )
  const pastItems = useMemo(
    () =>
      (past.data?.pages.flatMap((p) => (p && 'items' in p ? p.items : [])) ?? []).filter(
        (t) => new Date(t.end_date).getTime() < Date.now(),
      ),
    [past.data],
  )

  const upcomingGroups = useMemo(
    () => (showUpcoming ? groupByMonth(upcomingItems, getStartDate, 'asc') : []),
    [showUpcoming, upcomingItems],
  )
  const pastGroups = useMemo(
    () => (showPast ? groupByMonth(pastItems, getStartDate, 'desc') : []),
    [showPast, pastItems],
  )

  const scrubberMonths = useMemo(() => {
    const combined = [
      ...upcomingGroups.map((g) => ({ g, prefix: 'up' })),
      ...pastGroups.map((g) => ({ g, prefix: 'past' })),
    ]
    const seenMonths = new Set<string>()
    const raw: { key: string; label: string; year: number }[] = []
    for (const { g, prefix } of combined) {
      if (seenMonths.has(g.key)) continue
      seenMonths.add(g.key)
      raw.push({
        key: `${prefix}-${g.key}`,
        label: g.date.toLocaleDateString(locale, { month: 'short' }),
        year: g.date.getFullYear() % 100,
      })
    }
    const labelCounts = new Map<string, number>()
    for (const m of raw) labelCounts.set(m.label, (labelCounts.get(m.label) ?? 0) + 1)
    return raw.map(({ key, label, year }) => ({
      key,
      label: (labelCounts.get(label) ?? 0) > 1 ? `${label} ${String(year).padStart(2, '0')}` : label,
    }))
  }, [upcomingGroups, pastGroups, locale])

  const isLoading = (showUpcoming && upcoming.isLoading) || (showPast && past.isLoading)
  const isEmpty = !isLoading && upcomingGroups.length === 0 && pastGroups.length === 0

  useEffect(() => {
    document.title = [
      organizer?.name,
      t('organizer.allTournamentsTitle', { defaultValue: 'Tournaments' }),
      'Rally',
    ]
      .filter(Boolean)
      .join(' · ')
  }, [organizer, t])

  return (
    <main className="min-h-screen bg-rally-bg pt-24 pb-16">
      <div className="container mx-auto max-w-5xl px-4">

        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-rally-text-2 hover:text-rally-text"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.back', { defaultValue: 'Back' })}
        </button>

        {/* Organizer header */}
        {organizerLoading ? (
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full bg-rally-surface" />
            <div className="space-y-2">
              <Skeleton className="h-9 w-52 bg-rally-surface" />
              <Skeleton className="h-4 w-36 bg-rally-surface" />
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-4">
            {organizer?.avatar_url ? (
              <img
                src={organizer.avatar_url}
                alt={organizer.name}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-rally-accent/30"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rally-accent/20 to-rally-accent/5 ring-2 ring-rally-accent/20">
                <User className="h-7 w-7 text-rally-accent/70" />
              </div>
            )}
            <div>
              <h1 className="font-display text-3xl font-black text-rally-text md:text-4xl">
                {organizer?.name ?? organizerSlug}
              </h1>
              {organizer && (
                <p className="mt-0.5 text-sm text-rally-text-2">
                  {t('organizer.tournamentsCount', {
                    count: organizer.tournaments_count,
                    defaultValue: '{{count}} tournaments',
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        <ArchiveFilterChips />

        {isLoading ? (
          <div className="py-4">
            <Skeleton className="mb-5 h-8 w-44 bg-rally-surface" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-[20px] bg-rally-surface" />
              ))}
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rally-accent/10 to-rally-accent/5">
              <Trophy className="h-9 w-9 text-rally-accent/60" />
            </div>
            <p className="font-display text-xl font-bold text-rally-text">
              {t('organizer.noTournamentsYet', { defaultValue: 'No tournaments yet' })}
            </p>
            <p className="mt-2 max-w-sm text-sm text-rally-text-2">
              {t('organizer.noTournamentsDesc', {
                defaultValue: "This organizer hasn't published any tournaments yet. Check back soon!",
              })}
            </p>
            {status !== 'all' && (
              <button
                type="button"
                onClick={() => setStatus('all')}
                className="mt-4 h-10 rounded-full border border-rally-border bg-rally-surface px-6 text-sm font-semibold text-rally-text transition-colors hover:border-rally-accent/50"
              >
                {t('clubs.showAll', { defaultValue: 'Show all' })}
              </button>
            )}
          </div>
        ) : (
          <>
            {upcomingGroups.length > 0 && (
              <div className="space-y-6">
                {status === 'all' && pastGroups.length > 0 && (
                  <div className="flex items-center gap-3 pt-2 pb-1 border-b border-rally-border">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-rally-accent animate-pulse" />
                    <h2 className="text-lg font-black uppercase tracking-wider text-rally-text">
                      {t('organizer.upcomingTournaments', { defaultValue: 'Upcoming Tournaments' })}
                    </h2>
                    <span className="rounded-full bg-rally-surface px-2.5 py-0.5 text-xs font-semibold text-rally-text-2">
                      {upcomingItems.length}
                    </span>
                  </div>
                )}
                {upcomingGroups.map((g) => (
                  <MonthSection
                    key={`up-${g.key}`}
                    anchorId={`m-up-${g.key}`}
                    monthLabel={g.date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                    countLabel={t('clubs.monthTournaments', { count: g.items.length, defaultValue: '{{count}} tournament' })}
                    isCurrent={isCurrentMonth(g.key)}
                  >
                    {g.items.map((tr) => (
                      <TournamentCard key={tr.id} tournament={tr} variant="default" />
                    ))}
                  </MonthSection>
                ))}
              </div>
            )}

            {pastGroups.length > 0 && (
              <div className="space-y-6 mt-12">
                {(status === 'all' || upcomingGroups.length > 0) && (
                  <div className="flex items-center gap-3 pt-6 pb-1 border-b border-rally-border">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-rally-text-muted" />
                    <h2 className="text-lg font-black uppercase tracking-wider text-rally-text-2">
                      {t('organizer.pastTournaments', { defaultValue: 'Past Tournaments' })}
                    </h2>
                    <span className="rounded-full bg-rally-surface px-2.5 py-0.5 text-xs font-semibold text-rally-text-2">
                      {pastItems.length}
                    </span>
                  </div>
                )}
                {pastGroups.map((g) => (
                  <MonthSection
                    key={`past-${g.key}`}
                    anchorId={`m-past-${g.key}`}
                    monthLabel={g.date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                    countLabel={t('clubs.monthTournaments', { count: g.items.length, defaultValue: '{{count}} tournament' })}
                    isCurrent={isCurrentMonth(g.key)}
                  >
                    {g.items.map((tr) => (
                      <TournamentCard key={tr.id} tournament={tr} variant="past" />
                    ))}
                  </MonthSection>
                ))}
              </div>
            )}

            {showPast && past.hasNextPage && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => past.fetchNextPage()}
                  disabled={past.isFetchingNextPage}
                  className="h-11 rounded-full border border-rally-border bg-rally-surface px-8 font-semibold text-rally-text transition-colors hover:border-rally-accent/50 disabled:opacity-50"
                >
                  {t('clubs.loadMoreMonths', { defaultValue: 'Load more' })}
                </button>
              </div>
            )}
          </>
        )}

        <MonthScrubber months={scrubberMonths} />
      </div>
    </main>
  )
}
