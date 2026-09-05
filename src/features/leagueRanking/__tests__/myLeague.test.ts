import type { AxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import client from '@/services/api/client';
import { MY_LEAGUE_ENDPOINT, fetchMyLeagueCard } from '../api/myLeague';

vi.mock('@/services/api/client', () => ({ default: { get: vi.fn() } }));

const get = vi.mocked(client.get);

const season = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Season 1',
  starts_at: '2026-01-01T00:00:00Z',
  ends_at: '2026-12-31T00:00:00Z',
  counting_results: 5,
  is_active: true,
};

beforeEach(() => {
  get.mockReset();
});

describe('fetchMyLeagueCard', () => {
  /**
   * The shared client's response interceptor returns `response.data`, so a call
   * resolves to the envelope itself rather than an AxiosResponse wrapping it.
   * Its baseURL is the bare origin with no API prefix, so the absolute
   * `/rally/v1/...` path composes correctly and does not double the prefix.
   */
  it('targets /rally/v1/league/me on the shared authed client', async () => {
    get.mockResolvedValue({ success: true, data: { season, points: 640, global_rank: 12, rank_change: 3, results: [] } });

    await fetchMyLeagueCard();

    const [url] = get.mock.calls[0] as [string, AxiosRequestConfig?];
    expect(url).toBe('/rally/v1/league/me');
    expect(MY_LEAGUE_ENDPOINT).toBe('/rally/v1/league/me');
    expect(url.startsWith('/rally/v1/')).toBe(true);
    expect(url).not.toMatch(/\/rally\/v1\/rally\/v1\//);
  });

  it('parses the card, which carries no identity fields', async () => {
    get.mockResolvedValue({
      success: true,
      data: {
        season,
        points: 640,
        global_rank: 12,
        rank_change: -4,
        results: [
          {
            tournament_id: 't-1',
            tournament_name: 'Tel Aviv Open',
            placement_bucket: 'semi',
            final_position: 3,
            band_code: 'B',
            draw_size: 16,
            points: 120,
            counted: true,
            awarded_at: '2026-03-01T10:00:00Z',
          },
        ],
      },
    });

    const outcome = await fetchMyLeagueCard();

    if (outcome.kind !== 'ok') throw new Error('expected an ok result');
    expect(outcome.data.global_rank).toBe(12);
    expect(outcome.data.rank_change).toBe(-4);
    expect(outcome.data.results[0].counted).toBe(true);
  });

  it('passes season_id when one is given, and omits it otherwise', async () => {
    get.mockResolvedValue({ success: true, data: { season, points: 0, global_rank: null, rank_change: null, results: [] } });

    await fetchMyLeagueCard();
    expect((get.mock.calls[0][1] as AxiosRequestConfig | undefined)?.params).toBeUndefined();

    await fetchMyLeagueCard(season.id);
    expect((get.mock.calls[1][1] as AxiosRequestConfig | undefined)?.params).toEqual({
      season_id: season.id,
    });
  });

  /** Same 200 + success:false "no active season" answer as the public standings. */
  it('reports no-active-season without throwing', async () => {
    get.mockResolvedValue({ success: false, error: 'No active season' });

    await expect(fetchMyLeagueCard()).resolves.toEqual({
      kind: 'no-active-season',
      message: 'No active season',
    });
  });

  /**
   * A player with no results is a real, successful answer: zero points and a
   * null rank. It must not be confused with an error, and an error must not be
   * rendered as "you have no results".
   */
  it('parses a signed-in player who has no results yet', async () => {
    get.mockResolvedValue({
      success: true,
      data: { season, points: 0, global_rank: null, rank_change: null, results: [] },
    });

    const outcome = await fetchMyLeagueCard();

    if (outcome.kind !== 'ok') throw new Error('expected an ok result');
    expect(outcome.data.points).toBe(0);
    expect(outcome.data.global_rank).toBeNull();
    expect(outcome.data.results).toEqual([]);
  });

  it('rejects a malformed card rather than handing it to a caller', async () => {
    get.mockResolvedValue({ success: true, data: { points: 640, results: [] } });

    await expect(fetchMyLeagueCard()).rejects.toThrow();
  });

  it('propagates a rejection from the shared client', async () => {
    get.mockRejectedValue({ isUnauthorized: true, status: 401, message: 'Authentication required' });

    await expect(fetchMyLeagueCard()).rejects.toMatchObject({ isUnauthorized: true });
  });
});
