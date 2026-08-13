import { useQuery } from '@tanstack/react-query'
import { getTournamentFilterOptions } from '@/services/api/tournaments'

export function useTournamentFilterOptions(enabled = true) {
  return useQuery({
    queryKey: ['tournament-filter-options'],
    queryFn: async () => {
      const result = await getTournamentFilterOptions()
      return result.success ? result.data.clubs : []
    },
    enabled,
    staleTime: 60_000,
  })
}
