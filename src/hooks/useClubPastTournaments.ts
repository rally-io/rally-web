import { useInfiniteQuery } from '@tanstack/react-query'
import { getTournaments } from '@/services/api/tournaments'

const PAGE_SIZE = 12

export function useClubPastTournaments(clubId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['clubPastTournaments', clubId],
    queryFn: async ({ pageParam }) => {
      const result = await getTournaments({
        type: 'upcoming',
        scope: 'past',
        club_id: clubId,
        limit: PAGE_SIZE,
        cursor: pageParam,
      })
      if (!result.success) return { items: [], next_cursor: null }
      return result.data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage && 'next_cursor' in lastPage ? lastPage.next_cursor ?? undefined : undefined,
    enabled: !!clubId && enabled,
  })
}
