import { useQuery } from '@tanstack/react-query'
import { getTournamentFilterOptions } from '@/services/api/tournaments'
import type {
  TournamentFilterClub,
  TournamentFilterOrganizer,
} from '@/services/api/tournaments'

const EMPTY = {
  clubs: [] as TournamentFilterClub[],
  organizers: [] as TournamentFilterOrganizer[],
}

/**
 * Clubs and organizers that currently have listable tournaments, with counts.
 *
 * Both lists are defaulted: `organizers` is absent on API builds predating the
 * organizer filter, and a caller that destructures it must never get
 * `undefined`. Note the two counts are scoped differently server-side — club
 * counts cover the open scope only, organizer counts include past tournaments
 * — so don't label organizer counts as "upcoming".
 */
export function useTournamentFilterOptions(enabled = true, search = '') {
  return useQuery({
    queryKey: ['tournament-filter-options', search],
    queryFn: async () => {
      const result = await getTournamentFilterOptions(search)
      if (!result.success) return EMPTY
      return {
        clubs: result.data.clubs ?? [],
        organizers: result.data.organizers ?? [],
      }
    },
    enabled,
    staleTime: 60_000,
  })
}
