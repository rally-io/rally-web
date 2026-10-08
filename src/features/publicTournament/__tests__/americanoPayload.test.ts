import { describe, expect, it } from 'vitest';

import raw from './fixtures/liveBoard.json';
import { PublicBracketSchema } from '../types';
import { toLiveBoard } from '../americano';
import { FINAL_BOARD, RAW_BOARD, americanoBracket } from './fixtures/americanoBoard';

describe('the americano block of the public bracket', () => {
    it('parses a well-formed board', () => {
        const board = americanoBracket().americano!;
        expect(board.rounds.map(r => r.round_number)).toEqual([1, 2, 3]);
        expect(board.rounds[0].matches[1].sets[0]).toMatchObject({ team_a_score: 12, team_b_score: 12 });
        expect(board.rounds[0].matches[1].winner_team).toBeNull();
        // rally-api Plan C walkover: a winner, no sets.
        expect(board.rounds[1].matches[0]).toMatchObject({ status: 'walkover', winner_team: 'team_a', sets: [] });
        expect(board.resting['2'].map(p => p.first_name)).toEqual(['Dan', 'Gal', 'Roi', 'Maya']);
        expect(board.standings).toHaveLength(9);
        expect(board.standings[8]).toMatchObject({ position: 9, is_disqualified: true });
        expect(board.standings[0]).toMatchObject({ points_for: 16, points_diff: 6, wins: 2, ties: 0, losses: 0, games: 2 });
    });

    it('keeps only what the page draws', () => {
        const board = americanoBracket().americano!;
        expect(Object.keys(board).sort()).toEqual(['final_round_enabled', 'final_round_number', 'resting', 'rounds', 'standings']);
    });

    it('reads final_round_enabled as false from an API that does not send it', () => {
        expect('final_round_enabled' in RAW_BOARD).toBe(false);                 // the older API's shape
        expect(americanoBracket(RAW_BOARD).americano!.final_round_enabled).toBe(false);
        expect(americanoBracket({ ...RAW_BOARD, final_round_enabled: true }).americano!.final_round_enabled).toBe(true);
    });

    it('reads a row from an API build before Plan C as not disqualified', () => {
        const rows = RAW_BOARD.standings.map(({ is_disqualified: _drop, ...row }) => row);
        const board = americanoBracket({ ...RAW_BOARD, standings: rows }).americano!;
        expect(board.standings.every(s => s.is_disqualified === false)).toBe(true);
    });

    it('is absent for every other structure', () => {
        expect(PublicBracketSchema.parse({ tournament_id: 't', structure: 'single_elimination' }).americano ?? null).toBeNull();
        expect(PublicBracketSchema.parse(raw).americano ?? null).toBeNull();
    });

    it('a malformed block degrades to null and leaves the rest of the page standing', () => {
        const parsed = americanoBracket('garbage');
        expect(parsed.americano).toBeNull();
        expect(parsed.tournament_name).toBe('Tuesday Americano');
    });

    it('one malformed standings row degrades that row, not the table', () => {
        const rows = [{ ...RAW_BOARD.standings[0], points_for: 'lots' }, ...RAW_BOARD.standings.slice(1)];
        const board = americanoBracket({ ...RAW_BOARD, standings: rows }).americano!;
        expect(board.standings).toHaveLength(9);
        expect(board.standings[0].points_for).toBe(0);
        expect(board.standings[1].points_for).toBe(16);
    });
});

describe('the fields the review fixes read (rally-api 2026-10-04)', () => {
    it('reads the drawn final round from final_round_number', () => {
        expect(americanoBracket(FINAL_BOARD).americano!.final_round_number).toBe(4);
    });

    it('reads each game\'s seat in its round', () => {
        const games = americanoBracket().americano!.rounds[0].matches;
        expect(games.map(m => m.position_in_round)).toEqual([1, 2]);
    });

    it('reads where each player would play the final, and carries it into the table rows', () => {
        const courts = [1, 1, 1, 1, 2, 2, 2, 2, null];
        const standings = RAW_BOARD.standings.map((row, i) => ({ ...row, projected_final_court: courts[i] }));
        const bracket = americanoBracket({ ...RAW_BOARD, final_round_enabled: true, standings });
        expect(bracket.americano!.standings.map(s => s.projected_final_court)).toEqual(courts);
        expect(toLiveBoard(bracket).league_standings!.map(s => s.projected_final_court)).toEqual(courts);
    });

    it('an older API that sends none of them still parses: no final, no seats, no projected courts', () => {
        // RAW_BOARD is that older shape: no final_round_number, no projected_final_court.
        expect('final_round_number' in RAW_BOARD).toBe(false);
        expect('projected_final_court' in RAW_BOARD.standings[0]).toBe(false);
        const seatless = { ...RAW_BOARD.rounds[0].matches[0], position_in_round: undefined };
        const older = { ...RAW_BOARD, final_round: 4, rounds: [{ ...RAW_BOARD.rounds[0], matches: [seatless] }] };
        const board = americanoBracket(older).americano!;
        expect(board).not.toBeNull();
        expect(board.final_round_number).toBeNull();                      // the old key is not read
        expect(board.rounds[0].matches[0].position_in_round ?? null).toBeNull();
        expect(board.standings.every(s => s.projected_final_court === null)).toBe(true);
    });

    it('a malformed value degrades to null and leaves the row standing', () => {
        const standings = [{ ...RAW_BOARD.standings[0], projected_final_court: 'one' }, ...RAW_BOARD.standings.slice(1)];
        const board = americanoBracket({ ...RAW_BOARD, final_round_number: 'four', standings }).americano!;
        expect(board.final_round_number).toBeNull();
        expect(board.standings).toHaveLength(9);
        expect(board.standings[0]).toMatchObject({ projected_final_court: null, points_for: 16 });
    });
});
