import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchPublicStandings, type PublicStandingsParams } from '../api/publicLeague';
import type { LeagueFetch, LeagueSeason, PublicStandings, StandingsRow } from '../types';

export type UsePublicStandingsResult = {
  /** The FIRST page's payload, or null. Season, frame and total all read off it. */
  standings: PublicStandings | null;
  /**
   * Every loaded page flattened, in server order with server ranks. Never
   * sorted, deduped or renumbered here — if the live board reorders between
   * page fetches a row can appear twice, which is rare, visible, and heals on
   * the next refetch; silently deduping would break the contract instead.
   */
  rows: StandingsRow[];
  season: LeagueSeason | null;
  /** Size of the whole frame, not of the loaded rows. Null while there is no payload. */
  totalPlayers: number | null;
  /** The frame the server answered for — echoed by the payload, not the request. */
  frame: string | null;
  isLoading: boolean;
  isFetching: boolean;
  /** True ONLY for a successful response that contained zero rows. */
  isEmpty: boolean;
  error: Error | null;
  /** HTTP 200 + `success: false` — a valid answer, not a failure. */
  noActiveSeason: string | null;
  /** `frame=band` chosen but no band picked yet: nothing is requested, nothing is wrong. */
  isAwaitingBand: boolean;
  /** More rows exist on the server beyond what `rows` currently holds. */
  hasMore: boolean;
  /** Fetch the next page and append it to `rows`. No-op while one is in flight. */
  loadMore: () => void;
  /** True only while a NEXT page is in flight — never for page one or background refetches. */
  isLoadingMore: boolean;
};

/**
 * Turn one fetched page into the offset of the page after it, or `undefined`
 * for "there is no page after it". Shared by the circle hook, which pages the
 * same shape from a different endpoint.
 *
 * Two stop conditions besides "fetched everything":
 * - a non-`ok` page (no active season) has nothing to continue from;
 * - an EMPTY ok page stops paging even when `total_players` says more exist —
 *   if the live board shrinks between fetches, "fetched < total" would request
 *   the same empty offset forever.
 */
export function nextStandingsOffset(
  lastPage: LeagueFetch<{ total_players: number; rows: StandingsRow[] }>,
  allPages: LeagueFetch<{ total_players: number; rows: StandingsRow[] }>[],
  initialOffset: number,
): number | undefined {
  if (lastPage.kind !== 'ok' || lastPage.data.rows.length === 0) return undefined;
  const fetched = allPages.reduce(
    (count, page) => count + (page.kind === 'ok' ? page.data.rows.length : 0),
    0,
  );
  return fetched < lastPage.data.total_players ? initialOffset + fetched : undefined;
}

/**
 * The public standings table, paged: the first page loads on mount and
 * `loadMore` appends the next one.
 *
 * THREE THINGS ARE DELIBERATE HERE.
 *
 * 1. NO `placeholderData: keepPreviousData`. `usePublicBracket` uses it, and it is
 *    right there: that screen polls one unchanging bracket, so the previous frame
 *    IS this frame. Here the query key carries the frame, and keeping previous data
 *    across a frame change is precisely the bug the mobile build shipped — the
 *    header kept the global total under the "My level" label for a whole round trip,
 *    so a player read a wrong number that looked authoritative. Mid-switch this hook
 *    reports no numbers at all, and a spinner is the honest answer. A frame change
 *    also resets paging for the same reason: the new frame starts from its own page one.
 *
 * 2. THE SCALARS ALL COME OFF THE FIRST PAGE'S PAYLOAD. `frame`, `totalPlayers` and
 *    `season` describe the whole frame, and every page repeats them; reading them
 *    from one fixed page means a label and its figures cannot desync no matter how
 *    many pages are loaded. `frame` is the server's echo, not the caller's request,
 *    for the same reason. Only `rows` spans pages.
 *
 * 3. `isEmpty` IS NOT `rows.length === 0`. An error and a not-yet-loaded query also
 *    have zero rows, and rendering "nobody is ranked" for either is a false claim.
 *    `isEmpty` is reachable only from a successful response.
 *
 * `params.offset` is the INITIAL offset (a page that opens at 51 stays supported);
 * subsequent pages are driven by the accumulated row count, not by the caller.
 *
 * `retry` is left to the app's QueryClient default rather than pinned here, so tests
 * can disable it and the app keeps one retry policy.
 */
export function usePublicStandings(params: PublicStandingsParams = {}): UsePublicStandingsResult {
  const frame = params.frame ?? 'global';
  // The public API answers `frame=band` without a band with a 400. Not requesting it
  // is not an error state — the user simply has not picked a band yet.
  const isAwaitingBand = frame === 'band' && !params.band;
  const initialOffset = params.offset ?? 0;

  const query = useInfiniteQuery({
    queryKey: [
      'public-league-standings',
      params.seasonId ?? null,
      frame,
      params.band ?? null,
      params.q ?? null,
      params.limit ?? null,
      initialOffset,
    ],
    queryFn: ({ pageParam }) => fetchPublicStandings({ ...params, frame, offset: pageParam }),
    initialPageParam: initialOffset,
    getNextPageParam: (lastPage, allPages) =>
      nextStandingsOffset(lastPage, allPages, initialOffset),
    enabled: !isAwaitingBand,
  });

  const pages = query.data?.pages ?? [];
  const first = pages[0] ?? null;
  const standings = first?.kind === 'ok' ? first.data : null;

  return {
    standings,
    rows: pages.flatMap(page => (page.kind === 'ok' ? page.data.rows : [])),
    season: standings?.season ?? null,
    totalPlayers: standings?.total_players ?? null,
    frame: standings?.frame ?? null,
    // `isLoading` (pending AND fetching), not `isPending`: a disabled query is
    // pending forever, and reporting that as loading would spin a table that is
    // waiting on the user, not on the network.
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isEmpty: standings !== null && standings.rows.length === 0,
    error: query.error,
    noActiveSeason: first?.kind === 'no-active-season' ? first.message : null,
    isAwaitingBand,
    hasMore: query.hasNextPage,
    loadMore: () => {
      if (!query.isFetchingNextPage) void query.fetchNextPage();
    },
    // `isFetchingNextPage`, NOT `isFetching`: the latter also fires on background
    // refetches of loaded pages and would flash the button into its busy state.
    isLoadingMore: query.isFetchingNextPage,
  };
}
