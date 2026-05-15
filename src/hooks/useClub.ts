// src/hooks/useClub.ts
import { useQuery } from '@tanstack/react-query'
import { getClub } from '@/services/api/clubs'
import type { Club } from '@/types/api'

export function useClub(clubId: string, params: Record<string, any> = {}) {
  return useQuery({
    queryKey: ['club', clubId, params],
    queryFn: async (): Promise<Club | null> => {
      const result = await getClub(clubId, params)
      if (!result.success) return null
      return result.data
    },
    enabled: !!clubId,
  })
}