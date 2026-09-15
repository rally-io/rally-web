import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { fetchPublicPlayerSeason } from '../api/publicLeague';
import type { LeagueResult, PublicPlayerSeason } from '../types';

export type UsePlayerSeasonResult = {
  player: PublicPlayerSeason | null;
  results: LeagueResult[];
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

  const quarters = player?.quarters ?? [];

  const results = (quarters.length > 0 ? quarters.flatMap(q => q.results) : [...(player?.results ?? [])])
    .sort((a, b) => (Date.parse(b.awarded_at ?? '') || 0) - (Date.parse(a.awarded_at ?? '') || 0)
      || a.tournament_id.localeCompare(b.tournament_id));
  const resultsInWindow = results.filter(result => result.counted).length;

  return {
    player,
    results,
    resultsInWindow,
    // `isLoading`, not `isPending`: with no player id the query is disabled and stays
    // pending forever, which must not render as a permanent skeleton.
    isLoading: query.isLoading,
    // A 404 is an answer, so it is not also reported as an error.
    error: isNotFound ? null : query.error,
    isNotFound,
  };
}
