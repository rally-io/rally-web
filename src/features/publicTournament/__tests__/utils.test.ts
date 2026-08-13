import { describe, expect, it } from 'vitest';
import {
    activeMatchIndex,
    isDecidedTeam,
    localizeTeamPlaceholder,
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
    // The shared `match()` helper leaves both teams null, which the queue now treats as an
    // undecided knockout slot and skips — so anything meant to BE queued has to carry pairs.
    const pair = (name: string) => ({ team_name: name, player_1: null, player_2: null, is_lucky_loser: null });
    const at = (id: string, court: string | null, when: string | null, status = 'scheduled'): PublicMatch => ({
        ...match(id, 1, status),
        team_a: pair(`${id} A`), team_b: pair(`${id} B`),
        court_name: court, scheduled_at: when,
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

    it('skips a match whose teams are not decided yet', () => {
        // The defect this fixes, seen on the production board: a group_then_knockout bracket
        // carries its knockout matches from the draw onward with both teams null. Unfinished and
        // unscheduled, they queued ahead of nothing and filled the footer with tiles reading
        // "Next" over blank names.
        const empty = (id: string): PublicMatch => ({
            ...match(id, 1), team_a: null, team_b: null, court_name: null, scheduled_at: null,
        });
        const half = (id: string): PublicMatch => ({
            ...match(id, 1), team_a: pair('Known'), team_b: null, court_name: null, scheduled_at: null,
        });
        const withKnockout = {
            ...bracket([at('real', 'Court 1', '2026-08-11T10:00:00Z')]),
            knockout_rounds: [{ round_number: 1, round_name: 'Semifinal', matches: [empty('ko1'), half('ko2')] }],
        };
        expect(upNextMatches(withKnockout).map(m => m.id)).toEqual(['real']);
    });

    it('skips a knockout slot the groups have not filled, however it is labelled', () => {
        // Seen on the production board. The backend draws the knockout up front and labels the
        // undecided slots "Winner of Match #49" vs "Winner of Match #50" — non-empty strings, so
        // a filter that only asked "does this side have a label?" queued them as real fixtures
        // and the footer announced matches between two match numbers.
        const placeholder = (id: string, a: string, b: string): PublicMatch => ({
            ...match(id, 1), team_a: pair(a), team_b: pair(b), court_name: null, scheduled_at: null,
        });
        const withKnockout = {
            ...bracket([at('real', 'Court 1', '2026-08-11T10:00:00Z')]),
            knockout_rounds: [{
                round_number: 1, round_name: 'Quarterfinal', matches: [
                    placeholder('ko1', 'Winner of Match #49', 'Winner of Match #50'),
                    placeholder('ko2', 'Loser of Match #41', 'Winner of Match #42'),
                    // Spacing and the '#' are both optional in what the backend emits.
                    placeholder('ko3', 'winner of match 7', 'Winner of  Match  #8'),
                ],
            }],
        };
        expect(upNextMatches(withKnockout).map(m => m.id)).toEqual(['real']);
    });

    it('still queues a genuinely named team that carries no players', () => {
        // The rule is "undecided", not "has no players" — a club entering teams by name only
        // must not be filtered out alongside the bracket placeholders.
        const named = {
            ...match('named', 1), team_a: pair('Maccabim A'), team_b: pair('Maccabim B'),
            court_name: 'Court 1', scheduled_at: '2026-08-11T10:00:00Z',
        };
        expect(upNextMatches(bracket([named])).map(m => m.id)).toEqual(['named']);
    });

    it('sees plate matches, which are played on real courts like any other', () => {
        const ids = upNextMatches(plateBracket([at('plate', 'Court 5', '2026-08-11T10:00:00Z')])).map(m => m.id);
        expect(ids).toEqual(['plate']);
    });
});

describe('placeholder teams', () => {
    const pair = (name: string) => ({ team_name: name, player_1: null, player_2: null, is_lucky_loser: null });
    const player = { id: 'p1', first_name: 'Gal', last_name: 'Levi', skill_level: null, is_guest: null };
    // Returns the KEY, not the defaultValue: in English the defaultValue is byte-identical to the
    // input ("Winner of Match #49"), so comparing output to input cannot tell a recognised
    // placeholder from an unrecognised one. The key can.
    const t = ((key: string) => key) as never;

    it.each([
        'Winner of Match #49',
        'Loser of Match #50',
        'winner of match 7',
        'Winner of  Match  #8',
        'Loser  of  Match 12',
    ])('treats %s as undecided, and localizeTeamPlaceholder agrees it is a placeholder', name => {
        expect(isDecidedTeam(pair(name))).toBe(false);
        // The coupling that matters: the display path and the queue filter must agree about what
        // a placeholder IS. They share one regex now; this fails the moment anyone forks it.
        expect(localizeTeamPlaceholder(name, t)).toMatch(/^public_bracket\.(winner|loser)_of_match$/);
    });

    it.each([
        'Maccabim A',
        'Winners',
        'Match Point',
    ])('treats %s as a real team, and localizeTeamPlaceholder leaves it alone', name => {
        expect(isDecidedTeam(pair(name))).toBe(true);
        expect(localizeTeamPlaceholder(name, t)).toBe(name);
    });

    it('is decided whenever real players are present, whatever the team name says', () => {
        expect(isDecidedTeam({ team_name: 'Winner of Match #49', player_1: player, player_2: null, is_lucky_loser: null })).toBe(true);
    });

    it('is undecided for a null team or an empty name', () => {
        expect(isDecidedTeam(null)).toBe(false);
        expect(isDecidedTeam(undefined)).toBe(false);
        expect(isDecidedTeam(pair(''))).toBe(false);
    });
});
