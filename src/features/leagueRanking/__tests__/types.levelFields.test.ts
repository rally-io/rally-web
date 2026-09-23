import { describe, expect, it } from 'vitest';
import {
  LeagueResultSchema,
  MyLeagueCardSchema,
  PublicPlayerSeasonSchema,
  StandingsRowSchema,
} from '../types';

/**
 * `level_verified` / `level_reliability` are a THREE-state pair (spec §4): true =
 * verified, false = the server checked and said no, null = the server did not say.
 * Absent and garbage both degrade to `null` — UNKNOWN — never to a false "not
 * verified", and never throw.
 *
 * rally-api ground truth (branch `feat/level-and-ranking`), confirmed by reading the
 * real response schemas:
 *   - PublicStandingsRow / LeagueStandingRow: carry the pair, right after band_code.
 *   - PublicPlayerSeason / LeagueMeOut: carry the pair, right after band_code.
 *   - PublicPlayerResult / LeagueLedgerEntry (the frozen per-tournament award, ->
 *     `LeagueResultSchema` here): do NOT carry the pair. Its `band_code` is the band
 *     as it stood at award time and makes no claim about the player's level today.
 */

const season = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Season 1',
  starts_at: '2026-01-01T00:00:00Z',
  ends_at: '2026-12-31T00:00:00Z',
  counting_results: 5,
  is_active: true,
};

const base = {
  rank: 1,
  player_id: 'p1',
  points: 421,
  // Required by StandingsRowSchema (not in the brief's example fixture) — without it
  // `.parse()` throws on a missing field before the level-pair assertions ever run.
  counted_results: 4,
  skill_tier: 'gold',
  band_code: 'A',
  is_provisional: false,
};

describe('level fields on StandingsRowSchema', () => {
  it('decodes the pair when the API sends it', () => {
    const row = StandingsRowSchema.parse({ ...base, level_verified: true, level_reliability: 91 });
    expect(row.level_verified).toBe(true);
    expect(row.level_reliability).toBe(91);
  });

  it('an older API sending neither field decodes as unknown, not as unverified', () => {
    const row = StandingsRowSchema.parse(base);
    expect(row.level_verified).toBeNull();
    expect(row.level_reliability).toBeNull();
  });

  it('garbage in the field degrades rather than throwing', () => {
    // types.ts header — decoration degrades, it never takes the page down.
    const row = StandingsRowSchema.parse({ ...base, level_verified: 'yes', level_reliability: 'x' });
    expect(row.level_verified).toBeNull();
    expect(row.level_reliability).toBeNull();
  });

  it('an explicit null reliability (a real, sent value) still decodes to null', () => {
    const row = StandingsRowSchema.parse({ ...base, level_verified: false, level_reliability: null });
    expect(row.level_verified).toBe(false);
    expect(row.level_reliability).toBeNull();
  });
});

describe('level fields reach PublicPlayerSeasonSchema via the shared PlayerContextFields block', () => {
  it('decodes the pair when present', () => {
    const parsed = PublicPlayerSeasonSchema.parse({
      season,
      player_id: 'p-a',
      points: 900,
      global_rank: 4,
      rank_change: -2,
      band_code: 'B',
      level_verified: true,
      level_reliability: 77,
      results: [],
    });
    expect(parsed.level_verified).toBe(true);
    expect(parsed.level_reliability).toBe(77);
  });

  it('an older API omitting the pair decodes as unknown', () => {
    const parsed = PublicPlayerSeasonSchema.parse({
      season,
      player_id: 'p-a',
      points: 0,
      global_rank: null,
      rank_change: null,
      results: [],
    });
    expect(parsed.level_verified).toBeNull();
    expect(parsed.level_reliability).toBeNull();
  });
});

describe('level fields reach MyLeagueCardSchema via the shared PlayerContextFields block', () => {
  it('decodes the pair when present', () => {
    const parsed = MyLeagueCardSchema.parse({
      season,
      points: 640,
      global_rank: 12,
      rank_change: 3,
      band_code: 'C',
      level_verified: true,
      level_reliability: 63,
      results: [],
    });
    expect(parsed.level_verified).toBe(true);
    expect(parsed.level_reliability).toBe(63);
  });

  it('an older API omitting the pair decodes as unknown', () => {
    const parsed = MyLeagueCardSchema.parse({ season, points: 0, global_rank: null, rank_change: null, results: [] });
    expect(parsed.level_verified).toBeNull();
    expect(parsed.level_reliability).toBeNull();
  });
});

describe('LeagueResultSchema stays a frozen historical award, without the pair', () => {
  it('does not decode level_verified / level_reliability even if the API sent them', () => {
    // A per-tournament result's band_code is the band as it stood at award time — it
    // makes no claim about the player's level today, so the API deliberately excludes
    // this pair from that record. Pinned here: this must stay stripped, silently, by
    // Zod's default "unknown keys are dropped" behaviour, not by a thrown error.
    const parsed = LeagueResultSchema.parse({
      tournament_id: 't1',
      placement_bucket: 'winner',
      draw_size: 16,
      points: 80,
      counted: true,
      band_code: 'A',
      level_verified: true,
      level_reliability: 90,
    });
    expect('level_verified' in parsed).toBe(false);
    expect('level_reliability' in parsed).toBe(false);
  });
});
