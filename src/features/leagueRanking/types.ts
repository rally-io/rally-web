import { z } from 'zod';

/**
 * Response shapes for the Rally league surfaces, parsed at the boundary.
 *
 * THE INVARIANT: `rank` is server-authoritative and ties are real. The API runs
 * competition ranking over the whole frame and then slices the page, so a board
 * legitimately reads `1, 1, 3` and page two legitimately starts at `51`. Nothing
 * in this file may sort, dedupe, renumber or otherwise `.transform()` `rows` —
 * doing so would silently replace the server's answer with a wrong one that
 * looks right. `__tests__/types.test.ts` pins this.
 *
 * Strictness is deliberately uneven, and the split is by consequence:
 *   - STRUCTURE is strict (`rank`, `points`, `player_id`, `rows`, `season`). If
 *     the contract moves, one place fails loudly.
 *   - DECORATION degrades (`skill_tier`, `band_code` fall back to null). A tier
 *     added server-side must not blank the public board for logged-out visitors,
 *     who are this page's primary audience.
 *
 * Timestamps stay plain `z.string()` on purpose: `.datetime()` in Zod 3 rejects
 * offset forms, and the API's exact serialisation is not worth betting the page on.
 */

export const SKILL_TIERS = ['bronze', 'silver', 'gold'] as const;
export type SkillTier = (typeof SKILL_TIERS)[number];

export const BAND_CODES = ['A', 'B', 'C', 'D'] as const;
export type BandCode = (typeof BAND_CODES)[number];

/**
 * Frames the PUBLIC surface accepts. `circle` is absent by design, not by
 * omission: a circle is "players the viewer has faced", and there is no viewer
 * on a logged-out page. The API answers `frame=circle` with a 400.
 */
export const PUBLIC_FRAMES = ['global', 'band'] as const;
export type PublicFrame = (typeof PUBLIC_FRAMES)[number];

/** One calendar quarter of the rolling window (Asia/Jerusalem). `drops_at` is the
 *  instant the quarter leaves the window — midnight Israel time, sent in UTC. */
export const LeagueQuarterSchema = z.object({
  key: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  drops_at: z.string(),
});
export type LeagueQuarter = z.infer<typeof LeagueQuarterSchema>;

export const MOVEMENT_REASONS = ['played', 'level_changed', 'quarter_ended'] as const;
export type MovementReason = (typeof MOVEMENT_REASONS)[number];

export const LeagueSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  starts_at: z.string(),
  /** Wire compatibility: a rolling window has no end; the API sends the window's end. */
  ends_at: z.string(),
  /** Legacy best-N column, still on the wire. Unused since v2 — nothing reads it. */
  counting_results: z.number(),
  is_active: z.boolean(),
  // The window block is DECORATION: an older API without it must not blank the page.
  window_quarters: z.number().nullish().catch(null),
  slots_per_quarter: z.number().nullish().catch(null),
  window_start: z.string().nullish().catch(null),
  window_end: z.string().nullish().catch(null),
  quarters: z.array(LeagueQuarterSchema).catch([]),
});
export type LeagueSeason = z.infer<typeof LeagueSeasonSchema>;

