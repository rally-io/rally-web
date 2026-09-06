import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../api/publicLeague', () => ({
  fetchPublicStandings: vi.fn(),
}));

import { usePublicStandings } from '../hooks/usePublicStandings';
import { fetchPublicStandings } from '../api/publicLeague';
import type {
  BandCode,
  LeagueFetch,
  LeagueSeason,
  PublicFrame,
  PublicStandings,
  StandingsRow,
} from '../types';

const mockFetchPublicStandings = vi.mocked(fetchPublicStandings);

const SEASON: LeagueSeason = {
  id: 'season-2026',
  name: '2026',
  starts_at: '2026-01-01T00:00:00+00:00',
  ends_at: '2026-12-31T00:00:00+00:00',
  counting_results: 6,
  is_active: true,
  quarters: [],
};

function row(rank: number, playerId: string): StandingsRow {
  return {
    rank,
    player_id: playerId,
    first_name: 'Noa',
    last_name: 'Levi',
    avatar_url: null,
    avatar_clean_url: null,
    skill_tier: null,
    band_code: null,
    points: 420,
    counted_results: 4,
    rank_change: null,
    is_provisional: false,
  };
}

function ok(
  frame: string,
  totalPlayers: number,
  rows: StandingsRow[],
): LeagueFetch<PublicStandings> {
  return {
    kind: 'ok',
    data: { season: SEASON, frame, total_players: totalPlayers, rows, me: null },
  };
}

/**
 * One QueryClient per test, created OUTSIDE the wrapper component.
 *
 * This is load-bearing, not tidiness. Building the client inside the wrapper body
 * means a `rerender` throws the whole cache away, so the "does the previous frame's
 * data leak" test below would pass even against a hook that keeps previous data —
 * the previous data would live in a client that no longer exists. The guard would
 * be vacuous. Verified by adding `placeholderData: keepPreviousData` to the hook
 * and watching test 3 fail.
 */
