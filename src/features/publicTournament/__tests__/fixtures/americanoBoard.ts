import { PublicBracketSchema, type PublicBracketData } from '../../types';

/**
 * An Americano evening shaped exactly like rally-api's JSON (`get_bracket(...).model_dump()`),
 * extra fields included on purpose: the schema must tolerate them. A plain module — importing it
 * registers no tests.
 */

/** A player as `PlayerBrief` serialises one. */
export const rawPlayer = (name: string) => ({
    id: `p-${name}`,
    first_name: name,
    last_name: 'L',
    is_guest: false,
    skill_level: 3.5,
    level_verified: null,
    level_reliability: null,
    mapped_skill_level: 'C',
    skill_tier: 'intermediate',
});

type RawGameOptions = { status?: string; score?: [number, number]; winner?: 'team_a' | 'team_b' | null };

/** One social game as `MatchResponse` serialises it: four players, no registration, no team name. */
export const rawGame = (
    id: string,
    round: number,
    court: number,
    names: [string, string, string, string],
    options: RawGameOptions = {},
) => ({
    id,
    tournament_id: 't-am',
    round_number: round,
    round_name: `Round ${round}`,
    position_in_round: court,
    match_number: (round - 1) * 2 + court,
    match_format: 'tournament_social',
    team_a: { registration_id: null, team_name: null, player_1: rawPlayer(names[0]), player_2: rawPlayer(names[1]), is_lucky_loser: false },
    team_b: { registration_id: null, team_name: null, player_1: rawPlayer(names[2]), player_2: rawPlayer(names[3]), is_lucky_loser: false },
    team_a_placeholder: null,
    team_b_placeholder: null,
    winner_team: options.winner ?? null,
    status: options.status ?? 'scheduled',
    sets: options.score
        ? [{ set_number: 1, team_a_score: options.score[0], team_b_score: options.score[1], is_tiebreak: false }]
        : [],
    scheduled_at: null,
    started_at: null,
    completed_at: null,
    court_name: `Court ${court}`,
    next_match_id: null,
    next_match_slot: null,
    match_label: `Match #${(round - 1) * 2 + court}`,
    is_protected: options.status === 'completed' || options.status === 'walkover',
});

export const rawRow = (
    position: number, name: string, games: number, pf: number, pa: number,
    wins: number, ties: number, losses: number, disqualified = false,
) => ({
    position,
    registration_id: `reg-${name}`,
    player: rawPlayer(name),
    games,
    points_for: pf,
    points_against: pa,
    points_diff: pf - pa,
    wins,
    ties,
    losses,
    is_paused: false,
    is_disqualified: disqualified,
});

/**
 * Nine players, two courts, mid-evening, in rally-api Plan C's shapes. Round 1: a 16–10 win and a
 * 12–12 tie. Round 2: a walkover (status walkover, a winner, no sets) and the game Eden was in,
 * cancelled when Eden was disqualified. Round 3 is the one on court. Eden's row is flagged and
 * numbered last.
 */
export const RAW_BOARD = {
    variant: 'americano',
    games_per_player: 3,
    courts: 2,
    rounds_estimate: 4,
    current_round: 3,
    next_round: null,
    rounds: [
        {
            round_number: 1, round_name: 'Round 1', matches: [
                rawGame('r1c1', 1, 1, ['Noa', 'Ido', 'Dan', 'Gal'], { status: 'completed', score: [16, 10], winner: 'team_a' }),
                rawGame('r1c2', 1, 2, ['Tom', 'Roi', 'Lior', 'Maya'], { status: 'completed', score: [12, 12] }),
            ],
        },
        {
            round_number: 2, round_name: 'Round 2', matches: [
                rawGame('r2c1', 2, 1, ['Noa', 'Tom', 'Ido', 'Lior'], { status: 'walkover', winner: 'team_a' }),
                rawGame('r2c2', 2, 2, ['Eden', 'Gal', 'Roi', 'Maya'], { status: 'cancelled' }),
            ],
        },
        {
            round_number: 3, round_name: 'Round 3', matches: [
                rawGame('r3c1', 3, 1, ['Noa', 'Dan', 'Gal', 'Maya']),
                rawGame('r3c2', 3, 2, ['Ido', 'Roi', 'Tom', 'Lior']),
            ],
        },
    ],
    extras: {},
    resting: {
        '1': [rawPlayer('Eden')],
        '2': [rawPlayer('Dan'), rawPlayer('Gal'), rawPlayer('Roi'), rawPlayer('Maya')],
        '3': [],
    },
    owed: [],
    needs_rebuild_from: null,
    standings: [
        rawRow(1, 'Noa', 2, 16, 10, 2, 0, 0),
        rawRow(2, 'Ido', 2, 16, 10, 1, 0, 1),
        rawRow(3, 'Tom', 2, 12, 12, 1, 1, 0),
        rawRow(4, 'Roi', 1, 12, 12, 0, 1, 0),
        rawRow(5, 'Maya', 1, 12, 12, 0, 1, 0),
        rawRow(6, 'Lior', 2, 12, 12, 0, 1, 1),
        rawRow(7, 'Dan', 1, 10, 16, 0, 0, 1),
        rawRow(8, 'Gal', 1, 10, 16, 0, 0, 1),
        rawRow(9, 'Eden', 0, 0, 0, 0, 0, 0, true),
    ],
    is_finished: false,
};

