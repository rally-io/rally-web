import { describe, expect, it } from 'vitest';

import raw from './fixtures/liveBoard.json';
import { PublicBracketSchema, type PublicBracketData } from '../types';
import { getFinalRoundNumber, isAmericanoLive, restingNames, toLiveBoard } from '../americano';
import { activeRoundIndex, detectDir, upNextMatches } from '../utils';
import { FINAL_BOARD, RAW_BOARD, americanoBracket, rawGame } from './fixtures/americanoBoard';

const league: PublicBracketData = {
    tournament_id: 'l', tournament_name: 'Sunday League', structure: 'round_robin_league',
    club_name: null, club_logo_url: null, sponsors: [], videos: [],
    knockout_rounds: [], plate_rounds: [], league_standings: [], groups: null, third_place_match: null,
};

describe('toLiveBoard: every other structure passes through untouched', () => {
    it('returns the very same object for a group+knockout board, a league and a knockout', () => {
        const groupsBoard = PublicBracketSchema.parse(raw);
        expect(toLiveBoard(groupsBoard)).toBe(groupsBoard);
        expect(toLiveBoard(league)).toBe(league);
        const knockout = { ...league, structure: 'single_elimination' };
        expect(toLiveBoard(knockout)).toBe(knockout);
    });

    it('leaves an Americano with no block alone — the page shows its empty board', () => {
        const empty = americanoBracket(null);
        expect(toLiveBoard(empty)).toBe(empty);
    });
});

describe('toLiveBoard: an Americano in the league layout', () => {
    const board = toLiveBoard(americanoBracket());

    it('puts the rounds where a league keeps them, without the cancelled game', () => {
        expect(board.knockout_rounds.map(r => r.round_number)).toEqual([1, 2, 3]);
        expect(board.knockout_rounds[1].matches.map(m => m.id)).toEqual(['r2c1']);
        expect(board.knockout_rounds.flatMap(r => r.matches).some(m => m.status === 'cancelled')).toBe(false);
    });

    it('drops a round whose only game was cancelled', () => {
        const allCancelled = {
            ...RAW_BOARD,
            rounds: [...RAW_BOARD.rounds, {
                round_number: 4, round_name: 'Round 4',
                matches: [rawGame('r4c1', 4, 1, ['Eden', 'Noa', 'Ido', 'Tom'], { status: 'cancelled' })],
            }],
        };
        expect(toLiveBoard(americanoBracket(allCancelled)).knockout_rounds.map(r => r.round_number)).toEqual([1, 2, 3]);
    });

    it('opens the round stepper on the round on court, not on the round with the cancelled game', () => {
        // activeRoundIndex reads "unfinished" as anything not completed/walkover — a cancelled game
        // left in round 2 would pin the phone to round 2 for the rest of the evening.
        expect(activeRoundIndex(board.knockout_rounds)).toBe(2);
    });

    it('queues only playable games on the TV court rail', () => {
        expect(upNextMatches(board).map(m => m.id)).toEqual(['r3c1', 'r3c2']);
    });

    it('fills the league table, one player per row, in the API\'s order', () => {
        const rows = board.league_standings ?? [];
        expect(rows.map(r => r.player_1?.first_name)).toEqual(['Noa', 'Ido', 'Tom', 'Roi', 'Maya', 'Lior', 'Dan', 'Gal', 'Eden']);
        expect(rows[0]).toMatchObject({
            position: 1, wins: 2, ties: 0, losses: 0, points: 16, points_diff: 6, matches_played: 2,
            player_2: null, team_name: null, is_disqualified: false,
        });
        expect(rows[8]).toMatchObject({ position: 9, is_disqualified: true });
    });

    it('keeps the americano block for what only it has', () => {
        expect(board.americano?.resting['2']).toHaveLength(4);
    });

    it('lets detectDir read a Hebrew name off a game', () => {
        const hebrew = {
            ...RAW_BOARD,
            rounds: [{ round_number: 1, round_name: 'Round 1', matches: [rawGame('h', 1, 1, ['נועה', 'עידו', 'דן', 'גל'])] }],
        };
        expect(detectDir(toLiveBoard(americanoBracket(hebrew)))).toBe('rtl');
    });
});

