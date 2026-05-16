import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useTournaments } from '@/hooks/useTournaments'
import { useAppSession } from '@/hooks/useAppSession'
import { TournamentCard } from '@/components/tournaments/TournamentCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Tournament } from '@/types/api'

type TournamentsTab = 'upcoming' | 'my'

export default function TournamentsPage() {
  const { t } = useTranslation()
  const { status } = useAppSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: TournamentsTab = searchParams.get('tab') === 'my' ? 'my' : 'upcoming'
  const setTab = (key: TournamentsTab) => {
    const next = new URLSearchParams(searchParams)
    if (key === 'upcoming') next.delete('tab')
    else next.set('tab', key)
    setSearchParams(next, { replace: true })
  }
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const h = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(h)
  }, [search])

  const signedOut = status === 'signed_out'
  const filters = useMemo(
    () => ({
      type: tab,
      ...(debounced ? { search: debounced.slice(0, 100) } : {}),
    }),
    [tab, debounced],
  )

  const enabled = !(tab === 'my' && signedOut)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useTournaments(enabled ? filters : { type: 'upcoming' })

  const tournaments: Tournament[] =
    enabled ? data?.pages.flatMap((p) => p?.items ?? []) ?? [] : []

  return (
    <main className="pt-32 pb-24 bg-rally-bg min-h-screen">
      <section className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-6 text-rally-text">
          {t('tournament.tabTournaments')}
        </h1>

        <div className="flex gap-2 mb-6">
          {(['upcoming', 'my'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === key
                  ? 'bg-rally-accent text-rally-accent-text'
                  : 'bg-rally-surface text-rally-text-2'
              }`}
            >
              {key === 'upcoming'
                ? t('tournament.tournamentsUpcomingTab')
                : t('tournament.tournamentsMyTab')}
            </button>
          ))}
        </div>

        <div className="relative mb-8">
          <Search className="absolute end-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rally-text-muted" />
          <input
            type="text"
            placeholder={t('tournament.tournamentsSearchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
            className="w-full h-[52px] bg-rally-surface border border-rally-border rounded-[18px] px-5 pe-12 text-rally-text focus:outline-none focus:border-rally-accent"
          />
        </div>

        {tab === 'my' && signedOut ? (
          <div className="text-center py-16 text-rally-text-2">
            {t('tournament.tournamentsMyTabSignInPrompt')}
          </div>
        ) : isError ? (
          <div className="text-center py-16">
            <p className="text-rally-text-2 mb-4">
              {t('tournament.tournamentsLoadErrorTitle')}
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-[20px]" />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-rally-text font-semibold">
              {t('tournament.tournamentsEmptyTitle')}
            </p>
            <p className="text-rally-text-2 mt-1">
              {t('tournament.tournamentsEmptyMessage')}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {tournaments.map((tr) => (
                <TournamentCard key={tr.id} tournament={tr} tab={tab} />
              ))}
            </div>
            {hasNextPage && (
              <div className="text-center">
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="outline"
                >
                  {isFetchingNextPage
                    ? t('common.loading')
                    : t('common.load_more')}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}
