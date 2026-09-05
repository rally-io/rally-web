import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { fetchPublicPlayerSeason } from '../api/publicLeague';
import type { LeagueQuarterBlock, PublicPlayerSeason } from '../types';

export type UsePlayerSeasonResult = {
  player: PublicPlayerSeason | null;
  /** The window's quarters, NEWEST first — the order the page reads them. */
  quarters: LeagueQuarterBlock[];
  resultsInWindow: number;
  isLoading: boolean;
  error: Error | null;
  /** The player, or their season, does not exist. A 404, not a failure to load. */
  isNotFound: boolean;
};

/**
 * One player's season, for the shareable player page.
 *
 * `isNotFound` is separated from `error` because they are different answers and
 * deserve different words on screen: "no such player" is a complete, correct
 * response, while "we could not load this" means the site failed. Telling a visitor
 * a player does not exist because the network hiccuped is a lie the page can avoid.
 *
 * Every result in the window counts — there is no drop any more. The page groups
 * results by quarter instead, so a player can see each result's expiry: which
 * quarter it belongs to and the last day that quarter still counts.
 */
export function usePlayerSeason(
  playerId: string | undefined,
  seasonId?: string,
): UsePlayerSeasonResult {
  const query = useQuery({
    queryKey: ['public-league-player', playerId ?? null, seasonId ?? null],
    queryFn: () => fetchPublicPlayerSeason(playerId ?? '', seasonId),
    enabled: Boolean(playerId),
    retry: false,
  });

  const status = isAxiosError(query.error) ? query.error.response?.status : undefined;
  const isNotFound = query.isError && status === 404;

  const player = query.data ?? null;

  // Sorted by key ("YYYY-Qn" sorts chronologically) then reversed: newest first.
  const quarters = [...(player?.quarters ?? [])]
    .sort((a, b) => a.key.localeCompare(b.key))
    .reverse();

  // Counted from the quarters whenever there are any, because the quarters are
  // what the page actually renders. `quarters` is `.catch([])`, so a malformed
  // block degrades to nothing on screen — and taking the header's count from
  // `results` instead would print "7 results in the window" directly above
  // "No results in the window yet". The header can now only say what the body
  // shows; `results` stays the fallback for an API that sends no quarters at all.
  const resultsInWindow =
    quarters.length > 0
      ? quarters.reduce((sum, q) => sum + q.results.length, 0)
      : (player?.results.length ?? 0);

  return {
    player,
    quarters,
    resultsInWindow,
    // `isLoading`, not `isPending`: with no player id the query is disabled and stays
    // pending forever, which must not render as a permanent skeleton.
    isLoading: query.isLoading,
    // A 404 is an answer, so it is not also reported as an error.
    error: isNotFound ? null : query.error,
    isNotFound,
  };
}
