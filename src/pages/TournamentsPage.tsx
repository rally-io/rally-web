import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Search, Lock, Calendar, MapPin } from 'lucide-react'
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
        <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight text-rally-text mb-4">
          {t('tournament.tabTournaments')}
        </h1>
        <p className="text-lg md:text-xl text-rally-text-2 max-w-2xl mb-10 leading-relaxed">
          {t('tournament.tournamentsHeroSubtitle')}
        </p>

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

        {isError ? (
          <div className="text-center py-16">
            <p className="text-rally-text-2 mb-4">
              {t('tournament.tournamentsLoadErrorTitle')}
            </p>
          </div>
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
            <div className="text-center py-16">
              <p className="text-rally-text font-semibold">
                {t('tournament.tournamentsEmptyTitle')}
              </p>
              <p className="text-rally-text-2 mt-1">
                {t('tournament.tournamentsEmptyMessage')}
              </p>
            </div>
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
          </>
        )}
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
    bgImage:
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1200&q=80',
    name: 'Spring Padel Classic',
    skill: '3.5 - 4.0 (B1)',
    date: 'יום שבת, 15 ביוני',
    venue: 'מועדון בקרוב',
    format: 'זוגות',
    price: '₪750',
  },
  {
    bgImage:
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80',
    name: 'Premier League Cup',
    skill: '2.0 - 2.5 (C3)',
    date: 'יום א׳, 22 ביוני',
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
