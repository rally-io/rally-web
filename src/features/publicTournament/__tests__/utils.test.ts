import { describe, expect, it } from 'vitest';
import {
    activeMatchIndex,
    upNextMatches,
    UP_NEXT_MAX,
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

describe('upNextMatches', () => {
    const at = (id: string, court: string | null, when: string | null, status = 'scheduled'): PublicMatch => ({
        ...match(id, 1, status), court_name: court, scheduled_at: when,
    });
    const bracket = (matches: PublicMatch[]) => ({
        tournament_id: 't', tournament_name: 'T', structure: 'group_then_knockout',
        club_name: null, club_logo_url: null, sponsors: [], videos: [],
        knockout_rounds: [], plate_rounds: [], league_standings: null,
        third_place_match: null,
        groups: [{ group_name: 'Group A', matches, standings: [] }],
    });
    const plateBracket = (matches: PublicMatch[]) => ({
        tournament_id: 't', tournament_name: 'T', structure: 'group_then_knockout',
        club_name: null, club_logo_url: null, sponsors: [], videos: [],
        knockout_rounds: [], plate_rounds: [{ round_number: 1, round_name: 'Plate Final', matches }],
        league_standings: null, third_place_match: null, groups: [],
    });

    it('queues every upcoming match, not one per court', () => {
        // The defect this replaced: keyed on court, a round of four matches on two courts put
        // TWO tiles on the board and the other two had nowhere to appear.
        const ids = upNextMatches(bracket([
            at('a', 'Court 1', '2026-08-11T10:00:00Z'),
            at('b', 'Court 2', '2026-08-11T10:00:00Z'),
            at('c', 'Court 1', '2026-08-11T11:00:00Z'),
            at('d', 'Court 2', '2026-08-11T11:00:00Z'),
        ])).map(m => m.id);
        expect(ids).toEqual(['a', 'b', 'c', 'd']);
    });

    it('includes matches with no court assigned', () => {
        // A club that seeds courts on the night had NO footer at all before this: the rail
        // filtered to matches naming a court and rendered nothing when none did.
        const ids = upNextMatches(bracket([
            at('nocourt', null, '2026-08-11T10:00:00Z'),
        ])).map(m => m.id);
        expect(ids).toEqual(['nocourt']);
    });

    it('orders by start time and pushes untimed matches last', () => {
        const ids = upNextMatches(bracket([
            at('untimed', 'Court 3', null),
            at('late', 'Court 1', '2026-08-11T14:00:00Z'),
            at('early', 'Court 2', '2026-08-11T10:00:00Z'),
        ])).map(m => m.id);
        expect(ids).toEqual(['early', 'late', 'untimed']);
    });

    it('puts live matches at the head of the queue, whatever their start time', () => {
        const ids = upNextMatches(bracket([
            at('soon', 'Court 1', '2026-08-11T10:00:00Z'),
            at('playing', 'Court 2', '2026-08-11T23:00:00Z', 'in_progress'),
        ])).map(m => m.id);
        expect(ids[0]).toBe('playing');
    });

    it('drops finished matches', () => {
        const ids = upNextMatches(bracket([
            at('done', 'Court 1', '2026-08-11T09:00:00Z', 'completed'),
            at('wo', 'Court 2', '2026-08-11T09:30:00Z', 'walkover'),
            at('next', 'Court 1', '2026-08-11T10:00:00Z'),
        ])).map(m => m.id);
        expect(ids).toEqual(['next']);
    });

    it('caps the queue so the loop stays short enough to wait through', () => {
        // Unbounded, a 24-match draw is a two-minute cycle at five seconds a tile — the exact
        // complaint that retired the original ticker.
        const many = Array.from({ length: 24 }, (_, i) =>
            at(`m${i}`, 'Court 1', `2026-08-11T${String(10 + i).padStart(2, '0')}:00:00Z`));
        expect(upNextMatches(bracket(many))).toHaveLength(UP_NEXT_MAX);
        expect(upNextMatches(bracket(many), 3).map(m => m.id)).toEqual(['m0', 'm1', 'm2']);
    });

    it('sees plate matches, which are played on real courts like any other', () => {
        const ids = upNextMatches(plateBracket([at('plate', 'Court 5', '2026-08-11T10:00:00Z')])).map(m => m.id);
        expect(ids).toEqual(['plate']);
    });
});
