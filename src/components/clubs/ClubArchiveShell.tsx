import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useRtl } from '@/hooks/useRtl'
import { Skeleton } from '@/components/ui/skeleton'
import { groupByMonth, isCurrentMonth, type MonthGroup } from '@/lib/monthGroups'
import { ArchiveFilterChips, useArchiveStatus } from './ArchiveFilterChips'
import { MonthSection } from './MonthSection'
import { MonthScrubber } from './MonthScrubber'

export interface ArchiveListState<T> {
  items: T[]
  isLoading: boolean
}

export interface ArchivePastState<T> extends ArchiveListState<T> {
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
}

interface Props<T> {
  clubId: string
  clubName?: string
  title: string
  upcoming: ArchiveListState<T>
  past: ArchivePastState<T>
  getDate: (item: T) => string
  renderItem: (item: T, isPast: boolean) => ReactNode
  countLabel: (count: number) => string
  emptyLabel: string
}

export function ClubArchiveShell<T extends { id: string }>({
  clubId,
  clubName,
  title,
  upcoming,
  past,
  getDate,
  renderItem,
  countLabel,
  emptyLabel,
}: Props<T>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { locale } = useRtl()
  const [status, setStatus] = useArchiveStatus()

  const showUpcoming = status !== 'completed'
  const showPast = status !== 'open'

  const upcomingGroups = useMemo(
    () => (showUpcoming ? groupByMonth(upcoming.items, getDate, 'asc') : []),
    [showUpcoming, upcoming.items, getDate],
  )
  const pastGroups = useMemo(
    () => (showPast ? groupByMonth(past.items, getDate, 'desc') : []),
    [showPast, past.items, getDate],
  )

  const scrubberMonths = useMemo(() => {
    // The current month can exist in BOTH partitions (an open tournament later
    // this month + an ended one earlier this month), so section anchors are
    // namespaced by partition; the rail keeps one entry per calendar month,
    // jumping to whichever section comes first on the page.
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
    // Same month across different years (Aug 2026 + Aug 2025) needs the year
    // suffix to stay distinguishable in the rail.
    const labelCounts = new Map<string, number>()
    for (const m of raw) labelCounts.set(m.label, (labelCounts.get(m.label) ?? 0) + 1)
    return raw.map(({ key, label, year }) => ({
      key,
      label:
        (labelCounts.get(label) ?? 0) > 1
          ? `${label} ${String(year).padStart(2, '0')}`
          : label,
    }))
  }, [upcomingGroups, pastGroups, locale])

  const isLoading = (showUpcoming && upcoming.isLoading) || (showPast && past.isLoading)
  const isEmpty = !isLoading && upcomingGroups.length === 0 && pastGroups.length === 0

  const renderGroup = (g: MonthGroup<T>, isPast: boolean) => (
    <MonthSection
      key={`${isPast ? 'past' : 'up'}-${g.key}`}
      anchorId={`m-${isPast ? 'past' : 'up'}-${g.key}`}
      monthLabel={g.date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
      countLabel={countLabel(g.items.length)}
      isCurrent={isCurrentMonth(g.key)}
    >
      {g.items.map((item) => renderItem(item, isPast))}
    </MonthSection>
  )

  return (
    <main className="min-h-screen bg-rally-bg pt-24 pb-16">
      <div className="container mx-auto max-w-5xl px-4">
        <button
          type="button"
          onClick={() => navigate(`/clubs/${clubId}`)}
          className="mb-6 inline-flex items-center gap-2 text-rally-text-2 hover:text-rally-text"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {clubName ?? t('clubs.back')}
        </button>

        <h1 className="mb-2 font-display text-3xl font-black text-rally-text md:text-4xl">
          {title}
        </h1>

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
          <div className="py-16 text-center">
            <p className="text-rally-text-2">{emptyLabel}</p>
            {status !== 'all' && (
              <button
                type="button"
                onClick={() => setStatus('all')}
                className="mt-4 h-10 rounded-full border border-rally-border bg-rally-surface px-6 text-sm font-semibold text-rally-text transition-colors hover:border-rally-accent/50"
              >
                {t('clubs.showAll')}
              </button>
            )}
          </div>
        ) : (
          <>
            {upcomingGroups.map((g) => renderGroup(g, false))}
            {upcomingGroups.length > 0 && pastGroups.length > 0 && (
              <div className="my-8 flex items-center gap-4 text-[12px] font-bold uppercase tracking-[0.14em] text-rally-text-muted">
                <span className="h-px flex-1 bg-rally-border" />
                {t('clubs.pastDivider')}
                <span className="h-px flex-1 bg-rally-border" />
              </div>
            )}
            {pastGroups.map((g) => renderGroup(g, true))}
            {showPast && past.hasNextPage && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={past.onLoadMore}
                  disabled={past.isFetchingNextPage}
                  className="h-11 rounded-full border border-rally-border bg-rally-surface px-8 font-semibold text-rally-text transition-colors hover:border-rally-accent/50 disabled:opacity-50"
                >
                  {t('clubs.loadMoreMonths')}
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
