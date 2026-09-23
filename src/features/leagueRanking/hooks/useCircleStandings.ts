import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchMyStandings } from '../api/myLeague';
import type { BandCode } from '../types';
import { nextStandingsOffset, type UsePublicStandingsResult } from './usePublicStandings';

export type UseCircleStandingsParams = {
  seasonId?: string;
  band?: BandCode;
  limit?: number;
  /** The INITIAL offset; further pages are driven by the accumulated row count. */
  offset?: number;
  /** Only fetch when the circle frame is actually selected. */
  enabled: boolean;
};

/**
 * The `circle` frame — the players this viewer has actually faced.
 *
 * It exists as a separate hook rather than a branch inside `usePublicStandings`
 * because it is a genuinely different request: a different endpoint, a different
 * client, and an answer that only means anything relative to whoever is asking. The
 * public endpoint rejects `frame=circle` with a 400 for exactly that reason.
 *
 * Returns the same shape as `usePublicStandings` so the page can pick between them
 * without either branch knowing which it got — including the same paging: a circle
 * can outgrow one page too, and the shared load-more button must work in every frame.
 *
 * Keyed by the signed-in user for the same reason the personal card is: a normal
 * sign-out does not clear this cache, so an unkeyed entry would be served to the next
 * person signing in on a shared device — and a circle is a list of the people you have
 * played against, which is not a thing to hand to a stranger.
 */
export function useCircleStandings(params: UseCircleStandingsParams): UsePublicStandingsResult {
  const { session } = useAuth();
  const isSignedIn = Boolean(session);
  const enabled = params.enabled && isSignedIn;
  const initialOffset = params.offset ?? 0;

  const query = useInfiniteQuery({
    queryKey: [
      'my-league-standings',
      session?.user?.id ?? null,
      'circle',
      params.seasonId ?? null,
      params.band ?? null,
      params.limit ?? null,
      initialOffset,
    ],
    queryFn: ({ pageParam }) =>
      fetchMyStandings({
        frame: 'circle',
        seasonId: params.seasonId,
        band: params.band,
        limit: params.limit,
        offset: pageParam,
      }),
    initialPageParam: initialOffset,
    getNextPageParam: (lastPage, allPages) =>
      nextStandingsOffset(lastPage, allPages, initialOffset),
    enabled,
  });

  const pages = query.data?.pages ?? [];
  const first = pages[0] ?? null;
  const standings = first?.kind === 'ok' ? first.data : null;

  return {
    // The consumer payload carries a real `me` row; the shared result type declares
    // `me: null`, so it is not surfaced here. The page reads the personal card hook
    // for the viewer's own figures, which is the one source it uses in every frame.
    standings: standings ? { ...standings, me: null } : null,
    rows: pages.flatMap(page => (page.kind === 'ok' ? page.data.rows : [])),
    season: standings?.season ?? null,
    totalPlayers: standings?.total_players ?? null,
    frame: standings?.frame ?? null,
    // `isLoading`, not `isPending`: a disabled query is pending forever, and a
    // signed-out visitor must not see a table stuck in a skeleton.
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isEmpty: standings !== null && standings.rows.length === 0,
    error: query.error,
    noActiveSeason: first?.kind === 'no-active-season' ? first.message : null,
    // Only the band frame can wait on a band, and this hook is never the band frame.
    isAwaitingBand: false,
    hasMore: query.hasNextPage,
    loadMore: () => {
      if (!query.isFetchingNextPage) void query.fetchNextPage();
    },
    isLoadingMore: query.isFetchingNextPage,
  };
}
