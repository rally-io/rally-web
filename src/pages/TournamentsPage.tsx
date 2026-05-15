import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTournaments } from '@/hooks/useTournaments'
import { TournamentCard } from '@/components/tournaments/TournamentCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import type { Tournament } from '@/types/api'

export default function TournamentsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(handle)
  }, [search])

  const filters = useMemo(() => {
    const trimmed = debouncedSearch.trim()
    return trimmed.length > 0 ? { search: trimmed.slice(0, 100) } : {}
  }, [debouncedSearch])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useTournaments(filters)

  const tournaments = data?.pages.flatMap((p) => p?.items ?? []) ?? []

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">{t('tournaments.title')}</h1>
        <div className="relative mb-8">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('tournaments.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-5 py-3 pr-10 focus:outline-none focus:border-electric-green text-white"
          />
        </div>
        {isError ? (
          <div className="text-center py-16 text-gray-400">{t('tournaments.load_error')}</div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16 text-gray-400">{t('tournaments.empty')}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {tournaments.map((tournament: Tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
            {hasNextPage && (
              <div className="text-center">
                <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline">
                  {isFetchingNextPage ? t('common.loading') : t('common.load_more')}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}
