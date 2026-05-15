// src/hooks/useClubs.ts
import { useInfiniteQuery } from '@tanstack/react-query'
import { getClubs } from '@/services/api/clubs'

export function useClubs(filters: Record<string, any> = {}) {
  return useInfiniteQuery({
    queryKey: ['clubs', filters],
    queryFn: async ({ pageParam }) => {
      const result = await getClubs({ ...filters, cursor: pageParam })
      if (!result.success) return null
      return result.data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage && 'next_cursor' in lastPage ? lastPage.next_cursor ?? undefined : undefined),
  })
}