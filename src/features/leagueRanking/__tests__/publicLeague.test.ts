import type { AxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPublicPlayerSeason,
  fetchPublicSeasons,
  fetchPublicStandings,
  publicLeagueClient,
} from '../api/publicLeague';
import type { PublicFrame } from '../types';

const season = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Season 1',
  starts_at: '2026-01-01T00:00:00Z',
  ends_at: '2026-12-31T00:00:00Z',
  counting_results: 5,
  is_active: true,
};

const row = {
  rank: 1,
  player_id: 'p-a',
  first_name: 'Dana',
  last_name: 'Levi',
  avatar_url: null,
  avatar_clean_url: null,
  skill_tier: 'gold',
  band_code: 'A',
  points: 900,
  counted_results: 4,
  rank_change: 0,
};

function envelope(data: unknown) {
  return { data: { success: true, data, error: null, meta: null } };
}

const get = vi.spyOn(publicLeagueClient, 'get');

function lastCall(): { url: string; config: AxiosRequestConfig | undefined } {
  const [url, config] = get.mock.calls[get.mock.calls.length - 1] as [string, AxiosRequestConfig?];
  return { url, config };
}

beforeEach(() => {
  get.mockReset();
});

describe('the public league client is unauthenticated', () => {
  /**
   * The whole point of this module. The shared `services/api/client.ts` instance
   * attaches a Supabase token, force-signs-out on 401 and opens the profile modal
   * on 403 — so a logged-out visitor to a public page gets bounced out of it.
   * A swap to the shared client would still work for signed-in developers and
   * break only for the logged-out visitors this page exists for, so pin it here.
   */
  it('has no request interceptor — nothing can attach an Authorization header', () => {
    expect(publicLeagueClient.interceptors.request.handlers).toHaveLength(0);
  });

  it('has no response interceptor — no forced sign-out, no profile modal', () => {
    expect(publicLeagueClient.interceptors.response.handlers).toHaveLength(0);
  });

  it('carries no Authorization in its instance defaults', () => {
    expect(publicLeagueClient.defaults.headers.common.Authorization).toBeUndefined();
  });

  it('sends no Authorization header on an actual standings request', async () => {
    get.mockResolvedValue(envelope({ season, frame: 'global', total_players: 1, rows: [row], me: null }));

    await fetchPublicStandings();

    const { config } = lastCall();
    const headers = (config?.headers ?? {}) as Record<string, unknown>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    expect(Object.keys(headers)).toHaveLength(0);
  });
});

describe('fetchPublicStandings', () => {
  it('calls /public/league/standings with the frame and paging params', async () => {
    get.mockResolvedValue(envelope({ season, frame: 'band', total_players: 240, rows: [row], me: null }));

    await fetchPublicStandings({ frame: 'band', band: 'B', limit: 50, offset: 50, seasonId: season.id });

    const { url, config } = lastCall();
    expect(url).toBe('/public/league/standings');
    expect(config?.params).toEqual({
      frame: 'band',
      band: 'B',
      limit: 50,
      offset: 50,
      season_id: season.id,
    });
  });

  it('defaults to the global frame and omits params it was not given', async () => {
    get.mockResolvedValue(envelope({ season, frame: 'global', total_players: 1, rows: [row], me: null }));

    await fetchPublicStandings();

    expect(lastCall().config?.params).toEqual({ frame: 'global' });
  });

  it('returns the parsed rows with the server ranks untouched', async () => {
    get.mockResolvedValue(
      envelope({
        season,
        frame: 'global',
        total_players: 240,
        rows: [
          { ...row, rank: 51, player_id: 'p-a' },
          { ...row, rank: 51, player_id: 'p-b' },
          { ...row, rank: 53, player_id: 'p-c' },
        ],
        me: null,
      }),
    );

    const outcome = await fetchPublicStandings({ offset: 50 });

    if (outcome.kind !== 'ok') throw new Error('expected an ok result');
    expect(outcome.data.rows.map((r) => r.rank)).toEqual([51, 51, 53]);
    expect(outcome.data.total_players).toBe(240);
  });

  it('rejects a malformed response rather than handing it to a caller', async () => {
    get.mockResolvedValue(envelope({ season, frame: 'global', total_players: 1, me: null }));

    await expect(fetchPublicStandings()).rejects.toThrow();
  });

  /**
   * The API answers "there is no season yet" with HTTP 200 + success:false,
   * deliberately: it is a valid answer to a valid request, not a missing
   * resource, and the shipped mobile client keys its empty state on this shape.
   */
  it('reports no-active-season from a 200 with success:false, without throwing', async () => {
    get.mockResolvedValue({ data: { success: false, error: 'No active season' } });

    const outcome = await fetchPublicStandings();

    expect(outcome).toEqual({ kind: 'no-active-season', message: 'No active season' });
  });

  /**
   * A circle is "players the viewer has faced"; there is no viewer here. The API
   * answers 400, but refusing before the network call gives a better message and
   * one fewer confusing request in the network tab. The cast mirrors reality:
   * a frame arriving from a URL search param has no compile-time protection.
   */
  it('refuses frame=circle before making any request', async () => {
    await expect(
      fetchPublicStandings({ frame: 'circle' as unknown as PublicFrame }),
    ).rejects.toThrow(/circle/i);

    expect(get).not.toHaveBeenCalled();
  });

  it('refuses frame=band with no band, before making any request', async () => {
    await expect(fetchPublicStandings({ frame: 'band' })).rejects.toThrow(/band/i);
    expect(get).not.toHaveBeenCalled();
  });
});

describe('fetchPublicSeasons', () => {
  it('calls /public/league/seasons and parses the list', async () => {
    get.mockResolvedValue(envelope([season, { ...season, id: 'other', is_active: false }]));

    const seasons = await fetchPublicSeasons();

    expect(lastCall().url).toBe('/public/league/seasons');
    expect(seasons.map((s) => s.id)).toEqual([season.id, 'other']);
  });

  it('rejects a malformed season list', async () => {
    get.mockResolvedValue(envelope([{ id: 'x' }]));
    await expect(fetchPublicSeasons()).rejects.toThrow();
  });
});

describe('fetchPublicPlayerSeason', () => {
  it('calls /public/league/player/{id} and parses the season page', async () => {
    get.mockResolvedValue(
      envelope({
        season,
        player_id: 'p-a',
        first_name: 'Dana',
        last_name: 'Levi',
        avatar_url: null,
        avatar_clean_url: null,
        points: 900,
        global_rank: 51,
        rank_change: -12,
        results: [],
      }),
    );

    const player = await fetchPublicPlayerSeason('p-a');

    expect(lastCall().url).toBe('/public/league/player/p-a');
    expect(player.global_rank).toBe(51);
    expect(player.rank_change).toBe(-12);
  });

  it('passes season_id when one is given', async () => {
    get.mockResolvedValue(
      envelope({ season, player_id: 'p-a', points: 0, global_rank: null, rank_change: null, results: [] }),
    );

    await fetchPublicPlayerSeason('p-a', season.id);

    expect(lastCall().config?.params).toEqual({ season_id: season.id });
  });

  /**
   * Unknown player and unresolvable season are both 404 here — one mechanism the
   * caller branches on with the HTTP status, unlike standings. That asymmetry is
   * intentional in the API and is not tidied away in this client.
   */
  it('lets a 404 reject so the caller can branch on the status', async () => {
    get.mockRejectedValue(Object.assign(new Error('Request failed'), { response: { status: 404 } }));

    await expect(fetchPublicPlayerSeason('nobody')).rejects.toMatchObject({
      response: { status: 404 },
    });
  });
});
