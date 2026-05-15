// src/hooks/useRegisterTournament.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registerTournament } from '@/services/api/profile'
import type { TournamentRegistrationRequest } from '@/types/api'

interface Variables {
  tournamentId: string
  data: TournamentRegistrationRequest
}

export function useRegisterTournament() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tournamentId, data }: Variables) => registerTournament(tournamentId, data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
      queryClient.invalidateQueries({ queryKey: ['tournament', vars.tournamentId] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] })
    },
  })
}
