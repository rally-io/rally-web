import { describe, expect, it } from 'vitest';
import {
    activeMatchIndex,
    courtSlots,
    groupGlyph,
    groupMatchesByRound,
    pairChipIndex,
    pairIdentity,
    pairInitials,
    PAIR_CHIP_COUNT,
    visibleRoundWindow,
} from '../utils';
import type { PublicMatch } from '../types';

function match(id: string, round: number | null, status = 'scheduled'): PublicMatch {
    return {
        id,
        match_label: null,
        round_number: round,
        team_a: null,
        team_b: null,
        sets: [],
        winner_team: null,
        next_match_id: null,
        status,
        court_name: null,
        scheduled_at: null,
    };
}

describe('activeMatchIndex', () => {
    it('prefers the live game', () => {
        expect(activeMatchIndex([
            match('a', 1, 'completed'), match('b', 1, 'in_progress'), match('c', 1, 'scheduled'),
        ])).toBe(1);
    });

    it('falls back to the next unplayed game', () => {
        expect(activeMatchIndex([
            match('a', 1, 'completed'), match('b', 1, 'walkover'), match('c', 1, 'scheduled'),
        ])).toBe(2);
    });

    it('lands on the first game once everything is finished', () => {
        expect(activeMatchIndex([match('a', 1, 'completed'), match('b', 1, 'completed')])).toBe(0);
    });

    it('is safe on an empty list', () => {
        expect(activeMatchIndex([])).toBe(0);
    });
});

describe('groupGlyph', () => {
    it('extracts the trailing letter from backend group names', () => {
        expect(groupGlyph('Group A')).toBe('A');
        expect(groupGlyph('Group 12')).toBe('12');
    });

    it('returns null-safe fallback for long trailing words', () => {
        expect(groupGlyph('קבוצת הצפון')).toBeNull();
    });
});

describe('groupMatchesByRound', () => {
    it('splits matches into ordered rounds', () => {
        const result = groupMatchesByRound([
            match('c', 2), match('a', 1), match('d', 2), match('b', 1),
        ]);
        expect(result.hasRealRounds).toBe(true);
        expect(result.rounds.map(r => r.roundNumber)).toEqual([1, 2]);
        expect(result.rounds[0].matches.map(m => m.id)).toEqual(['a', 'b']);
        expect(result.rounds[1].matches.map(m => m.id)).toEqual(['c', 'd']);
    });

    it('treats an all-null draw as one flat round', () => {
        const result = groupMatchesByRound([match('a', null), match('b', null)]);
        expect(result.hasRealRounds).toBe(false);
        expect(result.rounds).toHaveLength(1);
        expect(result.rounds[0].matches.map(m => m.id)).toEqual(['a', 'b']);
    });

    it('treats a legacy constant-1 draw as one flat round', () => {
        const result = groupMatchesByRound([match('a', 1), match('b', 1), match('c', 1)]);
        expect(result.hasRealRounds).toBe(false);
        expect(result.rounds).toHaveLength(1);
        expect(result.rounds[0].matches.map(m => m.id)).toEqual(['a', 'b', 'c']);
    });

    it('returns one empty round for no matches', () => {
        const result = groupMatchesByRound([]);
        expect(result.hasRealRounds).toBe(false);
        expect(result.rounds).toEqual([{ roundNumber: 1, matches: [] }]);
    });
});

describe('visibleRoundWindow', () => {
    it('returns every round when they fit', () => {
        expect(visibleRoundWindow([1, 2, 3], 2, 4)).toEqual([1, 2, 3]);
    });

    it('centres the window on the active round', () => {
        expect(visibleRoundWindow([1, 2, 3, 4, 5], 4, 3)).toEqual([3, 4, 5]);
    });

    it('clamps the window to the start', () => {
        expect(visibleRoundWindow([1, 2, 3, 4, 5], 1, 3)).toEqual([1, 2, 3]);
    });

    it('clamps the window to the end', () => {
        expect(visibleRoundWindow([1, 2, 3, 4, 5], 5, 3)).toEqual([3, 4, 5]);
    });
});

