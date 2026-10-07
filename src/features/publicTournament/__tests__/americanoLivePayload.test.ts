import { describe, expect, it } from 'vitest';

import raw from './fixtures/americanoLiveBoard.json';
import { PublicBracketSchema } from '../types';
import { toLiveBoard } from '../americano';
import { activeRoundIndex, isTieMatch } from '../utils';

/**
 * A REAL Americano board: the dev tournament "E2E Americano" (3c890766-…, share token CVRHBDpE),
 * captured from `/public/tournaments/{token}/bracket` once the evening was complete. The players are
 * the dev E2E accounts, so no name needed changing; only `club_logo_url` was nulled.
 *
 * Same reason as liveBoard.json: hand-written fixtures are shaped like assumptions. This one pins
 * the schema and `toLiveBoard` to what rally-api actually sends. Refresh it from that endpoint if
 * the API's shape changes; fix the schema, never this file.
 */
const parsed = PublicBracketSchema.parse(raw);
const board = toLiveBoard(parsed);

describe('the live page against a real captured Americano payload', () => {
    it('is the shape it was captured for', () => {
        // Guards the fixture itself: without a tie and a resting round, the checks below go quiet.
        expect(parsed.structure).toBe('americano');
        expect(parsed.americano).not.toBeNull();
        const games = board.knockout_rounds.flatMap(r => r.matches);
        expect(games.length).toBeGreaterThan(0);
        expect(games.some(isTieMatch)).toBe(true);
        expect(Object.values(parsed.americano!.resting).some(list => list.length > 0)).toBe(true);
    });

    it('puts every round in the league layout, each game with four players and one points set', () => {
        expect(board.knockout_rounds.map(r => r.round_number)).toEqual(parsed.americano!.rounds.map(r => r.round_number));
        board.knockout_rounds.flatMap(r => r.matches).forEach(m => {
            expect(m.team_a?.player_1 && m.team_a?.player_2 && m.team_b?.player_1 && m.team_b?.player_2).toBeTruthy();
            expect(m.sets.length).toBeLessThanOrEqual(1);
        });
        // A finished evening: the stepper opens on the last round.
        expect(activeRoundIndex(board.knockout_rounds)).toBe(board.knockout_rounds.length - 1);
    });

    it('was captured before the final round existed, and still parses: seats read, no final, no projected courts', () => {
        // The capture predates rally-api's final_round_number and projected_final_court — it is the
        // "older API" every new field has to survive. Its games already carry position_in_round.
        expect(parsed.americano!.final_round_number).toBeNull();
        expect(parsed.americano!.standings.every(s => s.projected_final_court === null)).toBe(true);
        expect(board.knockout_rounds[0].matches.map(m => m.position_in_round)).toEqual([1, 2]);
    });

    it('fills the table one player per row, numbered in order and ranked by points', () => {
        const rows = board.league_standings ?? [];
        expect(rows).toHaveLength(parsed.americano!.standings.length);
        rows.forEach((row, i) => {
            expect(row.position).toBe(i + 1);
            expect(row.player_1).not.toBeNull();
            expect(row.player_2).toBeNull();
        });
        const points = rows.filter(r => !r.is_disqualified).map(r => r.points ?? 0);
        expect(points).toEqual([...points].sort((a, b) => b - a));
    });
});
