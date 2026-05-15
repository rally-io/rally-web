import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClubs } from '@/hooks/useClubs'
import { ClubCard } from '@/components/clubs/ClubCard'
import { ClubSearch, type ClubSearchFilters } from '@/components/clubs/ClubSearch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Club } from '@/types/api'

const ALLOWED_NUMERIC_KEYS = ['lat', 'lon', 'max_distance'] as const

function parseFiltersFromSearchParams(searchParams: URLSearchParams): ClubSearchFilters {
  const filters: ClubSearchFilters = {}
  const q = searchParams.get('q')
  if (q) filters.q = q.slice(0, 100)
  const date = searchParams.get('date')
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) filters.date = date

  for (const key of ALLOWED_NUMERIC_KEYS) {
    const raw = searchParams.get(key)
    if (raw == null) continue
    const num = Number(raw)
    if (Number.isFinite(num)) (filters as any)[key] = num
  }

  const durations = searchParams.getAll('durations').map(Number).filter((n) => [60, 90, 120].includes(n))
  if (durations.length) filters.durations = durations as (60 | 90 | 120)[]

  const courtTypes = searchParams
    .getAll('court_types')
    .filter((t): t is 'indoor' | 'outdoor' => t === 'indoor' || t === 'outdoor')
  if (courtTypes.length) filters.court_types = courtTypes

  const sortBy = searchParams.get('sort_by')
  if (sortBy === 'distance' || sortBy === 'price') filters.sort_by = sortBy

  if (filters.lat != null && filters.lon == null) delete filters.lat
  if (filters.lon != null && filters.lat == null) delete filters.lon

  return filters
}

export default function ClubsPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const initialFilters = useMemo(() => parseFiltersFromSearchParams(searchParams), [searchParams])
  const [filters, setFilters] = useState<ClubSearchFilters>(initialFilters)

  useEffect(() => {
    setFilters(parseFiltersFromSearchParams(searchParams))
  }, [searchParams])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useClubs(filters)
  const clubs = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">{t('clubs.title', { defaultValue: 'Clubs' })}</h1>
        <ClubSearch onSearch={(f) => setFilters(f)} />
        {isError ? (
          <div className="text-center py-16 text-gray-400">{t('clubs.load_error', { defaultValue: 'Could not load clubs.' })}</div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
          </div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">{t('clubs.empty', { defaultValue: 'No clubs found' })}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {clubs.map((club: Club) => <ClubCard key={club.id} club={club} />)}
            </div>
            {hasNextPage && (
              <div className="text-center">
                <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline">
                  {isFetchingNextPage
                    ? t('common.loading', { defaultValue: 'Loading...' })
                    : t('common.load_more', { defaultValue: 'Load more' })}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}
