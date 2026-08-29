import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { useClub } from '@/hooks/useClub'
import { useClubTournaments } from '@/hooks/useClubTournaments'
import { useClubEvents } from '@/hooks/useClubEvents'
import { ClubGalleryHero } from '@/components/clubs/ClubGalleryHero'
import { ClubSectionHeader } from '@/components/clubs/ClubSectionHeader'
import { ClubInfoCard } from '@/components/clubs/ClubInfoCard'
import { EventCard } from '@/components/clubs/EventCard'
import { TournamentCard } from '@/components/tournaments/TournamentCard'
import { AppDownloadModal } from '@/components/app-download/AppDownloadModal'
import { Skeleton } from '@/components/ui/skeleton'
import { tryOpenInApp } from '@/lib/appLinks'
import { ScreenMessageList } from '@/features/screenMessages/components/ScreenMessageList'
import { ScreenMessageModalHost } from '@/features/screenMessages/components/ScreenMessageModalHost'

const EVENTS_ON_PAGE = 3
const TOURNAMENTS_ON_PAGE = 2

export default function ClubDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const clubId = id!
  const [appModal, setAppModal] = useState(false)

  const { data: club, isLoading, isError } = useClub(clubId)
  const { data: tPages, isLoading: tournamentsLoading } = useClubTournaments(clubId)
  const { data: events, isLoading: eventsLoading } = useClubEvents(clubId)

  const tournaments = useMemo(
    () => tPages?.pages.flatMap((p) => (p && 'items' in p ? p.items : [])) ?? [],
    [tPages],
  )
  const shownEvents = (events ?? []).slice(0, EVENTS_ON_PAGE)
  const showActivitiesEmpty =
    !tournamentsLoading && !eventsLoading && tournaments.length === 0 && shownEvents.length === 0

  const images = useMemo(() => {
    if (club?.images?.length) return club.images
    if (club?.image_url) return [club.image_url]
    return []
  }, [club])

  useEffect(() => {
    if (club) document.title = `${club.name} · Rally`
  }, [club])

  const openApp = () => {
    if (!tryOpenInApp(`/clubs/${clubId}`)) setAppModal(true)
  }

  if (isLoading) {
    return (
      <div className="pt-24">
        <button
          onClick={() => navigate('/clubs')}
          aria-label={t('clubs.back')}
          className="fixed top-24 start-4 z-20 w-[42px] h-[42px] rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </button>
        <Skeleton className="h-[320px] md:h-[460px]" />
        <div className="container mx-auto px-4 max-w-5xl mt-8 space-y-6">
          <Skeleton className="h-24 rounded-2xl bg-rally-surface" />
          <Skeleton className="h-64 rounded-2xl bg-rally-surface" />
        </div>
      </div>
    )
  }

  if (isError || !club) {
    return (
      <div className="pt-32 container mx-auto px-4 text-center">
        <p className="text-rally-text-2 mb-4">{t('clubs.not_found')}</p>
        <button onClick={() => navigate('/clubs')} className="text-rally-accent font-semibold">
          {t('clubs.back')}
        </button>
      </div>
    )
  }

  const amenityChips = [
    t('clubs.priceFrom', { price: club.starts_from }),
    ...club.court_types,
    ...club.amenities,
  ]

  return (
    <main className="min-h-screen bg-rally-bg pb-28 lg:pb-16">
      <button
        onClick={() => navigate('/clubs')}
        aria-label={t('clubs.back')}
        className="fixed top-24 start-4 z-20 w-[42px] h-[42px] rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
      >
        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
      </button>

      <ClubGalleryHero
        images={images}
        name={club.name}
        city={club.city}
        addressLine1={club.address_line1}
        thumbUrl={club.thumb_url}
      />

      <ScreenMessageList
        query={{ scope: 'club', id: clubId }}
        className="container mx-auto px-4 max-w-5xl mt-6"
      />
      <ScreenMessageModalHost query={{ scope: 'club', id: clubId }} />

      <div className="container mx-auto px-4 max-w-5xl mt-6 lg:mt-10">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8">
          <div className="flex-1 min-w-0 space-y-10">
            {amenityChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {amenityChips.map((c, i) => (
                  <span
                    key={`${c}-${i}`}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      i === 0
                        ? 'bg-rally-accent-dim text-rally-accent'
                        : 'bg-rally-surface-2 text-rally-text-2 border border-rally-border'
                    }`}
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            {club.description && (
              <section>
                <h2 className="font-display text-2xl font-bold text-rally-text mb-3">
                  {t('clubs.aboutTitle')}
                </h2>
                <p className="text-rally-text-2 leading-relaxed whitespace-pre-line">
                  {club.description}
                </p>
              </section>
            )}

            {tournaments.length > 0 && (
              <section>
                <ClubSectionHeader
                  title={t('clubs.sectionTournaments')}
                  seeAllTo={`/clubs/${clubId}/tournaments`}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  {tournaments.slice(0, TOURNAMENTS_ON_PAGE).map((tr) => (
                    <TournamentCard key={tr.id} tournament={tr} />
                  ))}
                </div>
              </section>
            )}

            {shownEvents.length > 0 && (
              <section>
                <ClubSectionHeader
                  title={t('clubs.sectionEvents')}
                  seeAllTo={`/clubs/${clubId}/events`}
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {shownEvents.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              </section>
            )}

            {showActivitiesEmpty && (
              <section className="rounded-2xl bg-rally-surface border border-rally-border px-6 py-12 text-center">
                <CalendarDays className="w-10 h-10 mx-auto text-rally-text-muted" aria-hidden />
                <h2 className="mt-4 font-display text-xl font-bold text-rally-text">
                  {t('clubs.noActivitiesTitle')}
                </h2>
                <p className="mt-2 text-rally-text-2 max-w-md mx-auto">
                  {t('clubs.noActivitiesBody')}
                </p>
                <button
                  onClick={openApp}
                  className="mt-6 h-11 px-6 rounded-full bg-rally-accent text-rally-accent-text font-bold hover:bg-rally-accent-hover transition-colors"
                >
                  {t('clubs.openInApp')}
                </button>
              </section>
            )}

            <div className="lg:hidden">
              <ClubInfoCard club={club} />
            </div>
          </div>

          <aside className="hidden lg:block w-80 shrink-0 lg:sticky lg:top-28">
            <ClubInfoCard club={club} onOpenApp={openApp} />
          </aside>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-rally-bg/95 backdrop-blur border-t border-rally-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <span className="font-bold text-rally-text truncate">{club.name}</span>
          <button
            onClick={openApp}
            className="shrink-0 h-11 px-6 rounded-full bg-rally-accent text-rally-accent-text font-bold hover:bg-rally-accent-hover transition-colors"
          >
            {t('clubs.openInApp')}
          </button>
        </div>
      </div>

      <AppDownloadModal
        open={appModal}
        variant="book"
        deepLinkPath={`/clubs/${clubId}`}
        onOpenChange={setAppModal}
      />
    </main>
  )
}
