import { useInfiniteQuery } from '@tanstack/react-query'
import { getTournaments } from '@/services/api/tournaments'

const PAGE_SIZE = 12

export function useOrganizerTournaments(organizerSlug: string) {
  return useInfiniteQuery({
    queryKey: ['organizerTournaments', organizerSlug],
    queryFn: async ({ pageParam }) => {
      const result = await getTournaments({
        type: 'upcoming',
        manager_slug: organizerSlug,
        limit: PAGE_SIZE,
        cursor: pageParam,
      })
      if (!result.success) return { items: [], next_cursor: null }
      return result.data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage && 'next_cursor' in lastPage ? lastPage.next_cursor ?? undefined : undefined,
    enabled: !!organizerSlug,
  })
}
