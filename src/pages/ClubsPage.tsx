import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useClubs } from '@/hooks/useClubs'
import { ClubCard } from '@/components/clubs/ClubCard'
import { ClubSearch } from '@/components/clubs/ClubSearch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Club } from '@/types/api'

export default function ClubsPage() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<Record<string, any>>({})

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useClubs(filters)

  useEffect(() => {
    const params: Record<string, any> = {}
    const text = searchParams.get('text')
    const date = searchParams.get('date')
    const duration = searchParams.get('duration')
    const court_type = searchParams.get('court_type')
    if (text) params.text = text
    if (date) params.date = date
    if (duration) params.duration = Number(duration)
    if (court_type) params.court_type = court_type
    setFilters(params)
  }, [searchParams])

  const clubs = data?.pages.flatMap((p) => p?.items ?? []) ?? []

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Clubs</h1>
        <ClubSearch onSearch={(f) => setFilters(f)} />
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
          </div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No clubs found</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {clubs.map((club: Club) => <ClubCard key={club.id} club={club} />)}
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