import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Search, Lock, Calendar, MapPin } from 'lucide-react'
import { useTournaments } from '@/hooks/useTournaments'
import { usePastTournaments } from '@/hooks/usePastTournaments'
import { useAutoDrainPages } from '@/hooks/useAutoDrainPages'
import { useAppSession } from '@/hooks/useAppSession'
import { useRtl } from '@/hooks/useRtl'
import { TournamentFilterBar } from '@/components/tournaments/TournamentFilterBar'
import { TournamentCard } from '@/components/tournaments/TournamentCard'
import { MonthArchive } from '@/components/archive/MonthArchive'
import {
  TournamentUpdatesModal,
  TournamentUpdatesTrigger,
} from '@/components/tournaments/TournamentUpdatesModal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isPastTournament, isTournamentLive } from '@/lib/tournamentHelpers'
import {
  EMPTY_FILTERS,
  activeFilterCount,
  hasClientFilters,
  matchesFilters,
  monthOptionsFrom,
  parseTournamentFilters,
  toServerParams,
  writeTournamentFilters,
} from '@/lib/tournamentFilters'
import type { Tournament } from '@/types/api'

type TournamentsTab = 'upcoming' | 'history' | 'my'

/**
 * How far we will page through the API to satisfy a filter it cannot apply
 * itself (skill, month). Enough to make the filter feel complete on the feeds
 * this site has, small enough that it can never turn into an endless crawl.
 */
const CLIENT_FILTER_ITEM_CAP = 200

const getStartDate = (tr: Tournament) => tr.start_date

