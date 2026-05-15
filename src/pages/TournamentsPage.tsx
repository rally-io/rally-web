import { useEffect, useState } from 'react'
import { useTournaments } from '@/hooks/useTournaments'
import { TournamentCard } from '@/components/tournaments/TournamentCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import type { Tournament } from '@/types/api'

export default function TournamentsPage() {
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useTournaments(filters)

  useEffect(() => {
    const params: Record<string, any> = {}
    if (search) params.search = search
    setFilters(params)
  }, [search])

  const tournaments = data?.pages.flatMap((p) => p?.items ?? []) ?? []

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Tournaments</h1>
        <div className="relative mb-8">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tournaments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-5 py-3 pr-10 focus:outline-none focus:border-electric-green text-white"
          />
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No tournaments found</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {tournaments.map((t: Tournament) => <TournamentCard key={t.id} tournament={t} />)}
            </div>
            {hasNextPage && (
              <div className="text-center">
                <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline">
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}