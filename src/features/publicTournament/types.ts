import { z } from 'zod';

export const BRACKET_THEMES = ['dark', 'light', 'gradient'] as const;
export type BracketTheme = (typeof BRACKET_THEMES)[number];

export const PublicPlayerSchema = z.object({
    id: z.string().catch(''),
    first_name: z.string().nullish().catch(null),
    last_name: z.string().nullish().catch(null),
    skill_level: z.number().nullish().catch(null),
    is_guest: z.boolean().nullish().catch(null),
});
export type PublicPlayer = z.infer<typeof PublicPlayerSchema>;

export const PublicTeamSchema = z.object({
    team_name: z.string().nullish().catch(null),
    player_1: PublicPlayerSchema.nullish().catch(null),
    player_2: PublicPlayerSchema.nullish().catch(null),
    /** Promoted into a main-knockout bye slot by best-loser ranking. Main knockout only. */
    is_lucky_loser: z.boolean().nullish().catch(null),
});
export type PublicTeam = z.infer<typeof PublicTeamSchema>;

export const SetScoreSchema = z.object({
    team_a_score: z.number().catch(0),
    team_b_score: z.number().catch(0),
    is_tiebreak: z.boolean().nullish().catch(null),
});
export type SetScore = z.infer<typeof SetScoreSchema>;

export const PublicMatchSchema = z.object({
    id: z.string(),
    match_label: z.union([z.string(), z.number()]).nullish().catch(null),
    /** Round-robin round within a group (1-based). Knockout matches use 100+ offsets. */
    round_number: z.number().nullish().catch(null),
    team_a: PublicTeamSchema.nullish().catch(null),
    team_b: PublicTeamSchema.nullish().catch(null),
    sets: z.array(SetScoreSchema).catch([]),
    winner_team: z.enum(['team_a', 'team_b']).nullish().catch(null),
    next_match_id: z.string().nullish().catch(null),
    status: z.string().catch('scheduled'),
    court_name: z.string().nullish().catch(null),
    scheduled_at: z.string().nullish().catch(null),
});
export type PublicMatch = z.infer<typeof PublicMatchSchema>;

export const PublicRoundSchema = z.object({
    round_number: z.number(),
    round_name: z.string().catch(''),
    matches: z.array(PublicMatchSchema).catch([]),
});
export type PublicRound = z.infer<typeof PublicRoundSchema>;

export const PublicStandingSchema = z.object({
    position: z.number(),
    /**
     * Removed from the competition mid-tournament. The row is still sent so a
     * group that loses a team stays legible, but its record was voided, so the
     * stats below are all zero and must render as dashes rather than numbers
     * that would contradict the rows above.
     *
     * `.catch(false)` is load-bearing: `standings` is parsed with
     * `z.array(...).catch([])`, so a single element failing validation blanks
     * the entire group's table — silently.
     */
    is_disqualified: z.boolean().catch(false),
    player_name: z.string().nullish().catch(null),
    team_name: z.string().nullish().catch(null),
    player_1: PublicPlayerSchema.nullish().catch(null),
    player_2: PublicPlayerSchema.nullish().catch(null),
    matches_played: z.number().nullish().catch(null),
    wins: z.number().catch(0),
    losses: z.number().catch(0),
    sets_won: z.number().catch(0),
    sets_lost: z.number().catch(0),
    games_won: z.number().catch(0),
    games_lost: z.number().catch(0),
    points: z.number().nullish().catch(null),
});
export type PublicStanding = z.infer<typeof PublicStandingSchema>;

export const PublicGroupSchema = z.object({
    group_name: z.string().catch(''),
    matches: z.array(PublicMatchSchema).catch([]),
    standings: z.array(PublicStandingSchema).catch([]),
});
export type PublicGroup = z.infer<typeof PublicGroupSchema>;

export const PublicSponsorSchema = z.object({
    name: z.string().catch(''),
    image_url: z.string().nullish().catch(null),
    website_url: z.string().nullish().catch(null),
});
export type PublicSponsor = z.infer<typeof PublicSponsorSchema>;

export const PublicVideoSchema = z.object({
    id: z.string().catch(''),
    label: z.string().nullish().catch(null),
    /** User-facing host name ("YouTube"). Display only — never branch on it. */
    provider: z.string().catch(''),
    /** Server-rendered, already provider-correct. The page puts this in an iframe as-is. */
    embed_url: z.string().catch(''),
    /** Original link, for the "open on provider" fallback when an embed is blocked. */
    url: z.string().nullish().catch(null),
    display_order: z.number().nullish().catch(null),
});
export type PublicVideo = z.infer<typeof PublicVideoSchema>;

export const PublicBracketSchema = z.object({
    tournament_id: z.string(),
    tournament_name: z.string().catch(''),
    structure: z.string().catch('single_elimination'),
    club_name: z.string().nullish().catch(null),
    club_logo_url: z.string().nullish().catch(null),
    sponsors: z.array(PublicSponsorSchema).catch([]),
    videos: z.array(PublicVideoSchema).catch([]),
    knockout_rounds: z.array(PublicRoundSchema).catch([]),
    plate_rounds: z.array(PublicRoundSchema).catch([]),
    league_standings: z.array(PublicStandingSchema).nullish().catch(null),
    groups: z.array(PublicGroupSchema).nullish().catch(null),
    third_place_match: PublicMatchSchema.nullish().catch(null),
});
export type PublicBracketData = z.infer<typeof PublicBracketSchema>;
