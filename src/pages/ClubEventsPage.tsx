import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClub } from '@/hooks/useClub'
import { useClubEvents } from '@/hooks/useClubEvents'
import { useClubPastEvents } from '@/hooks/useClubPastEvents'
import { EventCard } from '@/components/clubs/EventCard'
import { ClubArchiveShell } from '@/components/clubs/ClubArchiveShell'
import { useArchiveStatus } from '@/components/clubs/ArchiveFilterChips'
import type { ClubEvent } from '@/types/api'

const getStartAt = (e: ClubEvent) => e.start_at

export default function ClubEventsPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const clubId = id!

  const { data: club } = useClub(clubId)
  const [status] = useArchiveStatus()

  const upcoming = useClubEvents(clubId)
  const past = useClubPastEvents(clubId, status !== 'open')

  // The server partitions on start_at, so an in-progress event (started, not
  // yet ended) arrives in the past list and would render as "Ended" mid-class.
  // Re-partition on end_at: still-running events render as happening-now.
  const { upcomingItems, pastItems } = useMemo(() => {
    const byId = new Map<string, ClubEvent>()
    for (const e of [...(upcoming.data ?? []), ...(past.data ?? [])]) byId.set(e.id, e)
    const up: ClubEvent[] = []
    const done: ClubEvent[] = []
    for (const e of byId.values()) {
      if (new Date(e.end_at).getTime() < Date.now()) done.push(e)
      else up.push(e)
    }
    return { upcomingItems: up, pastItems: done }
  }, [upcoming.data, past.data])

  useEffect(() => {
    document.title = [club?.name, t('clubs.allEventsTitle'), 'Rally']
      .filter(Boolean)
      .join(' · ')
  }, [club, t])

  return (
    <ClubArchiveShell
      clubId={clubId}
      clubName={club?.name}
      title={t('clubs.allEventsTitle')}
      upcoming={{ items: upcomingItems, isLoading: upcoming.isLoading }}
      past={{ items: pastItems, isLoading: past.isLoading }}
      getDate={getStartAt}
      renderItem={(e, isPast) => (
        <EventCard key={e.id} event={e} variant={isPast ? 'past' : 'default'} />
      )}
      countLabel={(count) => t('clubs.monthEvents', { count })}
      emptyLabel={t('clubs.noEventsFiltered')}
    />
  )
}
