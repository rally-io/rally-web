import { useQuery } from '@tanstack/react-query'
import { getTournament } from '@/services/api/tournaments'
import { withMockFallback } from '@/components/tournaments/mockFallback'
import type { TournamentDetail } from '@/types/api'

export function useTournament(tournamentId: string) {
  return useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: async (): Promise<TournamentDetail | null> => {
      const result = await getTournament(tournamentId)
      if (!result.success) return null
      return withMockFallback(result.data)
    },
    enabled: !!tournamentId,
  })
}
