import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { useClubs } from '@/hooks/useClubs'
import { ClubCard } from '@/components/clubs/ClubCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Club } from '@/types/api'

const ALLOWED_NUMERIC_KEYS = ['lat', 'lon', 'max_distance'] as const

function parseFiltersFromSearchParams(searchParams: URLSearchParams) {
  const filters: Record<string, unknown> = {}
  const q = searchParams.get('q')
  if (q) filters.q = q.slice(0, 100)
  const date = searchParams.get('date')
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) filters.date = date

  for (const key of ALLOWED_NUMERIC_KEYS) {
    const raw = searchParams.get(key)
    if (raw == null) continue
    const num = Number(raw)
    if (Number.isFinite(num)) (filters as Record<string, unknown>)[key] = num
  }

  const durations = searchParams.getAll('durations').map(Number).filter((n) => [60, 90, 120].includes(n))
  if (durations.length) filters.durations = durations

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
  const [search, setSearch] = useState('')

  const initialFilters = useMemo(() => parseFiltersFromSearchParams(searchParams), [searchParams])
  const [filters, setFilters] = useState<Record<string, unknown>>(initialFilters)

  useEffect(() => {
    setFilters(parseFiltersFromSearchParams(searchParams))
  }, [searchParams])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    const trimmed = value.trim().slice(0, 100)
    setFilters((prev: Record<string, unknown>) => ({
      ...prev,
      ...(trimmed ? { q: trimmed } : { q: undefined }),
    }))
  }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useClubs(
    filters as Parameters<typeof useClubs>[0],
  )
  const clubs = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <main className="relative pt-32 pb-24 min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-[0.07]"
        style={{
          backgroundImage: "url('/padel-hero-bg.png')",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-rally-bg/40 via-transparent to-rally-bg/60"
      />
      <section className="relative container mx-auto px-4 max-w-7xl">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-rally-text mb-4">
          {t('clubs.title')}
        </h1>
        <p className="text-lg md:text-xl text-rally-text-2 max-w-2xl mb-10 leading-relaxed">
          {t('clubs.heroSubtitle')}
        </p>

        <div className="relative mb-10">
          <Search className="absolute end-5 top-1/2 -translate-y-1/2 w-5 h-5 text-rally-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder={t('clubs.searchPlaceholder')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            maxLength={100}
            className="w-full h-14 bg-rally-surface border border-rally-border rounded-lg px-5 pe-12 text-rally-text placeholder:text-rally-text-muted focus:outline-none focus:border-rally-accent focus:ring-4 focus:ring-rally-accent-dim transition-colors"
          />
        </div>

        {isError ? (
          <div className="text-center py-16">
            <p className="text-rally-text-2 mb-4">{t('clubs.load_error')}</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-[20px] bg-rally-surface" />
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-rally-text font-semibold">{t('clubs.empty')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {clubs.map((club: Club) => (
                <ClubCard key={club.id} club={club} />
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
