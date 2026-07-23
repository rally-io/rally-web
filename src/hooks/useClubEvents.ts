import { useQuery } from '@tanstack/react-query'
import { getEvents } from '@/services/api/events'
import type { ClubEvent } from '@/types/api'

export function useClubEvents(clubId: string) {
  return useQuery({
    queryKey: ['clubEvents', clubId],
    queryFn: async (): Promise<ClubEvent[]> => {
      const result = await getEvents({
        club_id: clubId,
        date_from: new Date().toISOString(),
      })
      if (!result.success) return []
      return result.data.items ?? []
    },
    enabled: !!clubId,
  })
}
