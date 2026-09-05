import { describe, expect, it } from 'vitest';
import {
  LeagueResultSchema,
  LeagueSeasonSchema,
  MyLeagueCardSchema,
  PublicPlayerSeasonSchema,
  PublicSeasonListSchema,
  PublicStandingsSchema,
  StandingsRowSchema,
} from '../types';

const season = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Season 1',
  starts_at: '2026-01-01T00:00:00Z',
  ends_at: '2026-12-31T00:00:00Z',
  counting_results: 5,
  is_active: true,
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    rank: 1,
    player_id: '22222222-2222-2222-2222-222222222222',
    first_name: 'Dana',
    last_name: 'Levi',
    avatar_url: 'https://cdn.example/a.jpg',
    avatar_clean_url: 'https://cdn.example/a-clean.png',
    skill_tier: 'gold',
    band_code: 'A',
    points: 900,
    counted_results: 4,
    rank_change: 2,
    ...overrides,
  };
}

function standings(rows: Record<string, unknown>[]) {
  return { season, frame: 'global', total_players: rows.length, rows, me: null };
}

describe('LeagueSeasonSchema', () => {
  it('parses a season header', () => {
    expect(LeagueSeasonSchema.parse(season).counting_results).toBe(5);
  });

  it('parses a list of seasons for the season picker', () => {
    expect(PublicSeasonListSchema.parse([season, season])).toHaveLength(2);
  });
});

