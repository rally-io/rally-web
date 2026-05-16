import { useQuery } from '@tanstack/react-query'
import { getRegistration } from '@/services/api/tournaments'
import type { RegistrationDetail } from '@/types/api'

export function useRegistration(tournamentId: string, registrationId: string) {
  return useQuery({
    queryKey: ['registration', tournamentId, registrationId],
    queryFn: async (): Promise<RegistrationDetail | null> => {
      const result = await getRegistration(tournamentId, registrationId)
      if (!result.success) return null
      return result.data
    },
    enabled: !!tournamentId && !!registrationId,
  })
}
