import client from '@/services/api/client';
import {
  MyLeagueCardSchema,
  MyStandingsSchema,
  type BandCode,
  type LeagueFetch,
  type MyLeagueCard,
  type MyStandings,
} from '../types';
import { unwrapSeasonalLeagueData } from './envelope';

/**
 * The shared client's baseURL is the bare API origin with no path prefix, so the
 * absolute `/rally/v1/...` path composes correctly rather than doubling it.
 */
export const MY_LEAGUE_ENDPOINT = '/rally/v1/league/me';

/**
 * The signed-in visitor's own league card — the only league call that uses the
 * shared authed client, because it is the only one that needs a viewer.
 *
 * The shared client's response interceptor returns `response.data`, so this
 * resolves to the envelope itself, not an AxiosResponse wrapping it. Typing it
 * `unknown` keeps that runtime truth honest; Zod restores the real types.
 *
 * A player with no results is a successful answer — zero points, a null rank —
 * and must never be confused with an error. A failed call rejects; it does not
 * come back looking like an empty season.
 */
export async function fetchMyLeagueCard(seasonId?: string): Promise<LeagueFetch<MyLeagueCard>> {
  const envelope: unknown = await client.get(
    MY_LEAGUE_ENDPOINT,
    seasonId ? { params: { season_id: seasonId } } : undefined,
  );
  return unwrapSeasonalLeagueData(envelope, MyLeagueCardSchema);
}

export const MY_STANDINGS_ENDPOINT = '/rally/v1/league/standings';

export type MyStandingsParams = {
  seasonId?: string;
  /** `circle` is the whole reason this exists; `global` and `band` belong on the public client. */
  frame: 'circle' | 'global' | 'band';
  band?: BandCode;
  limit?: number;
  offset?: number;
};

/**
 * Standings through the authed client, for frames that need a viewer.
 *
 * The public endpoint rejects `frame=circle` with a 400 — correctly, since a circle
 * is defined relative to whoever is asking. Without this the circle chip would render
 * for signed-in visitors and fail on click, which is worse than not offering it.
 *
 * Ranks arrive already assigned by the server and are passed through untouched: a
 * circle is a filtered view of one ranked season, so it legitimately contains gaps
 * and repeats. Renumbering the page would erase exactly the information it carries.
 */
export async function fetchMyStandings(
  params: MyStandingsParams,
): Promise<LeagueFetch<MyStandings>> {
  const envelope: unknown = await client.get(MY_STANDINGS_ENDPOINT, {
    params: {
      frame: params.frame,
      ...(params.seasonId ? { season_id: params.seasonId } : {}),
      ...(params.band ? { band: params.band } : {}),
      ...(params.limit !== undefined ? { limit: params.limit } : {}),
      ...(params.offset !== undefined ? { offset: params.offset } : {}),
    },
  });
  return unwrapSeasonalLeagueData(envelope, MyStandingsSchema);
}