describe('pair identity and chip colour', () => {
    const player = (id: string, first: string, last: string) => ({
        id, first_name: first, last_name: last, skill_level: null, is_guest: null,
    });

    it('is order-independent, so a team and its standings row agree', () => {
        const a = pairIdentity({ player_1: player('p1', 'Gal', 'Tsarfati'), player_2: player('p2', 'Gaash', 'Greif') });
        const b = pairIdentity({ player_1: player('p2', 'Gaash', 'Greif'), player_2: player('p1', 'Gal', 'Tsarfati') });
        expect(a).toBe(b);
    });

    it('keeps the same chip colour after the pair changes standings position', () => {
        const first = { position: 1, player_1: player('p1', 'Gal', 'Tsarfati'), player_2: player('p2', 'Gaash', 'Greif') };
        const later = { position: 4, player_1: player('p1', 'Gal', 'Tsarfati'), player_2: player('p2', 'Gaash', 'Greif') };
        expect(pairChipIndex(pairIdentity(later))).toBe(pairChipIndex(pairIdentity(first)));
    });

    it('falls back to names when ids are empty', () => {
        const withoutIds = pairIdentity({ player_1: player('', 'Gal', 'Tsarfati'), player_2: player('', 'Gaash', 'Greif') });
        expect(withoutIds).not.toBe('');
        expect(pairChipIndex(withoutIds)).toBeGreaterThanOrEqual(0);
    });

    it('always returns a chip index inside the palette', () => {
        ['', 'a', 'p1|p2', 'שמוליק|גלי'].forEach(id => {
            const idx = pairChipIndex(id);
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(idx).toBeLessThan(PAIR_CHIP_COUNT);
        });
    });

    it('takes one initial from each player', () => {
        expect(pairInitials({ player_1: player('p1', 'Gal', 'T'), player_2: player('p2', 'Noa', 'B') })).toBe('GN');
    });

    it('falls back to the team name for a single-name entry', () => {
        expect(pairInitials({ player_1: null, player_2: null, team_name: 'Rally' })).toBe('Ra');
    });

    it('keeps two pairs distinct when they share one id\'d player but differ in the id-less partner', () => {
        const withAlice = pairIdentity({ player_1: player('p1', 'Gal', 'Tsarfati'), player_2: player('', 'Alice', 'Wonderland') });
        const withBob = pairIdentity({ player_1: player('p1', 'Gal', 'Tsarfati'), player_2: player('', 'Bob', 'Marley') });
        expect(withAlice).not.toBe(withBob);
        expect(withAlice).not.toBe('p1');
        expect(withBob).not.toBe('p1');
    });

    it('stays order-independent for a pair with one id-less player', () => {
        const a = pairIdentity({ player_1: player('p1', 'Gal', 'Tsarfati'), player_2: player('', 'Alice', 'Wonderland') });
        const b = pairIdentity({ player_1: player('', 'Alice', 'Wonderland'), player_2: player('p1', 'Gal', 'Tsarfati') });
        expect(a).toBe(b);
    });

    it('produces non-empty initials when only player_2 has a name', () => {
        const nameless = { id: 'p1', first_name: null, last_name: null, skill_level: null, is_guest: null };
        expect(pairInitials({ player_1: nameless, player_2: player('p2', 'Noa', 'Ben') })).toBe('No');
    });
});

describe('courtSlots', () => {
    const onCourt = (id: string, court: string | null, at: string | null, status = 'scheduled'): PublicMatch => ({
        ...match(id, 1, status), court_name: court, scheduled_at: at,
    });
    const bracket = (matches: PublicMatch[]) => ({
        tournament_id: 't', tournament_name: 'T', structure: 'group_then_knockout',
        club_name: null, club_logo_url: null, sponsors: [], videos: [],
        knockout_rounds: [], plate_rounds: [], league_standings: null,
        third_place_match: null,
        groups: [{ group_name: 'Group A', matches, standings: [] }],
    });
    // Sibling of `bracket` above: puts the matches on `plate_rounds` instead of `groups`, so a
    // court occupied only by a plate-bracket match still has to produce a tile.
    const plateBracket = (matches: PublicMatch[]) => ({
        tournament_id: 't', tournament_name: 'T', structure: 'group_then_knockout',
        club_name: null, club_logo_url: null, sponsors: [], videos: [],
        knockout_rounds: [], plate_rounds: [{ round_number: 1, round_name: 'Plate Final', matches }],
        league_standings: null, third_place_match: null, groups: [],
    });

    it('picks the earliest upcoming match per court, not the first in the list', () => {
        const slots = courtSlots(bracket([
            onCourt('late', 'Court 1', '2026-08-11T14:00:00Z'),
            onCourt('early', 'Court 1', '2026-08-11T10:00:00Z'),
        ]));
        expect(slots).toHaveLength(1);
        expect(slots[0].next?.id).toBe('early');
    });

    it('puts a live match in the live slot and still finds the next one', () => {
        const slots = courtSlots(bracket([
            onCourt('now', 'Court 1', '2026-08-11T10:00:00Z', 'in_progress'),
            onCourt('after', 'Court 1', '2026-08-11T11:00:00Z'),
        ]));
        expect(slots[0].live?.id).toBe('now');
        expect(slots[0].next?.id).toBe('after');
    });

    it('sorts matches with no scheduled time last rather than first', () => {
        const slots = courtSlots(bracket([
            onCourt('untimed', 'Court 1', null),
            onCourt('timed', 'Court 1', '2026-08-11T12:00:00Z'),
        ]));
        expect(slots[0].next?.id).toBe('timed');
    });

    it('ignores matches with no court name', () => {
        const slots = courtSlots(bracket([
            onCourt('nowhere', null, '2026-08-11T10:00:00Z'),
            onCourt('somewhere', 'Court 2', '2026-08-11T11:00:00Z'),
        ]));
        expect(slots.map(s => s.court)).toEqual(['Court 2']);
    });

    it('returns nothing when no match names a court', () => {
        expect(courtSlots(bracket([onCourt('a', null, null)]))).toEqual([]);
    });

    it('orders courts naturally, so Court 10 follows Court 9', () => {
        const slots = courtSlots(bracket([
            onCourt('a', 'Court 10', '2026-08-11T10:00:00Z'),
            onCourt('b', 'Court 9', '2026-08-11T10:00:00Z'),
        ]));
        expect(slots.map(s => s.court)).toEqual(['Court 9', 'Court 10']);
    });

    it('produces a tile for a court occupied only by a plate-bracket match', () => {
        const slots = courtSlots(plateBracket([
            onCourt('plate-live', 'Court 5', '2026-08-11T10:00:00Z', 'in_progress'),
        ]));
        expect(slots.map(s => s.court)).toEqual(['Court 5']);
        expect(slots[0].live?.id).toBe('plate-live');
    });
});