function createWrapper(): (props: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

type FrameProps = { frame: PublicFrame; band?: BandCode };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePublicStandings', () => {
  it('returns rows on success, and exposes isLoading and error distinctly', async () => {
    mockFetchPublicStandings.mockResolvedValue(ok('global', 1204, [row(1, 'p1'), row(2, 'p2')]));

    const { result } = renderHook(() => usePublicStandings({ frame: 'global' }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows.map(r => r.rank)).toEqual([1, 2]);
    expect(result.current.totalPlayers).toBe(1204);
    expect(result.current.season?.id).toBe('season-2026');
    expect(result.current.error).toBeNull();
  });

  it('passes server ranks through untouched, including ties and a page that starts at 51', async () => {
    mockFetchPublicStandings.mockResolvedValue(
      ok('global', 1204, [row(51, 'a'), row(51, 'b'), row(53, 'c')]),
    );

    const { result } = renderHook(() => usePublicStandings({ frame: 'global', offset: 50 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    expect(result.current.rows.map(r => r.rank)).toEqual([51, 51, 53]);
  });

  it('replaces rows on a frame change rather than appending them', async () => {
    mockFetchPublicStandings.mockResolvedValueOnce(
      ok('global', 1204, [row(1, 'p1'), row(2, 'p2'), row(3, 'p3')]),
    );

    const { result, rerender } = renderHook(
      ({ frame, band }: FrameProps) => usePublicStandings({ frame, band }),
      { wrapper: createWrapper(), initialProps: { frame: 'global' } as FrameProps },
    );

    await waitFor(() => expect(result.current.rows).toHaveLength(3));

    mockFetchPublicStandings.mockResolvedValueOnce(ok('band', 40, [row(1, 'p9')]));
    rerender({ frame: 'band', band: 'B' });

    await waitFor(() => expect(result.current.totalPlayers).toBe(40));
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].player_id).toBe('p9');
  });

  it('never shows the previous frame’s total under the new frame’s label', async () => {
    // The exact bug the mobile build shipped: the header kept "1204 players" for a
    // whole round trip after the user switched to their own band, so a player read
    // "your position in My level — 47 of 1204" using global figures. A wrong number
    // under a correct label is worse than a spinner, so mid-switch there must be no
    // number at all.
    mockFetchPublicStandings.mockResolvedValueOnce(ok('global', 1204, [row(47, 'me')]));

    const { result, rerender } = renderHook(
      ({ frame, band }: FrameProps) => usePublicStandings({ frame, band }),
      { wrapper: createWrapper(), initialProps: { frame: 'global' } as FrameProps },
    );

    await waitFor(() => expect(result.current.totalPlayers).toBe(1204));

    let releaseBand: (value: LeagueFetch<PublicStandings>) => void = () => {};
    mockFetchPublicStandings.mockImplementationOnce(
      () =>
        new Promise<LeagueFetch<PublicStandings>>(resolve => {
          releaseBand = resolve;
        }),
    );

    rerender({ frame: 'band', band: 'B' });
    await waitFor(() => expect(mockFetchPublicStandings).toHaveBeenCalledTimes(2));

    // In flight for the NEW frame: nothing from the old frame may still be readable.
    expect(result.current.totalPlayers).toBeNull();
    expect(result.current.rows).toEqual([]);
    expect(result.current.frame).toBeNull();
    expect(result.current.isLoading).toBe(true);

    releaseBand(ok('band', 40, [row(3, 'me')]));

    await waitFor(() => expect(result.current.totalPlayers).toBe(40));
    expect(result.current.frame).toBe('band');
  });

  it('surfaces an error state on a rejected request, not an empty table', async () => {
    // An empty table says "nobody is ranked". That is a different claim, and a wrong one.
    mockFetchPublicStandings.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => usePublicStandings({ frame: 'global' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe('network down');
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.standings).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.noActiveSeason).toBeNull();
  });

  it('reports a genuinely empty frame as empty, with no error', async () => {
    // The other half of the pair above: `isEmpty` must be reachable, or the previous
    // test could pass against a hook that hardcodes `isEmpty: false`.
    mockFetchPublicStandings.mockResolvedValue(ok('band', 0, []));

    const { result } = renderHook(() => usePublicStandings({ frame: 'band', band: 'D' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.rows).toEqual([]);
  });

  it('reports "no active season" in the data channel, distinct from both error and empty', async () => {
    mockFetchPublicStandings.mockResolvedValue({
      kind: 'no-active-season',
      message: 'No active season',
    });

    const { result } = renderHook(() => usePublicStandings({ frame: 'global' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.noActiveSeason).toBe('No active season'));

    expect(result.current.error).toBeNull();
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.standings).toBeNull();
    // There is nothing to page through when there is no season.
    expect(result.current.hasMore).toBe(false);
  });

  it('loadMore appends the next server page, offsets by rows fetched, ranks untouched', async () => {
    mockFetchPublicStandings.mockResolvedValueOnce(ok('global', 5, [row(1, 'a'), row(2, 'b')]));

    const { result } = renderHook(() => usePublicStandings({ frame: 'global' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(result.current.hasMore).toBe(true);

    // The real production edge: the page boundary lands mid-tie, so the next
    // page OPENS with the same rank number the previous page closed on.
    mockFetchPublicStandings.mockResolvedValueOnce(ok('global', 5, [row(2, 'c'), row(4, 'd')]));
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.rows).toHaveLength(4));
    expect(result.current.rows.map(r => r.rank)).toEqual([1, 2, 2, 4]);
    expect(mockFetchPublicStandings).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 2 }),
    );
    // The scalars keep describing the whole frame, not the growing row list.
    expect(result.current.totalPlayers).toBe(5);
    expect(result.current.hasMore).toBe(true);

    mockFetchPublicStandings.mockResolvedValueOnce(ok('global', 5, [row(5, 'e')]));
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.rows).toHaveLength(5));
    expect(result.current.hasMore).toBe(false);
  });

  it('stops paging on an empty page even while total_players still claims more', async () => {
    // A board that shrank between fetches must not be re-requested forever:
    // "fetched < total" would ask for the same empty offset on every click.
    mockFetchPublicStandings.mockResolvedValueOnce(ok('global', 10, [row(1, 'a')]));

    const { result } = renderHook(() => usePublicStandings({ frame: 'global' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.hasMore).toBe(true);

    mockFetchPublicStandings.mockResolvedValueOnce(ok('global', 10, []));
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.hasMore).toBe(false));
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('a frame change resets paging to a single fresh page', async () => {
    mockFetchPublicStandings.mockResolvedValueOnce(ok('global', 4, [row(1, 'a'), row(2, 'b')]));

    const { result, rerender } = renderHook(
      ({ frame, band }: FrameProps) => usePublicStandings({ frame, band }),
      { wrapper: createWrapper(), initialProps: { frame: 'global' } as FrameProps },
    );

    await waitFor(() => expect(result.current.rows).toHaveLength(2));

    mockFetchPublicStandings.mockResolvedValueOnce(ok('global', 4, [row(3, 'c'), row(4, 'd')]));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.rows).toHaveLength(4));

    mockFetchPublicStandings.mockResolvedValueOnce(ok('band', 1, [row(1, 'z')]));
    rerender({ frame: 'band', band: 'B' });

    await waitFor(() => expect(result.current.frame).toBe('band'));
    expect(result.current.rows.map(r => r.player_id)).toEqual(['z']);
    expect(result.current.hasMore).toBe(false);
  });

  it('issues no request for frame=band until a band is chosen', async () => {
    const { result, rerender } = renderHook(
      ({ frame, band }: FrameProps) => usePublicStandings({ frame, band }),
      { wrapper: createWrapper(), initialProps: { frame: 'band' } as FrameProps },
    );

    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(mockFetchPublicStandings).not.toHaveBeenCalled();
    expect(result.current.isAwaitingBand).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isEmpty).toBe(false);

    mockFetchPublicStandings.mockResolvedValueOnce(ok('band', 40, [row(1, 'p9')]));
    rerender({ frame: 'band', band: 'C' });

    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.isAwaitingBand).toBe(false);
    expect(mockFetchPublicStandings).toHaveBeenCalledWith(
      expect.objectContaining({ frame: 'band', band: 'C' }),
    );
  });
});
