// src/hooks/useClubs.ts
import { useInfiniteQuery } from '@tanstack/react-query'
import { getClubs } from '@/services/api/clubs'
import type { Club } from '@/types/api'

interface ClubsPage {
  items: Club[]
  next_cursor: string | null
}

export function useClubs(filters: Record<string, any> = {}) {
  return useInfiniteQuery({
    queryKey: ['clubs', filters],
    queryFn: async ({ pageParam }): Promise<ClubsPage> => {
      const result = await getClubs({ ...filters, cursor: pageParam })
      if (!result.success) return { items: [], next_cursor: null }
      return {
        items: result.data ?? [],
        next_cursor: result.meta?.next_cursor ?? null,
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  })
}