export const StandingsRowSchema = z.object({
  /** Decided by the server over the whole frame. Never the row's index. */
  rank: z.number(),
  player_id: z.string(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  avatar_url: z.string().nullish(),
  /** Cut-out avatar; preferred over `avatar_url` when present. */
  avatar_clean_url: z.string().nullish(),
  skill_tier: z.enum(SKILL_TIERS).nullish().catch(null),
  band_code: z.enum(BAND_CODES).nullish().catch(null),
  /** Picks the generic stand-in portrait when no photo was uploaded. */
  gender: z.string().nullish().catch(null),
  points: z.number(),
  counted_results: z.number(),
  /** Places gained (+) or lost (-) since the last snapshot; null when unknown. */
  rank_change: z.number().nullish(),
  /** Fewer than 4 rated matches: listed after the settled players of the level. */
  is_provisional: z.boolean().catch(false),
  /** Why the arrow points where it does; null for a new player or an unknown reason. */
  movement_reason: z.enum(MOVEMENT_REASONS).nullish().catch(null),
});
export type StandingsRow = z.infer<typeof StandingsRowSchema>;

export const PublicStandingsSchema = z.object({
  season: LeagueSeasonSchema,
  /** Echoes the requested frame. */
  frame: z.string(),
  /** Size of the whole frame, not of this page. */
  total_players: z.number(),
  rows: z.array(StandingsRowSchema),
  /**
   * Always null here. The field exists only so the public payload stays
   * shape-compatible with the consumer one; typing it `null` stops a component
   * growing a branch that can never run.
   */
  me: z.null(),
});
export type PublicStandings = z.infer<typeof PublicStandingsSchema>;

/**
 * The consumer standings payload. Identical to the public one except that `me` is a
 * real row rather than always null.
 *
 * Only the `circle` frame needs this. A circle is the set of players the viewer has
 * faced, so it cannot be served without a viewer, and the public endpoint rejects it
 * with a 400. `me` stays optional: a signed-in visitor with no results in the season
 * has no row, which is a successful answer rather than an error.
 */
export const MyStandingsSchema = PublicStandingsSchema.extend({
  me: StandingsRowSchema.nullish(),
});
export type MyStandings = z.infer<typeof MyStandingsSchema>;

export const PublicSeasonListSchema = z.array(LeagueSeasonSchema);

export const LeagueResultSchema = z.object({
  tournament_id: z.string(),
  tournament_name: z.string().nullish(),
  placement_bucket: z.string(),
  final_position: z.number().nullish(),
  band_code: z.enum(BAND_CODES).nullish().catch(null),
  draw_size: z.number(),
  points: z.number(),
  /**
   * Sent by the API; always true unless the per-quarter cap knob is set. Not
   * read by the UI.
   */
  counted: z.boolean(),
  awarded_at: z.string().nullish(),
  quarter: z.string().nullish().catch(null),
});
export type LeagueResult = z.infer<typeof LeagueResultSchema>;

/** One quarter of a player's window: their results in it, the total, and what was on
 *  offer in the events they entered (never below `points`). */
export const LeagueQuarterBlockSchema = LeagueQuarterSchema.extend({
  points: z.number(),
  available: z.number(),
  results: z.array(LeagueResultSchema),
});
export type LeagueQuarterBlock = z.infer<typeof LeagueQuarterBlockSchema>;

/**
 * The v2 context both the card and the player page carry. All decoration.
 *
 * `.nullable()` rather than `.nullish()` here on purpose: in Zod 3, `.nullish().catch(x)`
 * never fires on a wholly absent key (the `.optional()` half already resolves it to
 * `undefined` without error, so `.catch()` never sees a failure to catch), so an older
 * API that omits this whole block would leave these keys `undefined`. `.nullable()`
 * makes the key required-but-nullable, so a missing key is actually parsed against
 * `null | number`, fails, and `.catch(null)` degrades it — giving every consumer a
 * single reliable `=== null` check regardless of whether the key was absent or `null`.
 */
const PlayerContextFields = {
  movement_reason: z.enum(MOVEMENT_REASONS).nullable().catch(null),
  band_code: z.enum(BAND_CODES).nullable().catch(null),
  is_provisional: z.boolean().catch(false),
  level_rank: z.number().nullable().catch(null),
  gap_to_above: z.number().nullable().catch(null),
  career_points: z.number().catch(0),
  quarters: z.array(LeagueQuarterBlockSchema).catch([]),
};

/**
 * Aggregate career stats on the public profile. DECORATION, not structure:
 * `.catch(null)` because an api that predates the block (or a malformed one)
 * must degrade to "no stats section", never blank the whole player page.
 */
export const PublicPlayerStatsSchema = z
  .object({
    matches_played: z.number(),
    matches_won: z.number(),
    matches_lost: z.number(),
    win_rate: z.number(),
    current_streak: z.number(),
    best_streak: z.number(),
    tournaments_played: z.number(),
    tournaments_won: z.number(),
  })
  .nullish()
  .catch(null);
export type PublicPlayerStats = NonNullable<z.infer<typeof PublicPlayerStatsSchema>>;

/** `GET /public/league/player/{id}` — the shareable per-player season page. */
export const PublicPlayerSeasonSchema = z.object({
  season: LeagueSeasonSchema,
  player_id: z.string(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  avatar_url: z.string().nullish(),
  avatar_clean_url: z.string().nullish(),
  /** Colours the profile's shield card — same tier every standings row shows. */
  skill_tier: z.enum(SKILL_TIERS).nullish().catch(null),
  /** Picks the generic stand-in portrait when no photo was uploaded. */
  gender: z.string().nullish().catch(null),
  points: z.number(),
  global_rank: z.number().nullish(),
  rank_change: z.number().nullish(),
  ...PlayerContextFields,
  results: z.array(LeagueResultSchema),
  stats: PublicPlayerStatsSchema,
});
export type PublicPlayerSeason = z.infer<typeof PublicPlayerSeasonSchema>;

/** One person on a match row. `player_id` is null for guests — no profile to link. */
export const PublicMatchPlayerSchema = z.object({
  player_id: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  avatar_url: z.string().nullish(),
  avatar_clean_url: z.string().nullish(),
});
export type PublicMatchPlayer = z.infer<typeof PublicMatchPlayerSchema>;

/** One set, already oriented to the profiled player by the API. */
export const PublicMatchSetSchema = z.object({
  set_number: z.number(),
  my_score: z.number(),
  opponent_score: z.number(),
  is_tiebreak: z.boolean(),
});
export type PublicMatchSet = z.infer<typeof PublicMatchSetSchema>;

/**
 * One completed match, oriented to the profiled player.
 *
 * `won` null with empty `sets` is a walkover nobody scored — rendered as a
 * technical result, never as a loss.
 */
export const PublicPlayerMatchSchema = z.object({
  match_id: z.string(),
  round_name: z.string().nullish(),
  completed_at: z.string().nullish(),
  won: z.boolean().nullish(),
  partner: PublicMatchPlayerSchema.nullish(),
  opponents: z.array(PublicMatchPlayerSchema),
  sets: z.array(PublicMatchSetSchema),
});
export type PublicPlayerMatch = z.infer<typeof PublicPlayerMatchSchema>;

/** `GET /public/league/player/{id}/matches?tournament_id=` — one result row's matches. */
export const PublicPlayerMatchesSchema = z.object({
  tournament_id: z.string(),
  matches: z.array(PublicPlayerMatchSchema),
});
export type PublicPlayerMatches = z.infer<typeof PublicPlayerMatchesSchema>;

/**
 * `GET /rally/v1/league/me` — the signed-in personal card.
 *
 * NOT the public player-season shape: the consumer payload carries no
 * `player_id`, name or avatar, because the caller already knows who they are.
 */
export const MyLeagueCardSchema = z.object({
  season: LeagueSeasonSchema,
  points: z.number(),
  global_rank: z.number().nullish(),
  rank_change: z.number().nullish(),
  ...PlayerContextFields,
  results: z.array(LeagueResultSchema),
});
export type MyLeagueCard = z.infer<typeof MyLeagueCardSchema>;

/** The `{ success, data, error, meta }` envelope. `error` is a plain string. */
export const ApiEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown().nullish(),
  error: z.string().nullish(),
  meta: z.record(z.unknown()).nullish(),
});
export type ApiEnvelope = z.infer<typeof ApiEnvelopeSchema>;

/**
 * "There is no active season" is a valid answer to a valid request, not a
 * failure — the API says so with HTTP 200 and `success: false`. Keeping it in
 * the data channel lets a caller tell it apart from a real error AND from an
 * empty table, which would wrongly claim "nobody is ranked".
 */
export type LeagueFetch<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'no-active-season'; message: string };
