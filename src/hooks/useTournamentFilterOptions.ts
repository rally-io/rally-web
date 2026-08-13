import { useQuery } from '@tanstack/react-query'
import { getTournamentFilterOptions } from '@/services/api/tournaments'

export function useTournamentFilterOptions(enabled = true, search = '') {
  return useQuery({
    // search is part of the key: a new term must refetch, never serve the
    // previous term's counts out of the 60s staleTime cache.
    queryKey: ['tournament-filter-options', search],
    queryFn: async () => {
      const result = await getTournamentFilterOptions(search)
      return result.success ? result.data.clubs : []
    },
    enabled,
    staleTime: 60_000,
  })
}
