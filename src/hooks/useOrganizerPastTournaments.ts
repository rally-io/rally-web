import { useInfiniteQuery } from '@tanstack/react-query'
import { getTournaments } from '@/services/api/tournaments'

const PAGE_SIZE = 12

export function useOrganizerPastTournaments(organizerSlug: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['organizerPastTournaments', organizerSlug],
    queryFn: async ({ pageParam }) => {
      const result = await getTournaments({
        type: 'upcoming',
        scope: 'past',
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
    enabled: !!organizerSlug && enabled,
  })
}
