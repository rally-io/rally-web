// src/hooks/useTournaments.ts
import { useInfiniteQuery } from '@tanstack/react-query'
import { getTournaments } from '@/services/api/tournaments'

export function useTournaments(filters: Record<string, any> = {}) {
  return useInfiniteQuery({
    queryKey: ['tournaments', filters],
    queryFn: async ({ pageParam }) => {
      const result = await getTournaments({ ...filters, cursor: pageParam })
      if (!result.success) return null
      return result.data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage && 'next_cursor' in lastPage ? lastPage.next_cursor ?? undefined : undefined),
  })
}