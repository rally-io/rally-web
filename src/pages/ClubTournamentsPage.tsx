import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClub } from '@/hooks/useClub'
import { useClubTournaments } from '@/hooks/useClubTournaments'
import { useClubPastTournaments } from '@/hooks/useClubPastTournaments'
import { TournamentCard } from '@/components/tournaments/TournamentCard'
import { isPastTournament } from '@/lib/tournamentHelpers'
import { useAutoDrainPages } from '@/hooks/useAutoDrainPages'
import { ClubArchiveShell } from '@/components/clubs/ClubArchiveShell'
import { useArchiveStatus } from '@/components/clubs/ArchiveFilterChips'
import type { Tournament } from '@/types/api'

const getStartDate = (t: Tournament) => t.start_date

export default function ClubTournamentsPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const clubId = id!

  const { data: club } = useClub(clubId)
  const [status] = useArchiveStatus()

  const upcoming = useClubTournaments(clubId)
  const past = useClubPastTournaments(clubId, status !== 'open')

  // The month view sorts the open list client-side, so it needs every page.
  // A club's open list is small; chain-fetch the remainder up front.
  // The upcoming feed is grouped by month on the client, so a single page
  // would render a partial "March".
  useAutoDrainPages(upcoming)

  // Belt-and-braces date partition: the open list can contain tournaments that
  // already ended (registration_open but never flipped to completed), and an
  // API without scope support echoes the open list back for the past query —
  // both would render in the wrong section without this.
  const upcomingItems = useMemo(
    () =>
      (upcoming.data?.pages.flatMap((p) => (p && 'items' in p ? p.items : [])) ?? []).filter(
        (tr) => !isPastTournament(tr),
      ),
    [upcoming.data],
  )
  const pastItems = useMemo(
    () =>
      (past.data?.pages.flatMap((p) => (p && 'items' in p ? p.items : [])) ?? []).filter(
        isPastTournament,
      ),
    [past.data],
  )

  useEffect(() => {
    document.title = [club?.name, t('clubs.allTournamentsTitle'), 'Rally']
      .filter(Boolean)
      .join(' · ')
  }, [club, t])

  return (
    <ClubArchiveShell
      clubId={clubId}
      clubName={club?.name}
      title={t('clubs.allTournamentsTitle')}
      upcoming={{ items: upcomingItems, isLoading: upcoming.isLoading }}
      past={{
        items: pastItems,
        isLoading: past.isLoading,
        hasNextPage: past.hasNextPage,
        isFetchingNextPage: past.isFetchingNextPage,
        onLoadMore: () => past.fetchNextPage(),
      }}
      getDate={getStartDate}
      renderItem={(tr, isPast) => (
        <TournamentCard key={tr.id} tournament={tr} variant={isPast ? 'past' : 'default'} />
      )}
      countLabel={(count) => t('clubs.monthTournaments', { count })}
      emptyLabel={t('clubs.noTournamentsFiltered')}
    />
  )
}
