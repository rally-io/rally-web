import { playerFullName } from './utils';
import type { PublicAmericano, PublicAmericanoStanding, PublicBracketData, PublicRound, PublicStanding } from './types';

/**
 * An Americano evening is drawn with the league's layout — owner rule 2026-10-01: one view per
 * concept, not per tournament type.
 *
 * rally-api already serves a round-robin league's rounds in `knockout_rounds` and its table in
 * `league_standings`. This puts an Americano's rounds and table in the same two fields, so every
 * reader of them — the league block, the phone's "Happening now" strip, the TV court rail,
 * `detectDir`, the round stepper — works for an Americano with no branch of its own. The
 * `americano` block stays on the result for what only it has (`resting`).
 *
 * Every other bracket is returned as the SAME object, so nothing here can change a non-Americano
 * page. Runs as `usePublicBracket`'s `select`.
 */
export function toLiveBoard(bracket: PublicBracketData): PublicBracketData {
    if (bracket.structure !== 'americano' || !bracket.americano) return bracket;
    const rounds = playableRounds(bracket.americano.rounds);
    return {
        ...bracket,
        knockout_rounds: rounds,
        // No games yet (the schedule is generated on the evening) means no table either — the
        // page then shows the empty board a league shows before its draw. rally-api builds a
        // league's table from its matches, so a league with no draw sends none; an Americano's
        // block instead lists every confirmed player at zero, in registration order, which is
        // an order no game produced.
        league_standings: rounds.length > 0 ? bracket.americano.standings.map(toStandingRow) : [],
    };
}

/**
 * Cancelled games are left out — disqualifying a player cancels their unplayed games (rally-api
 * Plan C). The API itself treats a cancelled game as off court: its current round skips it, and
 * its `resting` lists the game's other three players for that round, so drawing the card as well
 * would put them on court and on the bench at once. A round left with no game is dropped.
 */
function playableRounds(rounds: PublicRound[]): PublicRound[] {
    return rounds
        .map(r => ({ ...r, matches: r.matches.filter(m => m.status !== 'cancelled') }))
        .filter(r => r.matches.length > 0);
}

/** One player per row; W–T–L, total points and the points diff in the fields points mode reads. */
function toStandingRow(row: PublicAmericanoStanding): PublicStanding {
    return {
        position: row.position,
        is_disqualified: row.is_disqualified,
        player_name: null,
        team_name: null,
        player_1: row.player ?? null,
        player_2: null,
        matches_played: row.games,
        wins: row.wins,
        ties: row.ties,
        losses: row.losses,
        sets_won: 0,
        sets_lost: 0,
        games_won: 0,
        games_lost: 0,
        points: row.points_for,
        points_diff: row.points_diff,
        projected_final_court: row.projected_final_court,
    };
}

/** "Dan L, Gal L" — who sits this round out; '' when nobody does (or there is no board). */
export function restingNames(board: PublicAmericano | null | undefined, roundNumber: number): string {
    return (board?.resting[String(roundNumber)] ?? []).map(playerFullName).filter(Boolean).join(', ');
}

/**
 * An Americano with its schedule out: Standings, Matches and, once drawn, Final as tabs (owner
 * 2026-10-03). Gated on `knockout_rounds` actually holding games — the schedule is generated on
 * the evening, and before that the page shows the empty board a league shows before its draw.
 *
 * Shared by `useViewMode` (rotation/jump) and `PublicTournamentPage` (tabs/content) so the two
 * can't independently drift on what counts as "live" — they used to compute this separately.
 */
export function isAmericanoLive(bracket: PublicBracketData | null | undefined): boolean {
    if (!bracket) return false;
    return bracket.structure === 'americano' && bracket.knockout_rounds.length > 0;
}

/**
 * The drawn final round's number, or null — only when `knockout_rounds` actually contains a round
 * with that number, not merely when `americano.final_round_number` is set.
 *
 * `final_round_number` can stay set after the round itself is gone: `playableRounds` above drops a
 * round once every one of its matches is cancelled, which a final where every player got
 * disqualified can hit. Without this guard, a caller trusting `final_round_number` alone could land on (or rotate to)
 * a 'final' view with no matching round anywhere in `knockout_rounds` — this is what let the hook
 * and the page disagree before both were switched to call this one function.
 */
export function getFinalRoundNumber(bracket: PublicBracketData | null | undefined): number | null {
    if (!bracket || !isAmericanoLive(bracket)) return null;
    const n = bracket.americano?.final_round_number ?? null;
    if (n == null) return null;
    return bracket.knockout_rounds.some(r => r.round_number === n) ? n : null;
}