type EveningOptions = {
    rounds: number;
    courts: number;
    /** Each game's status; a `completed` game is a 16–8 win for team A. */
    status: (round: number, court: number) => string;
    /** The last round is the drawn final round, named "Final". */
    withFinal?: boolean;
};

/**
 * A bigger evening than RAW_BOARD: `rounds` rounds on `courts` courts. Players are P1…P(4×courts),
 * seated in order on every round, so the final's court k holds P(4k-3)…P(4k) — the places the API
 * seats there (4k-3 & 4k against 4k-2 & 4k-1).
 */
export function bigEvening({ rounds, courts, status, withFinal = false }: EveningOptions) {
    const name = (round: number) => (withFinal && round === rounds ? 'Final' : `Round ${round}`);
    const game = (round: number, court: number) => {
        const s = status(round, court);
        const names = [1, 2, 3, 4].map(k => `P${4 * (court - 1) + k}`) as [string, string, string, string];
        const options: RawGameOptions = s === 'completed' ? { status: s, score: [16, 8], winner: 'team_a' } : { status: s };
        return { ...rawGame(`g${round}-${court}`, round, court, names, options), round_name: name(round) };
    };
    return {
        ...RAW_BOARD,
        courts,
        current_round: null,
        rounds: Array.from({ length: rounds }, (_, r) => ({
            round_number: r + 1,
            round_name: name(r + 1),
            matches: Array.from({ length: courts }, (_, c) => game(r + 1, c + 1)),
        })),
        resting: {},
        standings: Array.from({ length: 4 * courts }, (_, i) => rawRow(i + 1, `P${i + 1}`, 1, 16, 8, 1, 0, 0)),
        final_round_enabled: withFinal,
        final_round_number: withFinal ? rounds : null,
    };
}

/** The public-bracket envelope around an `americano` block, parsed exactly as the page receives it. */
export function americanoBracket(board: unknown = RAW_BOARD): PublicBracketData {
    return PublicBracketSchema.parse({
        tournament_id: 't-am',
        tournament_name: 'Tuesday Americano',
        structure: 'americano',
        club_name: null,
        club_logo_url: null,
        sponsors: [],
        videos: [],
        groups: null,
        knockout_rounds: null,
        plate_rounds: null,
        league_standings: null,
        third_place_match: null,
        americano: board,
    });
}

/**
 * `RAW_BOARD`'s evening played out, then the final round by ranking (rally-api 2026-10-03):
 * round 3 scored and round 4 — named "Final" — on court. Eight eligible players (Eden is
 * disqualified), so two courts and nobody resting.
 */
export const FINAL_BOARD = {
    ...RAW_BOARD,
    final_round_number: 4,
    current_round: 4,
    rounds: [
        ...RAW_BOARD.rounds.slice(0, 2),
        {
            round_number: 3, round_name: 'Round 3', matches: [
                rawGame('r3c1', 3, 1, ['Noa', 'Dan', 'Gal', 'Maya'], { status: 'completed', score: [14, 9], winner: 'team_a' }),
                rawGame('r3c2', 3, 2, ['Ido', 'Roi', 'Tom', 'Lior'], { status: 'completed', score: [11, 11] }),
            ],
        },
        {
            round_number: 4, round_name: 'Final', matches: [
                rawGame('f1', 4, 1, ['Noa', 'Roi', 'Ido', 'Tom']),
                rawGame('f2', 4, 2, ['Maya', 'Gal', 'Lior', 'Dan']),
            ],
        },
    ],
    resting: { ...RAW_BOARD.resting, '3': [], '4': [] },
};
