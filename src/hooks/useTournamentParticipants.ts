import { useQuery } from '@tanstack/react-query'
import { getTournamentParticipants } from '@/services/api/tournaments'
import type { TournamentParticipants } from '@/types/api'

export function useTournamentParticipants(tournamentId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['tournament-participants', tournamentId],
    queryFn: async (): Promise<TournamentParticipants | null> => {
      try {
        const result = await getTournamentParticipants(tournamentId)
        if (!result.success) return null
        return result.data
      } catch {
        // 404 from an API that predates the endpoint, or any transient
        // failure ⇒ null ⇒ the section hides. Never an error render.
        return null
      }
    },
    // `enabled` lets callers withhold the request entirely (e.g. signed-out
    // visitors — the endpoint requires auth and would just 401).
    enabled: enabled && !!tournamentId,
    retry: false,
  })
}