describe('PublicStandingsSchema', () => {
  it('parses a valid payload and keeps rank a number', () => {
    const parsed = PublicStandingsSchema.parse(standings([row()]));
    expect(parsed.rows[0].rank).toBe(1);
    expect(typeof parsed.rows[0].rank).toBe('number');
  });

  /**
   * THE test of this file. Ranks are server-authoritative and ties are real:
   * two players on equal points share rank 1 and the next is 3. This asserts
   * the exact array, in order, so it fails under a `.transform()` that sorts,
   * dedupes, or reindexes (`1,2,3`), and under one that drops the duplicate.
   */
  it('preserves tied ranks exactly — 1, 1, 3 stays 1, 1, 3', () => {
    const parsed = PublicStandingsSchema.parse(
      standings([
        row({ rank: 1, player_id: 'p-a', points: 900 }),
        row({ rank: 1, player_id: 'p-b', points: 900 }),
        row({ rank: 3, player_id: 'p-c', points: 500 }),
      ]),
    );

    expect(parsed.rows.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(parsed.rows.map((r) => r.player_id)).toEqual(['p-a', 'p-b', 'p-c']);
    expect(parsed.rows).toHaveLength(3);
  });

  /** A page of results starting mid-table must keep the server's numbers. */
  it('preserves a page that starts at rank 51 (no restart at 1)', () => {
    const parsed = PublicStandingsSchema.parse(
      standings([row({ rank: 51 }), row({ rank: 52 }), row({ rank: 52 })]),
    );
    expect(parsed.rows.map((r) => r.rank)).toEqual([51, 52, 52]);
  });

  it('does not recompute total_players from the page length', () => {
    const parsed = PublicStandingsSchema.parse({
      ...standings([row({ rank: 51 })]),
      total_players: 240,
    });
    expect(parsed.total_players).toBe(240);
  });

  it('types `me` as null — the public surface never has a viewer', () => {
    expect(PublicStandingsSchema.parse(standings([row()])).me).toBeNull();
  });

  it('throws when `rows` is absent, and the issue names the field', () => {
    const bad = { season, frame: 'global', total_players: 0, me: null };

    expect(() => PublicStandingsSchema.parse(bad)).toThrow();

    const result = PublicStandingsSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (result.success) throw new Error('expected a parse failure');
    expect(result.error.issues.some((issue) => issue.path.includes('rows'))).toBe(true);
  });
});

describe('StandingsRowSchema', () => {
  it('parses a row missing first_name — the API types the name optional', () => {
    const { first_name, ...withoutName } = row();
    expect(first_name).toBe('Dana');
    const parsed = StandingsRowSchema.parse(withoutName);
    expect(parsed.first_name ?? null).toBeNull();
    expect(parsed.rank).toBe(1);
  });

  it('accepts an explicitly null name and avatar', () => {
    const parsed = StandingsRowSchema.parse(
      row({ first_name: null, last_name: null, avatar_url: null, avatar_clean_url: null }),
    );
    expect(parsed.first_name).toBeNull();
    expect(parsed.avatar_clean_url).toBeNull();
  });

  /**
   * Pinned decision: an unrecognised tier is a DECORATIVE field, so it degrades
   * to null rather than rejecting the row. A new tier added server-side must not
   * blank the public board for logged-out visitors.
   */
  it('coerces an unknown skill_tier to null instead of rejecting the row', () => {
    const parsed = StandingsRowSchema.parse(row({ skill_tier: 'platinum' }));
    expect(parsed.skill_tier).toBeNull();
    expect(parsed.rank).toBe(1);
    expect(parsed.points).toBe(900);
  });

  it('coerces an unknown band_code to null', () => {
    expect(StandingsRowSchema.parse(row({ band_code: 'Z' })).band_code).toBeNull();
  });

  it('keeps the three known tiers', () => {
    for (const tier of ['bronze', 'silver', 'gold']) {
      expect(StandingsRowSchema.parse(row({ skill_tier: tier })).skill_tier).toBe(tier);
    }
  });

  /** Structure stays strict — a rank that is not a number must fail loudly. */
  it('rejects a non-numeric rank rather than coercing it', () => {
    expect(() => StandingsRowSchema.parse(row({ rank: '1' }))).toThrow();
    expect(() => StandingsRowSchema.parse(row({ rank: null }))).toThrow();
  });

  it('rejects a row with no rank at all', () => {
    const { rank, ...noRank } = row();
    expect(rank).toBe(1);
    expect(() => StandingsRowSchema.parse(noRank)).toThrow();
  });

  it('keeps a negative rank_change (a player who fell)', () => {
    expect(StandingsRowSchema.parse(row({ rank_change: -12 })).rank_change).toBe(-12);
    expect(StandingsRowSchema.parse(row({ rank_change: null })).rank_change).toBeNull();
  });
});

describe('PublicPlayerSeasonSchema', () => {
  const result = {
    tournament_id: '33333333-3333-3333-3333-333333333333',
    tournament_name: 'Tel Aviv Open',
    placement_bucket: 'winner',
    final_position: 1,
    band_code: 'B',
    draw_size: 16,
    points: 250,
    counted: true,
    awarded_at: '2026-03-01T10:00:00Z',
  };

  it('parses the shareable player page, identity fields included', () => {
    const parsed = PublicPlayerSeasonSchema.parse({
      season,
      player_id: 'p-a',
      first_name: 'Dana',
      last_name: 'Levi',
      avatar_url: null,
      avatar_clean_url: null,
      points: 900,
      global_rank: 4,
      rank_change: -2,
      results: [result, { ...result, counted: false, points: 10 }],
    });

    expect(parsed.global_rank).toBe(4);
    expect(parsed.rank_change).toBe(-2);
    expect(parsed.results.map((r) => r.counted)).toEqual([true, false]);
  });

  it('accepts a player with no rank yet', () => {
    const parsed = PublicPlayerSeasonSchema.parse({
      season,
      player_id: 'p-a',
      points: 0,
      global_rank: null,
      rank_change: null,
      results: [],
    });
    expect(parsed.global_rank).toBeNull();
    expect(parsed.results).toEqual([]);
  });
});

describe('MyLeagueCardSchema', () => {
  /**
   * The consumer `/rally/v1/league/me` payload carries NO identity fields — the
   * caller already knows who they are. It is not the public player-season shape.
   */
  it('parses the signed-in card without identity fields', () => {
    const parsed = MyLeagueCardSchema.parse({
      season,
      points: 640,
      global_rank: 12,
      rank_change: 3,
      results: [],
    });
    expect(parsed.points).toBe(640);
    expect(parsed.global_rank).toBe(12);
    expect('player_id' in parsed).toBe(false);
  });

  it('throws when the season block is missing', () => {
    const outcome = MyLeagueCardSchema.safeParse({ points: 0, global_rank: null, results: [] });
    expect(outcome.success).toBe(false);
    if (outcome.success) throw new Error('expected a parse failure');
    expect(outcome.error.issues.some((issue) => issue.path.includes('season'))).toBe(true);
  });
});

describe('v2 fields', () => {
  it('parses the window block on the season and tolerates an older API without it', () => {
    const withWindow = LeagueSeasonSchema.parse({
      ...season,
      window_quarters: 4,
      slots_per_quarter: null,
      window_start: '2025-09-30T21:00:00Z',
      window_end: '2026-09-30T21:00:00Z',
      quarters: [
        { key: '2026-Q3', starts_at: '2026-06-30T21:00:00Z', ends_at: '2026-09-30T21:00:00Z', drops_at: '2027-06-30T21:00:00Z' },
      ],
    });
    expect(withWindow.quarters[0].key).toBe('2026-Q3');
    // Decoration: a season without the block still parses, with an empty window.
    expect(LeagueSeasonSchema.parse(season).quarters).toEqual([]);
  });

  it('reads is_provisional and movement_reason on a row, degrading unknown reasons to null', () => {
    const parsed = StandingsRowSchema.parse(row({ is_provisional: true, movement_reason: 'quarter_ended' }));
    expect(parsed.is_provisional).toBe(true);
    expect(parsed.movement_reason).toBe('quarter_ended');
    expect(StandingsRowSchema.parse(row({ movement_reason: 'something_new' })).movement_reason).toBeNull();
    expect(StandingsRowSchema.parse(row({})).is_provisional).toBe(false);
  });

  it('parses the card context and the quarter blocks, degrading when absent', () => {
    const card = MyLeagueCardSchema.parse({
      season, points: 612, global_rank: 19, rank_change: 3, results: [],
      movement_reason: 'played', band_code: 'B', is_provisional: false,
      level_rank: 7, gap_to_above: 25, career_points: 1140,
      quarters: [{
        key: '2026-Q3', starts_at: '', ends_at: '', drops_at: '2027-06-30T21:00:00Z',
        points: 205, available: 353, results: [],
      }],
    });
    expect(card.level_rank).toBe(7);
    expect(card.career_points).toBe(1140);
    expect(card.quarters[0].available).toBe(353);
    const bare = MyLeagueCardSchema.parse({ season, points: 0, global_rank: null, rank_change: null, results: [] });
    expect(bare.career_points).toBe(0);
    expect(bare.quarters).toEqual([]);
    expect(bare.level_rank).toBeNull();
  });

  it('still parses `counted` on a result — the API sends it, the UI no longer reads it', () => {
    const parsed = LeagueResultSchema.parse({
      tournament_id: 't', placement_bucket: 'first', draw_size: 16, points: 80, counted: true,
    });
    expect(parsed.counted).toBe(true);
  });
});