describe('toLiveBoard: an Americano before its schedule exists', () => {
    // Production state on 2026-10-02: an Americano open for registration, schedule generated on
    // the evening. A league before its draw has no rounds and no table (rally-api builds the table
    // from matches), so the page shows its empty board; an Americano must land in the same state.
    const noGames = { ...RAW_BOARD, rounds: [], resting: {}, current_round: null };

    it('has no rounds and no table even with players registered', () => {
        const board = toLiveBoard(americanoBracket(noGames));
        expect(board.americano?.standings).toHaveLength(9);
        expect(board.knockout_rounds).toEqual([]);
        expect(board.league_standings).toEqual([]);
    });

    it('has no rounds and no table with nobody registered yet', () => {
        const board = toLiveBoard(americanoBracket({ ...noGames, standings: [] }));
        expect(board.knockout_rounds).toEqual([]);
        expect(board.league_standings).toEqual([]);
    });

    it('treats a schedule whose every game was cancelled the same way', () => {
        const cancelledOnly = {
            ...noGames,
            rounds: [{ round_number: 1, round_name: 'Round 1', matches: [rawGame('c1', 1, 1, ['Noa', 'Ido', 'Dan', 'Gal'], { status: 'cancelled' })] }],
        };
        const board = toLiveBoard(americanoBracket(cancelledOnly));
        expect(board.knockout_rounds).toEqual([]);
        expect(board.league_standings).toEqual([]);
    });
});

describe('restingNames', () => {
    const board = americanoBracket().americano;

    it('names who sits a round out, in the API\'s order', () => {
        expect(restingNames(board, 2)).toBe('Dan L, Gal L, Roi L, Maya L');
        expect(restingNames(board, 1)).toBe('Eden L');
    });

    it('is empty when nobody rests, for an unknown round, and with no board', () => {
        expect(restingNames(board, 3)).toBe('');
        expect(restingNames(board, 9)).toBe('');
        expect(restingNames(null, 1)).toBe('');
    });
});

describe('isAmericanoLive / getFinalRoundNumber', () => {
    // Reuses the module-level `league` fixture above (round_robin_league, no games) — a
    // non-Americano structure must never be reported as live.
    it('isAmericanoLive is false with no bracket, a non-Americano structure, or an Americano with no schedule yet', () => {
        expect(isAmericanoLive(null)).toBe(false);
        expect(isAmericanoLive(league)).toBe(false);
        expect(isAmericanoLive(toLiveBoard(americanoBracket({ ...RAW_BOARD, rounds: [], resting: {} })))).toBe(false);
    });

    it('isAmericanoLive is true once the schedule is out', () => {
        expect(isAmericanoLive(toLiveBoard(americanoBracket()))).toBe(true);
    });

    it('getFinalRoundNumber is null before the schedule, and before the final is drawn', () => {
        expect(getFinalRoundNumber(null)).toBeNull();
        expect(getFinalRoundNumber(league)).toBeNull();
        expect(getFinalRoundNumber(toLiveBoard(americanoBracket()))).toBeNull();
    });

    it('getFinalRoundNumber is the round number once drawn and actually on the board', () => {
        expect(getFinalRoundNumber(toLiveBoard(americanoBracket(FINAL_BOARD)))).toBe(4);
    });

    it('getFinalRoundNumber is null when `final_round_number` is set but every one of its games was cancelled', () => {
        // `final_round_number` stays set (toLiveBoard passes the americano block through unchanged), but
        // `playableRounds` drops the round itself once every one of its matches is cancelled — a
        // fully-disqualified final is the real case this guards against.
        const cancelledFinal = {
            ...FINAL_BOARD,
            rounds: FINAL_BOARD.rounds.map(r => (r.round_number === 4
                ? { ...r, matches: r.matches.map(m => ({ ...m, status: 'cancelled' })) }
                : r)),
        };
        expect(getFinalRoundNumber(toLiveBoard(americanoBracket(cancelledFinal)))).toBeNull();
    });
});
