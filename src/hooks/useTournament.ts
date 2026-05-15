// src/hooks/useTournament.ts
import { useQuery } from '@tanstack/react-query'
import { getTournament } from '@/services/api/tournaments'
import type { Tournament } from '@/types/api'

export function useTournament(tournamentId: string) {
  return useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: async (): Promise<Tournament | null> => {
      const result = await getTournament(tournamentId)
      if (!result.success) return null
      return result.data
    },
    enabled: !!tournamentId,
  })
}