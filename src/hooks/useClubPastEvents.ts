import { useQuery } from '@tanstack/react-query'
import { getEvents } from '@/services/api/events'
import type { ClubEvent } from '@/types/api'

export function useClubPastEvents(clubId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['clubPastEvents', clubId],
    queryFn: async (): Promise<ClubEvent[]> => {
      const result = await getEvents({
        club_id: clubId,
        date_to: new Date().toISOString(),
      })
      if (!result.success) return []
      return result.data.items ?? []
    },
    enabled: !!clubId && enabled,
  })
}
