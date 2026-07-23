import { useInfiniteQuery } from '@tanstack/react-query'
import { getTournaments } from '@/services/api/tournaments'

const CLUB_TOURNAMENTS_PAGE_SIZE = 12

export function useClubTournaments(clubId: string) {
  return useInfiniteQuery({
    queryKey: ['clubTournaments', clubId],
    queryFn: async ({ pageParam }) => {
      const result = await getTournaments({
        type: 'upcoming',
        club_id: clubId,
        limit: CLUB_TOURNAMENTS_PAGE_SIZE,
        cursor: pageParam,
      })
      if (!result.success) return { items: [], next_cursor: null }
      return result.data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage && 'next_cursor' in lastPage ? lastPage.next_cursor ?? undefined : undefined,
    enabled: !!clubId,
  })
}
