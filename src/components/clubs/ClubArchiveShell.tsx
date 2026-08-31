import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { MonthArchive, type ArchiveSection } from '@/components/archive/MonthArchive'
import { ArchiveFilterChips, useArchiveStatus } from './ArchiveFilterChips'

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
  const [status, setStatus] = useArchiveStatus()

  const showUpcoming = status !== 'completed'
  const showPast = status !== 'open'

  const sections = useMemo<ArchiveSection<T>[]>(
    () => [
      { key: 'up', items: showUpcoming ? upcoming.items : [], direction: 'asc', isPast: false },
      { key: 'past', items: showPast ? past.items : [], direction: 'desc', isPast: true },
    ],
    [showUpcoming, showPast, upcoming.items, past.items],
  )

  const isLoading = (showUpcoming && upcoming.isLoading) || (showPast && past.isLoading)

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
        ) : (
          <MonthArchive
            sections={sections}
            getDate={getDate}
            renderItem={renderItem}
            countLabel={countLabel}
            dividerLabel={t('clubs.pastDivider')}
            empty={
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
            }
            footer={
              showPast && past.hasNextPage ? (
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
              ) : null
            }
          />
        )}
      </div>
    </main>
  )
}
