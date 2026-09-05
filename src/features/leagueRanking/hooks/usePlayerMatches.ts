import { useQuery } from '@tanstack/react-query';
import { fetchPublicPlayerMatches } from '../api/publicLeague';
import type { PublicPlayerMatch } from '../types';

export type UsePlayerMatchesResult = {
  matches: PublicPlayerMatch[];
  isLoading: boolean;
  error: Error | null;
};

/**
 * The matches behind one collapsible tournament row.
 *
 * `enabled` is the collapse contract: the query does not exist until the row
 * is first expanded, so a profile with ten tournaments costs one request, not
 * eleven. Once fetched it stays cached — collapsing and re-expanding a row
 * must not refetch.
 *
 * An error here is scoped to the one expanded row (an inline message inside
 * it), never to the page: the season data around it is already on screen and
 * still true.
 */
export function usePlayerMatches(
  playerId: string | undefined,
  tournamentId: string,
  enabled: boolean,
): UsePlayerMatchesResult {
  const query = useQuery({
    queryKey: ['public-league-player-matches', playerId ?? null, tournamentId],
    queryFn: () => fetchPublicPlayerMatches(playerId ?? '', tournamentId),
    enabled: enabled && Boolean(playerId),
    retry: false,
    staleTime: 60_000,
  });

  return {
    matches: query.data?.matches ?? [],
    // `isLoading`, not `isPending`: while disabled the query is pending
    // forever, and a collapsed row must not look like it is loading.
    isLoading: query.isLoading && enabled,
    error: query.error,
  };
}
