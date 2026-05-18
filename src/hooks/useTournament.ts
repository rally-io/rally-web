import { useQuery } from '@tanstack/react-query'
import { getTournament } from '@/services/api/tournaments'
import type { TournamentDetail } from '@/types/api'

export function useTournament(tournamentId: string) {
  return useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: async (): Promise<TournamentDetail | null> => {
      const result = await getTournament(tournamentId)
      if (!result.success) return null
      return result.data
    },
    enabled: !!tournamentId,
  })
}
