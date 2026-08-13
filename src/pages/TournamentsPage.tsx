import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Search, Lock, Calendar, MapPin } from 'lucide-react'
import { useTournaments } from '@/hooks/useTournaments'
import { useAppSession } from '@/hooks/useAppSession'
import { ClubFilterDropdown } from '@/components/tournaments/ClubFilterDropdown'
import { SortToggle } from '@/components/tournaments/SortToggle'
import { TournamentCard } from '@/components/tournaments/TournamentCard'
import {
  TournamentUpdatesModal,
  TournamentUpdatesTrigger,
} from '@/components/tournaments/TournamentUpdatesModal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isTournamentLive } from '@/lib/tournamentHelpers'
import type { Tournament } from '@/types/api'

type TournamentsTab = 'upcoming' | 'my'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function TournamentsPage() {
  const { t } = useTranslation()
  const { status } = useAppSession()
  const signedOut = status === 'signed_out'
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: TournamentsTab =
    !signedOut && searchParams.get('tab') === 'my' ? 'my' : 'upcoming'
  const setTab = (key: TournamentsTab) => {
    const next = new URLSearchParams(searchParams)
    if (key === 'upcoming') next.delete('tab')
    else next.set('tab', key)
    setSearchParams(next, { replace: true })
  }
  const sort: 'soonest' | 'latest' =
    searchParams.get('sort') === 'latest' ? 'latest' : 'soonest' // unknown → default
  const clubIds = useMemo(() => {
    // Only pass UUID-shaped ids to the API — a stale/mistyped `?clubs=` value
    // (hand-edited, or a club whose last tournament ended) must degrade to
    // "no filter" rather than 422 the whole page (spec §6). Dedupe + sort so
    // `?clubs=A,B` and `?clubs=B,A` are one canonical filter, not two.
    const ids = (searchParams.get('clubs') ?? '')
      .split(',')
      .filter((id) => UUID_RE.test(id))
    return Array.from(new Set(ids)).sort()
  }, [searchParams])

  const setSort = (next: 'soonest' | 'latest') => {
    const params = new URLSearchParams(searchParams)
    if (next === 'soonest') params.delete('sort') // bare URL = enforced default
    else params.set('sort', next)
    setSearchParams(params, { replace: true })
  }
  const setClubIds = (ids: string[]) => {
    const params = new URLSearchParams(searchParams)
    // Canonicalize on write too: applying the same selection in a different
    // toggle order must produce the same URL, not fork the query key.
    const canonical = Array.from(new Set(ids)).sort()
    if (canonical.length === 0) params.delete('clubs')
    else params.set('clubs', canonical.join(','))
    setSearchParams(params, { replace: true })
  }
  const clearFilters = () => {
    // One params object, not sequential setClubIds()+setSort() calls — both
    // would build off the same (stale, pre-update) `searchParams` closure in
    // this handler and the second call would clobber the first.
    const params = new URLSearchParams(searchParams)
    params.delete('clubs')
    params.delete('sort')
    setSearchParams(params, { replace: true })
  }
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const h = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(h)
  }, [search])
  const filters = useMemo(
    () => ({
      type: tab,
      ...(debounced ? { search: debounced.slice(0, 100) } : {}),
      ...(tab === 'upcoming' && clubIds.length ? { club_ids: clubIds } : {}),
      ...(tab === 'upcoming' && sort === 'latest' ? { sort } : {}),
    }),
    [tab, debounced, clubIds, sort],
  )

  const enabled = !(tab === 'my' && signedOut)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useTournaments(enabled ? filters : { type: 'upcoming' })

  const loaded: Tournament[] =
    enabled ? data?.pages.flatMap((p) => p?.items ?? []) ?? [] : []
  // Anything being played right now goes first: a player checking the site
  // mid-tournament is looking for the scoreboard, not next month's draw.
  // Under sort=soonest (the default) this is nearly a no-op — in-progress
  // tournaments already sort first server-side. Under sort=latest they sort
  // LAST server-side, so this bubbling is load-bearing: a live tournament
  // that "load more" pulls in on page 3 still jumps straight to position 0
  // here — "load more" can reorder the visible list, not just append to it.
  const tournaments: Tournament[] = [
    ...loaded.filter(isTournamentLive),
    ...loaded.filter((tr) => !isTournamentLive(tr)),
  ]

  const [updatesOpen, setUpdatesOpen] = useState(false)

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
          {t('tournament.tournamentsHeroSubtitle')}
        </p>

        {!signedOut && (
          <div className="flex gap-3 mb-8">
            {(['upcoming', 'my'] as const).map((key) => (
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
                  : t('tournament.tournamentsMyTab')}
              </button>
            ))}
          </div>
        )}

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

        {tab === 'upcoming' && (
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <ClubFilterDropdown selected={clubIds} onApply={setClubIds} />
            <SortToggle value={sort} onChange={setSort} />
          </div>
        )}

        {isError ? (
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
                  {t('tournament.tournamentsEmptyTitle')}
                </p>
                <p className="text-rally-text-2 mt-1 mb-5">
                  {t('tournament.tournamentsEmptyMessage')}
                </p>
                <TournamentUpdatesTrigger onClick={() => setUpdatesOpen(true)} />
              </div>
              {clubIds.length > 0 && (
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
                <TournamentCard key={tr.id} tournament={tr} tab={tab} />
              ))}
              {tab === 'upcoming' &&
                TEASER_CONFIGS.map((cfg, i) => (
                  <TournamentCardTeaser key={`teaser-${i}`} {...cfg} />
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
