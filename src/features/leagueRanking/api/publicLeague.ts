import axios from 'axios';
import {
  PUBLIC_FRAMES,
  PublicPlayerMatchesSchema,
  PublicPlayerSeasonSchema,
  PublicSeasonListSchema,
  PublicStandingsSchema,
  type BandCode,
  type LeagueFetch,
  type LeagueSeason,
  type PublicFrame,
  type PublicPlayerMatches,
  type PublicPlayerSeason,
  type PublicStandings,
} from '../types';
import { LeagueApiError, unwrapLeagueData, unwrapSeasonalLeagueData } from './envelope';

/**
 * Deliberately NOT the shared `services/api/client.ts` instance: that one
 * attaches a Supabase access token, force-signs-out on 401 and opens the profile
 * modal on 403. The ranking page's primary visitor is logged out, so routing it
 * through the shared client would bounce that visitor out of the page they came
 * to read. This instance has no interceptors at all, and its tests assert that.
 *
 * Same env var as `features/publicTournament/api/publicBracket.ts`, which set
 * this precedent for the public tournament page.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

export const publicLeagueClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

export type PublicStandingsParams = {
  seasonId?: string;
  /** Defaults to `global`. `circle` is not available publicly — see below. */
  frame?: PublicFrame;
  /** Required when `frame` is `band`. */
  band?: BandCode;
  /**
   * Name search over the already-ranked frame (min 2 chars, enforced by the
   * API). Matches keep their TRUE frame ranks; `total_players` becomes the
   * match count.
   */
  q?: string;
  limit?: number;
  offset?: number;
};

/**
 * The ranked table for a logged-out visitor.
 *
 * Ranks arrive decided: the API ranks the whole frame and then slices the page,
 * so `rows` may legitimately open at 51 and may legitimately contain ties. They
 * are passed through exactly as received.
 *
 * The two guards below refuse frames the public surface cannot answer. The API
 * refuses them too, with a 400 — refusing here just means a clearer message and
 * one fewer pointless request. Both frames arrive from URL search params in
 * practice, where TypeScript offers no protection, so these are runtime checks.
 */
export async function fetchPublicStandings(
  params: PublicStandingsParams = {},
): Promise<LeagueFetch<PublicStandings>> {
  const frame = params.frame ?? 'global';

  if (!(PUBLIC_FRAMES as readonly string[]).includes(frame)) {
    throw new LeagueApiError(
      `frame=${frame} is unavailable publicly. A circle is the set of players the signed-in ` +
        'viewer has faced, and this page has no viewer. Use frame=global or frame=band, or sign in.',
    );
  }

  if (frame === 'band' && !params.band) {
    throw new LeagueApiError(
      'frame=band requires an explicit band (A, B, C or D) on the public page: signed in the ' +
        'band comes from the viewer’s own level, and there is no viewer here to resolve it from.',
    );
  }

  const query: Record<string, string | number> = { frame };
  if (params.seasonId) query.season_id = params.seasonId;
  if (params.band) query.band = params.band;
  if (params.q) query.q = params.q;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.offset !== undefined) query.offset = params.offset;

  const response = await publicLeagueClient.get('/public/league/standings', { params: query });
  return unwrapSeasonalLeagueData(response.data, PublicStandingsSchema);
}

/** Every season, newest first — the season picker. */
export async function fetchPublicSeasons(): Promise<LeagueSeason[]> {
  const response = await publicLeagueClient.get('/public/league/seasons');
  return unwrapLeagueData(response.data, PublicSeasonListSchema);
}

/**
 * One player's season, addressable by id — the shareable player page.
 *
 * Unlike standings, this endpoint answers 404 for both an unknown player and an
 * unresolvable season, so the rejection carries an HTTP status the caller can
 * branch on. That asymmetry is intentional in the API and is left intact here.
 */
export async function fetchPublicPlayerSeason(
  playerId: string,
  seasonId?: string,
): Promise<PublicPlayerSeason> {
  const response = await publicLeagueClient.get(
    `/public/league/player/${encodeURIComponent(playerId)}`,
    seasonId ? { params: { season_id: seasonId } } : undefined,
  );
  return unwrapLeagueData(response.data, PublicPlayerSeasonSchema);
}

/**
 * One player's completed matches in one tournament — fetched lazily, on the
 * first expand of that tournament's row. Everything arrives already oriented
 * to the player (`won`, `my_score`), so nothing here needs to know which side
 * of a match they sat on. An empty list is a valid answer, not an error.
 */
export async function fetchPublicPlayerMatches(
  playerId: string,
  tournamentId: string,
): Promise<PublicPlayerMatches> {
  const response = await publicLeagueClient.get(
    `/public/league/player/${encodeURIComponent(playerId)}/matches`,
    { params: { tournament_id: tournamentId } },
  );
  return unwrapLeagueData(response.data, PublicPlayerMatchesSchema);
}