export default function TournamentsPage() {
  const { t } = useTranslation()
  const { locale } = useRtl()
  const { status } = useAppSession()
  const signedOut = status === 'signed_out'
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = searchParams.get('tab')
  const tab: TournamentsTab =
    tabParam === 'history' ? 'history' : !signedOut && tabParam === 'my' ? 'my' : 'upcoming'
  // "My tournaments" needs an account; history and upcoming are public.
  const tabs: TournamentsTab[] = signedOut
    ? ['upcoming', 'history']
    : ['upcoming', 'history', 'my']

  const setTab = (key: TournamentsTab) => {
    const next = new URLSearchParams(searchParams)
    if (key === 'upcoming') next.delete('tab')
    else next.set('tab', key)
    setSearchParams(next, { replace: true })
  }
  const sort: 'soonest' | 'latest' =
    searchParams.get('sort') === 'latest' ? 'latest' : 'soonest' // unknown → default

  const filters = useMemo(() => parseTournamentFilters(searchParams), [searchParams])

  const setSort = (next: 'soonest' | 'latest') => {
    const params = new URLSearchParams(searchParams)
    if (next === 'soonest') params.delete('sort') // bare URL = enforced default
    else params.set('sort', next)
    setSearchParams(params, { replace: true })
  }
  const setFilters = (next: typeof filters) => {
    setSearchParams(writeTournamentFilters(searchParams, next), { replace: true })
  }
  const clearFilters = () => {
    const params = writeTournamentFilters(searchParams, EMPTY_FILTERS)
    params.delete('sort')
    setSearchParams(params, { replace: true })
  }
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const h = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(h)
  }, [search])
  const searchTerm = debounced.slice(0, 100)

  // "My tournaments" is a personal list — the filter bar is hidden there, so
  // its params must not leak into the query either.
  const filtersApply = tab !== 'my'
  const serverParams = useMemo(
    () => (filtersApply ? toServerParams(filters) : {}),
    [filtersApply, filters],
  )

  const listFilters = useMemo(
    () => ({
      type: tab === 'my' ? ('my' as const) : ('upcoming' as const),
      ...(searchTerm ? { search: searchTerm } : {}),
      ...(tab === 'upcoming' ? serverParams : {}),
      ...(tab === 'upcoming' && sort === 'latest' ? { sort } : {}),
    }),
    [tab, searchTerm, serverParams, sort],
  )

  const list = useTournaments(listFilters, tab !== 'history')
  const history = usePastTournaments(
    useMemo(
      () => ({ ...(searchTerm ? { search: searchTerm } : {}), ...serverParams }),
      [searchTerm, serverParams],
    ),
    tab === 'history',
  )

  const loadedList: Tournament[] = useMemo(
    () => list.data?.pages.flatMap((p) => p?.items ?? []) ?? [],
    [list.data],
  )
  // `scope=past` still returns tournaments being played right now, because the
  // client asks for `include_live` — history means finished.
  const loadedHistory: Tournament[] = useMemo(
    () =>
      (history.data?.pages.flatMap((p) => (p && 'items' in p ? p.items : [])) ?? []).filter(
        isPastTournament,
      ),
    [history.data],
  )

  // Skill and month are narrowed here because the API takes no such params;
  // clubs and organizers were already applied server-side.
  const clientFiltering = filtersApply && hasClientFilters(filters)
  useAutoDrainPages(list, {
    enabled: tab === 'upcoming' && clientFiltering,
    loadedCount: loadedList.length,
    maxItems: CLIENT_FILTER_ITEM_CAP,
  })
  useAutoDrainPages(history, {
    enabled: tab === 'history' && clientFiltering,
    loadedCount: loadedHistory.length,
    maxItems: CLIENT_FILTER_ITEM_CAP,
  })

  const visibleList = useMemo(
    () => (clientFiltering ? loadedList.filter((tr) => matchesFilters(tr, filters)) : loadedList),
    [clientFiltering, loadedList, filters],
  )
  const visibleHistory = useMemo(
    () =>
      clientFiltering ? loadedHistory.filter((tr) => matchesFilters(tr, filters)) : loadedHistory,
    [clientFiltering, loadedHistory, filters],
  )

  const tournaments: Tournament[] = [
    ...visibleList.filter(isTournamentLive),
    ...visibleList.filter((tr) => !isTournamentLive(tr)),
  ]

  // Months come from the loaded data, so the dropdown never offers a month
  // with nothing behind it — and reads in list order on each tab.
  const monthOptions = useMemo(
    () =>
      tab === 'history'
        ? monthOptionsFrom(loadedHistory, 'desc', locale)
        : monthOptionsFrom(loadedList, 'asc', locale),
    [tab, loadedHistory, loadedList, locale],
  )

  const filtersActive = activeFilterCount(filters) > 0
  const isLoading = tab === 'history' ? history.isLoading : list.isLoading
  const isError = tab === 'history' ? history.isError : list.isError

  const [updatesOpen, setUpdatesOpen] = useState(false)

  const historyEmptyState = (
    <div className="py-16 text-center">
      {filtersActive ? (
        <>
          <p className="text-rally-text font-semibold">
            {t('tournament.tournamentsFilterNoResults')}
          </p>
          <Button variant="outline" onClick={clearFilters} className="mt-5">
            {t('tournament.tournamentsFilterEmptyCta')}
          </Button>
        </>
      ) : (
        <>
          <p className="font-display text-2xl font-bold text-rally-text mb-2">
            {t('tournament.tournamentsHistoryEmptyTitle')}
          </p>
          <p className="text-rally-text-2">{t('tournament.tournamentsHistoryEmptyMessage')}</p>
        </>
      )}
    </div>
  )

  return (
    <main className="relative pt-32 pb-24 min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-[0.07]"
        style={{
          backgroundImage: "url('/padel-hero-bg.jpg')",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-rally-bg/40 via-transparent to-rally-bg/60"
      />
      <section className="relative container mx-auto px-4 max-w-7xl">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-rally-text mb-4">
          {t('tournament.tabTournaments')}
        </h1>
        <p className="text-lg md:text-xl text-rally-text-2 max-w-2xl mb-10 leading-relaxed">
          {tab === 'history'
            ? t('tournament.tournamentsHistoryHint')
            : t('tournament.tournamentsHeroSubtitle')}
        </p>

        <div className="flex flex-wrap gap-3 mb-8">
          {tabs.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                tab === key
                  ? 'bg-rally-accent text-rally-accent-text shadow-glow-electric'
                  : 'bg-transparent border border-rally-border text-rally-text-2 hover:border-rally-border-strong hover:text-rally-text'
              }`}
            >
              {key === 'upcoming'
                ? t('tournament.tournamentsUpcomingTab')
                : key === 'history'
                ? t('tournament.tournamentsHistoryTab')
                : t('tournament.tournamentsMyTab')}
            </button>
          ))}
        </div>

        <div className="relative mb-10">
          <Search className="absolute end-5 top-1/2 -translate-y-1/2 w-5 h-5 text-rally-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder={t('tournament.tournamentsSearchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
            className="w-full h-14 bg-rally-surface border border-rally-border rounded-lg px-5 pe-12 text-rally-text placeholder:text-rally-text-muted focus:outline-none focus:border-rally-accent focus:ring-4 focus:ring-rally-accent-dim transition-colors"
          />
        </div>

        {filtersApply && (
          <TournamentFilterBar
            filters={filters}
            onChange={setFilters}
            monthOptions={monthOptions}
            search={searchTerm}
            // The API ignores `sort` outside the open scope, so history is
            // always newest-first and offering the toggle would lie.
            sort={tab === 'upcoming' ? sort : undefined}
            onSortChange={tab === 'upcoming' ? setSort : undefined}
            onClearAll={clearFilters}
          />
        )}

        {tab === 'history' ? (
          isError ? (
            <div className="text-center py-16">
              <p className="font-display text-xl font-bold text-rally-text mb-4">
                {t('tournament.tournamentsLoadErrorTitle')}
              </p>
              <Button variant="outline" onClick={() => history.refetch()}>
                {t('tournament.tournamentsRetry')}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-[20px] bg-rally-surface" />
              ))}
            </div>
          ) : (
            <MonthArchive
              sections={[
                { key: 'past', items: visibleHistory, direction: 'desc', isPast: true },
              ]}
              getDate={getStartDate}
              renderItem={(tr) => <TournamentCard key={tr.id} tournament={tr} variant="past" />}
              countLabel={(count) => t('clubs.monthTournaments', { count })}
              empty={historyEmptyState}
              footer={
                history.hasNextPage ? (
                  <div className="mt-6 text-center">
                    <Button
                      variant="outline"
                      onClick={() => history.fetchNextPage()}
                      disabled={history.isFetchingNextPage}
                    >
                      {history.isFetchingNextPage
                        ? t('common.loading')
                        : t('clubs.loadMoreMonths')}
                    </Button>
                  </div>
                ) : null
              }
            />
          )
        ) : isError ? (
          <>
            <div className="text-center py-8">
              <p className="font-display text-xl sm:text-2xl font-bold text-rally-text mb-2">
                {t('tournament.tournamentsWorkingTitle')}
              </p>
              <p className="text-rally-text-2 mb-5">
                {t('tournament.tournamentsWorkingMessage')}
              </p>
              <TournamentUpdatesTrigger onClick={() => setUpdatesOpen(true)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TEASER_CONFIGS.map((cfg, i) => (
                <TournamentCardTeaser key={`teaser-${i}`} {...cfg} />
              ))}
            </div>
          </>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl bg-rally-surface" />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          tab === 'my' ? (
            <div className="text-center py-16 max-w-md mx-auto">
              <p className="font-display text-2xl md:text-3xl font-bold text-rally-text mb-3">
                {t('tournament.tournamentsMyEmptyTitle')}
              </p>
              <p className="text-rally-text-2 mb-8 leading-relaxed">
                {t('tournament.tournamentsMyEmptyMessage')}
              </p>
              <Button
                onClick={() => setTab('upcoming')}
                className="bg-rally-accent text-rally-accent-text hover:bg-rally-accent-hover font-bold"
              >
                {t('tournament.tournamentsMyEmptyCta')}
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center py-8">
                <p className="text-rally-text font-semibold">
                  {filtersActive
                    ? t('tournament.tournamentsFilterNoResults')
                    : t('tournament.tournamentsEmptyTitle')}
                </p>
                <p className="text-rally-text-2 mt-1 mb-5">
                  {t('tournament.tournamentsEmptyMessage')}
                </p>
                <TournamentUpdatesTrigger onClick={() => setUpdatesOpen(true)} />
              </div>
              {filtersActive && (
                <Button variant="outline" onClick={clearFilters} className="mb-6">
                  {t('tournament.tournamentsFilterEmptyCta')}
                </Button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {TEASER_CONFIGS.map((cfg, i) => (
                  <TournamentCardTeaser key={`teaser-${i}`} {...cfg} />
                ))}
              </div>
            </>
          )
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {tournaments.map((tr) => (
                <TournamentCard key={tr.id} tournament={tr} tab={tab === 'my' ? 'my' : 'upcoming'} />
              ))}
              {tab === 'upcoming' &&
                TEASER_CONFIGS.map((cfg, i) => (
                  <TournamentCardTeaser key={`teaser-${i}`} {...cfg} />
                ))}
            </div>
            {list.hasNextPage && (
              <div className="text-center">
                <Button
                  onClick={() => list.fetchNextPage()}
                  disabled={list.isFetchingNextPage}
                  variant="outline"
                >
                  {list.isFetchingNextPage
                    ? t('common.loading')
                    : t('common.load_more')}
                </Button>
              </div>
            )}
            {tab === 'upcoming' && (
              <div className="text-center mt-10">
                <p className="text-sm text-rally-text-2 mb-3">
                  {t('tournament.tournamentsUpdatesHint')}
                </p>
                <TournamentUpdatesTrigger onClick={() => setUpdatesOpen(true)} />
              </div>
            )}
          </>
        )}

        <TournamentUpdatesModal open={updatesOpen} onOpenChange={setUpdatesOpen} />
      </section>
    </main>
  )
}

interface TeaserConfig {
  bgImage: string
  name: string
  skill: string
  date: string
  venue: string
  format: string
  price: string
}

const TEASER_CONFIGS: TeaserConfig[] = [
  {
    bgImage: '/padel-court-home.jpg',
    name: 'Spring Padel Classic',
    skill: '3.5 - 4.0 (B1)',
    date: 'יום שבת, 15 באוגוסט',
    venue: 'מועדון בקרוב',
    format: 'זוגות',
    price: '₪750',
  },
  {
    bgImage: '/padel-community-bw.jpg',
    name: 'Premier League Cup',
    skill: '2.0 - 2.5 (C3)',
    date: 'יום א׳, 23 באוגוסט',
    venue: 'מועדון בקרוב',
    format: 'זוגות',
    price: '₪450',
  },
]

function TournamentCardTeaser({
  bgImage,
  name,
  skill,
  date,
  venue,
  format,
  price,
}: TeaserConfig) {
  const { t } = useTranslation()
  return (
    <div
      aria-hidden
      className="relative rounded-[20px] bg-rally-surface border border-rally-border overflow-hidden select-none"
    >
      <div className="relative aspect-video bg-rally-surface-2">
        <img
          src={bgImage}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-rally-surface/80 via-transparent to-rally-bg/30" />
      </div>
      <div className="p-4" style={{ filter: 'blur(5px)' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-extrabold text-lg text-rally-text/85 line-clamp-2 flex-1 leading-tight">
            {name}
          </h3>
          <span
            dir="ltr"
            className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-md bg-rally-surface-2 border border-rally-accent/40 text-rally-accent text-xs font-black tracking-wider"
          >
            {skill}
          </span>
        </div>
        <p className="text-sm text-rally-text-2 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{date}</span>
        </p>
        <p className="mt-1 text-sm text-rally-text-2 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="line-clamp-1">{venue}</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-rally-surface-2 px-2.5 py-1 text-xs text-rally-text-2">
            {format}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">
              {t('tournament.tournamentsEntryFee')}
            </p>
            <p className="text-2xl font-black text-rally-accent/80">{price}</p>
          </div>
          <span className="inline-flex items-center justify-center min-w-[120px] h-10 rounded-full bg-rally-accent/70 text-rally-accent-text font-bold">
            ·····
          </span>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rally-accent text-rally-accent-text font-bold shadow-glow-electric">
          <Lock className="w-4 h-4" />
          <span>{t('tournament.tournamentsComingSoon')}</span>
        </div>
      </div>
    </div>
  )
}
