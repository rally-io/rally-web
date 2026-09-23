import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchMyLeagueCard } from '../api/myLeague';
import type { MyLeagueCard } from '../types';

export type UseMyLeagueCardResult = {
  card: MyLeagueCard | null;
  isSignedIn: boolean;
  isLoading: boolean;
  /** True ONLY when a successful response carried an empty results ledger. */
  isEmpty: boolean;
  error: Error | null;
  noActiveSeason: string | null;
};

/**
 * The signed-in visitor's own league card.
 *
 * Session detection comes from `useAuth()` (`src/contexts/AuthContext.tsx`), which
 * is the app's single source of truth for it — no reinvented token check. The whole
 * page is public, so the absence of a session is the normal case, not a failure:
 * with none, the query is disabled and NO request is issued. Firing it and letting
 * the shared client 401 would sign the visitor out of a page they came to read.
 *
 * `isEmpty` is the important field. The mobile build rendered "you have no results"
 * whenever the card was null, which made every failed request look like a permanent,
 * confident statement about the player's own season. Null is reached three ways —
 * signed out, loading, errored — and none of them mean "no results". So `isEmpty`
 * is computed only from a successful response, and the empty state must key on it.
 *
 * Note this payload carries NO name or avatar (verified against the API): a card
 * that wants them must take them from the auth context.
 */
export function useMyLeagueCard(seasonId?: string): UseMyLeagueCardResult {
  const { session } = useAuth();
  const isSignedIn = Boolean(session);

  const query = useQuery({
    // Keyed by the signed-in user, and that is not belt-and-braces.
    //
    // A normal sign-out does NOT clear this entry. `AppSessionContext` drops an
    // ALLOWLIST of two keys when the session goes null (`onboarding-status`,
    // `player-profile-me`); `queryClient.clear()` runs only on the 401
    // force-sign-out path. So with the app's `gcTime: 10min` / `staleTime: 5min`
    // defaults, an unkeyed entry would survive a sign-out and be served straight
    // to the NEXT person who signs in on the same device — a shared club tablet is
    // the obvious case. That is this feature's own failure mode in its worst form:
    // a wrong number under a correct label, and the number is someone else's rank.
    //
    // Scoping the key fixes it by construction rather than by remembering to add
    // an entry to that allowlist: a different user is simply a cache miss.
    queryKey: ['my-league-card', session?.user?.id ?? null, seasonId ?? null],
    queryFn: () => fetchMyLeagueCard(seasonId),
    enabled: isSignedIn,
  });

  const fetched = query.data ?? null;
  const card = fetched?.kind === 'ok' ? fetched.data : null;

  return {
    card,
    isSignedIn,
    // `isLoading`, not `isPending`: a disabled query stays pending forever, and a
    // signed-out visitor must not see a card stuck in a loading skeleton.
    isLoading: query.isLoading,
    isEmpty: card !== null && card.results.length === 0,
    error: query.error,
    noActiveSeason: fetched?.kind === 'no-active-season' ? fetched.message : null,
  };
}
