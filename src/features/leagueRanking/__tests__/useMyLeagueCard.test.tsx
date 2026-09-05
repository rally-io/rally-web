import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';

vi.mock('../api/myLeague', () => ({
  fetchMyLeagueCard: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useMyLeagueCard } from '../hooks/useMyLeagueCard';
import { fetchMyLeagueCard } from '../api/myLeague';
import { useAuth } from '@/hooks/useAuth';
import type { AuthContextValue } from '@/contexts/AuthContext';
import type { LeagueFetch, LeagueResult, LeagueSeason, MyLeagueCard } from '../types';

const mockFetchMyLeagueCard = vi.mocked(fetchMyLeagueCard);
const mockUseAuth = vi.mocked(useAuth);

const SEASON: LeagueSeason = {
  id: 'season-2026',
  name: '2026',
  starts_at: '2026-01-01T00:00:00+00:00',
  ends_at: '2026-12-31T00:00:00+00:00',
  counting_results: 6,
  is_active: true,
  quarters: [],
};

const RESULT: LeagueResult = {
  tournament_id: 't-1',
  tournament_name: 'Herzliya Open',
  placement_bucket: 'semi_final',
  final_position: 3,
  band_code: 'B',
  draw_size: 16,
  points: 120,
  counted: true,
  awarded_at: '2026-05-04T18:00:00+00:00',
};

function card(results: LeagueResult[]): LeagueFetch<MyLeagueCard> {
  return {
    kind: 'ok',
    data: {
      season: SEASON,
      points: results.reduce((sum, r) => sum + r.points, 0),
      global_rank: results.length ? 47 : null,
      rank_change: null,
      movement_reason: null,
      band_code: null,
      is_provisional: false,
      level_rank: null,
      gap_to_above: null,
      career_points: 0,
      quarters: [],
      results,
    },
  };
}

/** Signed in / signed out, shaped like the real context so consumers can destructure it. */
function setSession(session: Session | null): void {
  mockUseAuth.mockReturnValue({
    session,
    user: session?.user ?? null,
    isLoading: false,
  } as unknown as AuthContextValue);
}

const FAKE_SESSION = { access_token: 'jwt', user: { id: 'u-1' } } as unknown as Session;

/** See the note in usePublicStandings.test.tsx — the client must outlive a rerender. */
function createWrapper(): (props: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setSession(null);
});

describe('useMyLeagueCard', () => {
  it('issues no request at all when there is no session', async () => {
    setSession(null);

    const { result } = renderHook(() => useMyLeagueCard(), { wrapper: createWrapper() });

    // Settle a macrotask so a query fired from an effect would have been observed.
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(mockFetchMyLeagueCard).not.toHaveBeenCalled();
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.card).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    // Signed out is not "you have no results" either — there is nobody to have them.
    expect(result.current.isEmpty).toBe(false);
  });

  it('fetches once a session appears', async () => {
    mockFetchMyLeagueCard.mockResolvedValue(card([RESULT]));

    const { result, rerender } = renderHook(() => useMyLeagueCard(), {
      wrapper: createWrapper(),
    });

    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(mockFetchMyLeagueCard).not.toHaveBeenCalled();

    setSession(FAKE_SESSION);
    rerender();

    await waitFor(() => expect(result.current.card).not.toBeNull());
    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.card?.global_rank).toBe(47);
    expect(result.current.card?.results).toHaveLength(1);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('reports a failed request as an error, never as "you have no results"', async () => {
    // The false negative the mobile build shipped: a card whose request errored
    // rendered the empty state, so a ranked player was permanently told they had
    // no results. `isEmpty` must be reachable only from a successful response.
    setSession(FAKE_SESSION);
    mockFetchMyLeagueCard.mockRejectedValue(new Error('500 from /rally/v1/league/me'));

    const { result } = renderHook(() => useMyLeagueCard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe('500 from /rally/v1/league/me');
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.card).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.noActiveSeason).toBeNull();
  });

  it('reports a genuinely resultless season as empty, with no error', async () => {
    // The other half of the pair: without this, the test above would pass against
    // a hook that hardcodes `isEmpty: false`.
    setSession(FAKE_SESSION);
    mockFetchMyLeagueCard.mockResolvedValue(card([]));

    const { result } = renderHook(() => useMyLeagueCard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.card).not.toBeNull());

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.card?.global_rank).toBeNull();
  });

  it('reports "no active season" in the data channel, distinct from both error and empty', async () => {
    setSession(FAKE_SESSION);
    mockFetchMyLeagueCard.mockResolvedValue({
      kind: 'no-active-season',
      message: 'No active season',
    });

    const { result } = renderHook(() => useMyLeagueCard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.noActiveSeason).toBe('No active season'));

    expect(result.current.error).toBeNull();
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.card).toBeNull();
  });

  it('never serves one user’s card to the next user on the same device', async () => {
    // A normal sign-out does not clear this entry: AppSessionContext drops an
    // allowlist of two keys, and queryClient.clear() runs only on the 401 path.
    // With the app's 10-minute gcTime, an unkeyed cache entry would hand the next
    // person to sign in on a shared club tablet the previous player's rank and
    // points. This test fails if the user id leaves the query key.
    const userA = { access_token: 'a', user: { id: 'user-a' } } as unknown as Session;
    const userB = { access_token: 'b', user: { id: 'user-b' } } as unknown as Session;

    setSession(userA);
    mockFetchMyLeagueCard.mockResolvedValue(card([RESULT]));

    const { result, rerender } = renderHook(() => useMyLeagueCard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.card?.points).toBe(120));

    setSession(userB);
    mockFetchMyLeagueCard.mockResolvedValue(card([{ ...RESULT, points: 999 }]));
    rerender();

    await waitFor(() => expect(mockFetchMyLeagueCard).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.card?.points).toBe(999));
  });

  it('passes an explicit season through to the API', async () => {
    setSession(FAKE_SESSION);
    mockFetchMyLeagueCard.mockResolvedValue(card([RESULT]));

    const { result } = renderHook(() => useMyLeagueCard('season-2025'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.card).not.toBeNull());
    expect(mockFetchMyLeagueCard).toHaveBeenCalledWith('season-2025');
  });
});
