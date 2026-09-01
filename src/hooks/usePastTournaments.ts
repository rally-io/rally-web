import { useInfiniteQuery } from '@tanstack/react-query'
import { getTournaments, type TournamentListParams } from '@/services/api/tournaments'

const PAGE_SIZE = 12

/** Everything the past listing can be narrowed by server-side. */
export type PastTournamentsParams = Pick<
  TournamentListParams,
  'club_id' | 'club_ids' | 'manager_slug' | 'manager_slugs' | 'search'
>

/**
 * The finished-tournaments listing, one implementation for every surface that
 * shows history: a club's archive, an organizer's archive, and the history tab
 * on /tournaments.
 *
 * Note the listing still includes tournaments that are under way (the client
 * sends `include_live: true`), so callers that mean "already over" must also
 * drop rows whose `end_date` is in the future — see `isPastTournament`.
 */
export function usePastTournaments(params: PastTournamentsParams, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['pastTournaments', params],
    queryFn: async ({ pageParam }) => {
      const result = await getTournaments({
        type: 'upcoming',
        scope: 'past',
        limit: PAGE_SIZE,
        cursor: pageParam,
        ...params,
      })
      if (!result.success) return { items: [], next_cursor: null }
      return result.data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage && 'next_cursor' in lastPage ? lastPage.next_cursor ?? undefined : undefined,
    enabled,
  })
}
