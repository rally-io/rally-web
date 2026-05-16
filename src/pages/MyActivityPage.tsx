import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useTournaments } from '@/hooks/useTournaments'
import { useAppSession } from '@/hooks/useAppSession'
import { TournamentCard } from '@/components/tournaments/TournamentCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Tournament } from '@/types/api'

type ActivityType = 'tournaments' | 'bookings' | 'classes'

const VALID_TYPES: ActivityType[] = ['tournaments', 'bookings', 'classes']

export default function MyActivityPage() {
  const { t } = useTranslation()
  const { status } = useAppSession()
  const [searchParams, setSearchParams] = useSearchParams()

  const typeParam = searchParams.get('type') as ActivityType | null
  const activeType: ActivityType =
    typeParam && VALID_TYPES.includes(typeParam) ? typeParam : 'tournaments'

  const setActiveType = (next: ActivityType) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'tournaments') params.delete('type')
    else params.set('type', next)
    setSearchParams(params, { replace: true })
  }

  const signedOut = status === 'signed_out'
  const tournamentsEnabled = activeType === 'tournaments' && !signedOut
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useTournaments(tournamentsEnabled ? { type: 'my' } : { type: 'upcoming' })

  const tournaments: Tournament[] = tournamentsEnabled
    ? data?.pages.flatMap((p) => p?.items ?? []) ?? []
    : []

  return (
    <main className="pt-32 pb-24 bg-rally-bg min-h-screen">
      <section className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-6 text-rally-text">
          {t('myActivity.title')}
        </h1>

        <div className="flex gap-2 mb-8 flex-wrap">
          {VALID_TYPES.map((key) => (
            <button
              key={key}
              onClick={() => setActiveType(key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeType === key
                  ? 'bg-rally-accent text-rally-accent-text'
                  : 'bg-rally-surface text-rally-text-2'
              }`}
            >
              {t(`myActivity.filter_${key}`)}
            </button>
          ))}
        </div>

        {signedOut ? (
          <div className="text-center py-16 text-rally-text-2">
            {t('myActivity.sign_in_prompt')}
          </div>
        ) : activeType === 'tournaments' ? (
          isError ? (
            <div className="text-center py-16">
              <p className="text-rally-text-2">
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
                {t('myActivity.empty_tournaments_title')}
              </p>
              <p className="text-rally-text-2 mt-1">
                {t('myActivity.empty_tournaments_body')}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {tournaments.map((tr) => (
                  <TournamentCard key={tr.id} tournament={tr} tab="my" />
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
          )
        ) : activeType === 'bookings' ? (
          <div className="text-center py-16">
            <p className="text-rally-text font-semibold">
              {t('myActivity.coming_soon_bookings_title')}
            </p>
            <p className="text-rally-text-2 mt-1">
              {t('myActivity.coming_soon_bookings_body')}
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-rally-text font-semibold">
              {t('myActivity.coming_soon_classes_title')}
            </p>
            <p className="text-rally-text-2 mt-1">
              {t('myActivity.coming_soon_classes_body')}
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
