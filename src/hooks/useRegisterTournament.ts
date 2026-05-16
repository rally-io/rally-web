import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registerTournament } from '@/services/api/profile'
import type { RegisterPayload } from '@/types/api'
import { useAppSession } from '@/hooks/useAppSession'

interface Variables {
  tournamentId: string
  data: RegisterPayload
}

export function useRegisterTournament() {
  const queryClient = useQueryClient()
  const { ensurePlayerProfile } = useAppSession()
  return useMutation({
    mutationFn: async ({ tournamentId, data }: Variables) => {
      await ensurePlayerProfile()
      const res = await registerTournament(tournamentId, data)
      if (!res.success) throw res.error
      return res.data
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
      queryClient.invalidateQueries({ queryKey: ['tournament', vars.tournamentId] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] })
    },
  })
}
