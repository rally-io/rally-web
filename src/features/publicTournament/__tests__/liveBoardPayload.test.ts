import { describe, expect, it } from 'vitest';

import raw from './fixtures/liveBoard.json';
import { PublicBracketSchema } from '../types';
import { collectMatches, isDecidedTeam, isFinishedStatus, upNextMatches, UP_NEXT_MAX } from '../utils';

/**
 * A REAL board, captured from the production API and anonymised — only the people's names were
 * changed. Every structural fact is verbatim: 6 groups, a knockout drawn four rounds deep before
 * the groups finished, 51 matches, and the two shapes an undecided slot actually arrives in.
 *
 * It exists because three defects reached a live venue screen in one day, all with one cause: the
 * hand-written fixtures were shaped like my assumptions rather than like the API's output. Each
 * fix closed the shape I had imagined and left the next one open — empty `knockout_rounds`, then
 * null teams, then placeholder team NAMES. A fixture nobody invented cannot drift from the thing
 * it stands for.
 *
 * Refresh it from `/public/tournaments/{token}/bracket` if the API's shape changes.
 */
const bracket = PublicBracketSchema.parse(raw);

describe('the live board against a real captured payload', () => {
    it('is the awkward shape it was captured for', () => {
        // Guards the fixture itself: if a refresh loses these, the assertions below go quiet
        // rather than failing, and the whole file stops testing anything.
        const sides = collectMatches(bracket).flatMap(m => [m.team_a, m.team_b]);
        expect(bracket.groups).toHaveLength(6);
        expect(bracket.knockout_rounds.length).toBeGreaterThan(0);
        expect(sides.filter(t => t === null).length).toBeGreaterThan(0);
        expect(sides.filter(t => t?.team_name && /winner of match/i.test(t.team_name)).length).toBeGreaterThan(0);
    });

    it('queues only matches a spectator can act on', () => {
        const queued = upNextMatches(bracket);

        expect(queued.length).toBeGreaterThan(0);
        expect(queued.length).toBeLessThanOrEqual(UP_NEXT_MAX);
        // No blank tiles, and no fixture between two match numbers.
        queued.forEach(m => {
            expect(isDecidedTeam(m.team_a)).toBe(true);
            expect(isDecidedTeam(m.team_b)).toBe(true);
        });
        expect(JSON.stringify(queued)).not.toMatch(/winner of match|loser of match/i);
        // And nothing already played.
        queued.forEach(m => expect(isFinishedStatus(m.status)).toBe(false));
    });

    it('puts what is on court at the head of the queue', () => {
        const queued = upNextMatches(bracket);
        const scheduled = queued.filter(m => m.court_name);
        expect(scheduled.length).toBeGreaterThan(0);
        expect(queued.indexOf(scheduled[0])).toBeLessThan(2);
    });
});
