import { describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import {
    activeMatchIndex,
    activeRoundIndex,
    activeRoundNumber,
    courtTier,
    getRoundName,
    isDecidedTeam,
    isFinishedStatus,
    isVoidedStatus,
    localizeTeamPlaceholder,
    upNextMatches,
    UP_NEXT_MAX,
    groupGlyph,
    groupMatchesByRound,
    keepNamesWhole,
    pairChipIndex,
    pairIdentity,
    pairInitials,
    PAIR_CHIP_COUNT,
    plainNames,
    nextRoundWindow,
    roundStateLabel,
    roundStateOf,
    scoreTone,
    upNextRoundIndex,
    visibleRoundWindow,
} from '../utils';
import type { RoundState } from '../utils';
import type { PublicMatch, PublicRound } from '../types';

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

describe('status predicates', () => {
    it('reads only a cancelled fixture as voided', () => {
        expect(isVoidedStatus('cancelled')).toBe(true);
        ['completed', 'walkover', 'scheduled', 'in_progress', 'live', 'not_scheduled']
            .forEach(status => expect(isVoidedStatus(status)).toBe(false));
    });

    // The two predicates answer different questions and must stay apart. `isFinishedStatus` is
    // what `scoreSummary` and `MatchCard` branch on to decide whether to print a scoreline, and a
    // voided fixture has no score: widening it to cover 'cancelled' would paint an empty
    // scoreline on the venue board instead of taking the fixture off it.
    it('keeps isFinishedStatus meaning "has a result", which a voided fixture has not', () => {
        expect(isFinishedStatus('completed')).toBe(true);
        expect(isFinishedStatus('walkover')).toBe(true);
        expect(isFinishedStatus('cancelled')).toBe(false);
        expect(isFinishedStatus('scheduled')).toBe(false);
        expect(isFinishedStatus('in_progress')).toBe(false);
        expect(isFinishedStatus('live')).toBe(false);
    });
});

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

    it('skips a fixture a disqualification voided and highlights the next real one', () => {
        expect(activeMatchIndex([
            match('a', 1, 'completed'), match('b', 1, 'cancelled'), match('c', 1, 'scheduled'),
        ])).toBe(2);
    });

    it('lands on the first game when every game left is voided', () => {
        expect(activeMatchIndex([match('a', 1, 'completed'), match('b', 1, 'cancelled')])).toBe(0);
        expect(activeMatchIndex([match('a', 1, 'cancelled'), match('b', 1, 'cancelled')])).toBe(0);
    });
});

describe('roundStateOf', () => {
    it('is live while any game is on court, even with others finished', () => {
        expect(roundStateOf([match('a', 1, 'completed'), match('b', 1, 'in_progress')])).toBe('live');
        expect(roundStateOf([match('a', 1, 'live')])).toBe('live');
    });

    it('is done only once every game is finished, a walkover included', () => {
        expect(roundStateOf([match('a', 1, 'completed'), match('b', 1, 'walkover')])).toBe('done');
        expect(roundStateOf([match('a', 1, 'completed'), match('b', 1, 'scheduled')])).toBe('upcoming');
    });

    it('is upcoming with nothing played, and for an empty round', () => {
        expect(roundStateOf([match('a', 1), match('b', 1)])).toBe('upcoming');
        expect(roundStateOf([])).toBe('upcoming');
    });

    it('is done once the only games left unplayed were voided', () => {
        // A round the disqualification emptied is over — nothing in it will ever be played. Read
        // as 'upcoming' it froze there forever, and with it both the games axis and the phone
        // round stepper, which take their completeness from here.
        expect(roundStateOf([match('a', 1, 'completed'), match('b', 1, 'cancelled')])).toBe('done');
        expect(roundStateOf([match('a', 1, 'cancelled'), match('b', 1, 'cancelled')])).toBe('done');
    });

    it('is still live when a game is on court beside a voided one', () => {
        expect(roundStateOf([match('a', 1, 'cancelled'), match('b', 1, 'in_progress')])).toBe('live');
    });

    it('is still upcoming while a real fixture remains beside a voided one', () => {
        expect(roundStateOf([match('a', 1, 'cancelled'), match('b', 1, 'scheduled')])).toBe('upcoming');
    });
});

describe('upNextRoundIndex', () => {
    it('between rounds: the first round not done, and only it', () => {
        expect(upNextRoundIndex(['done', 'done', 'done', 'done', 'done', 'upcoming', 'upcoming', 'upcoming'])).toBe(5);
    });

    it('at the start of the evening: round 1', () => {
        expect(upNextRoundIndex(['upcoming', 'upcoming', 'upcoming'])).toBe(0);
    });

    it('mid-round: the round after the live one', () => {
        expect(upNextRoundIndex(['done', 'done', 'done', 'done', 'done', 'live', 'upcoming', 'upcoming'])).toBe(6);
    });

    it('two rounds live at once: the round after the last live one', () => {
        expect(upNextRoundIndex(['done', 'live', 'live', 'upcoming'])).toBe(3);
    });

    it('none once everything is played, or when the live round is the last', () => {
        expect(upNextRoundIndex(['done', 'done'])).toBe(-1);
        expect(upNextRoundIndex(['done', 'live'])).toBe(-1);
        expect(upNextRoundIndex([])).toBe(-1);
    });
});

describe('roundStateLabel (review fix 6)', () => {
    it('reads the same key and default both LanesView and AmericanoRoundsBoard historically used, for every state', () => {
        // Records (key, defaultValue) the way every call site in the module invokes `t` — the
        // shorthand form, a plain string as the second argument, not an options object.
        const calls: Array<[string, string]> = [];
        const t = ((key: string, defaultValue: string) => {
            calls.push([key, defaultValue]);
            return defaultValue;
        }) as never;
        expect(roundStateLabel('live', t)).toBe('In progress');
        expect(roundStateLabel('next', t)).toBe('Up next');
        expect(roundStateLabel('done', t)).toBe('Finished');
        expect(roundStateLabel('upcoming', t)).toBe('');
        expect(calls).toEqual([
            ['public_bracket.round_live', 'In progress'],
            ['public_bracket.up_next', 'Up next'],
            ['public_bracket.round_done', 'Finished'],
        ]);
    });
});

describe('nextRoundWindow', () => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('several live rounds that all fit alongside next: all of them, plus next', () => {
        const states: RoundState[] = ['done', 'done', 'live', 'live', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'];
        expect(nextRoundWindow(numbers, states, 4, 4)).toEqual([3, 4, 5, 6]);
    });

    it('more live rounds than fit: the live rounds win, so next drops off and the earliest live rounds stay (review fix 1)', () => {
        // Was: [4, 5, 6, 7] (next kept, the two earliest live rounds dropped) — the window pulled
        // towards `next` and let it bump a live round off screen. A live round never falls off the
        // board (review fix 1), so the window now starts at the FIRST live round and never later:
        // round 6 (live) and `next` (round 7) both drop instead.
        const states: RoundState[] = ['done', 'live', 'live', 'live', 'live', 'live', 'upcoming', 'upcoming', 'upcoming', 'upcoming'];
        expect(nextRoundWindow(numbers, states, 6, 4)).toEqual([2, 3, 4, 5]);
    });

    it('overflow at a narrow window: the live round right before next stays, next drops off instead (review fix 1)', () => {
        // The reviewer's repro, in miniature: rounds 1-5 done, 6 and 7 live, 8 called next, but
        // only a 2-wide window. The old formula pulled towards `next` and dropped round 6 — a live
        // round. The fix never starts the window later than the first live round, so next (which
        // doesn't fit) drops off instead.
        const states: RoundState[] = ['done', 'done', 'done', 'done', 'done', 'live', 'live', 'upcoming', 'upcoming', 'upcoming'];
        expect(nextRoundWindow(numbers, states, 7, 2)).toEqual([6, 7]);
    });

    it('next near the end of the list: the window shifts left to stay max long, next stays inside', () => {
        const states: RoundState[] = ['done', 'done', 'done', 'done', 'done', 'done', 'done', 'live', 'live', 'upcoming'];
        expect(nextRoundWindow(numbers, states, 9, 4)).toEqual([7, 8, 9, 10]);
    });

    it('nothing live: the window starts at next and runs forward, with nothing before it to keep', () => {
        const states: RoundState[] = ['done', 'done', 'done', 'done', 'done', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'];
        expect(nextRoundWindow(numbers, states, 5, 4)).toEqual([6, 7, 8, 9]);
    });
});

describe('courtTier', () => {
    it.each([
        [1, 'few'], [4, 'few'], [5, 'several'], [8, 'several'], [9, 'many'], [16, 'many'],
    ] as const)('%i courts is the %s tier', (courts, tier) => {
        expect(courtTier(courts)).toBe(tier);
    });
});

describe('scoreTone', () => {
    const scored = (a: number, b: number, over: Partial<PublicMatch> = {}): PublicMatch => ({
        ...match('m', 1, 'completed'),
        sets: [{ team_a_score: a, team_b_score: b, is_tiebreak: null }],
        ...over,
    });

    it('reads a live game as live on both sides, whatever the score', () => {
        const live = scored(5, 3, { status: 'in_progress' });
        expect(scoreTone(live, 'team_a')).toBe('live');
        expect(scoreTone(live, 'team_b')).toBe('live');
    });

    it('reads a decided game as winner and loser', () => {
        const won = scored(16, 10, { winner_team: 'team_a' });
        expect(scoreTone(won, 'team_a')).toBe('winner');
        expect(scoreTone(won, 'team_b')).toBe('loser');
    });

    it('reads a finished level game with no winner as a tie on both sides', () => {
        const tie = scored(12, 12, { winner_team: null });
        expect(scoreTone(tie, 'team_a')).toBe('tie');
        expect(scoreTone(tie, 'team_b')).toBe('tie');
    });

    it('reads an unplayed game, and a walkover\'s absent side, without a winner\'s colour', () => {
        expect(scoreTone(match('m', 1, 'scheduled'), 'team_a')).toBe('neutral');
        const walkover = { ...match('m', 1, 'walkover'), winner_team: 'team_a' as const };
        expect(scoreTone(walkover, 'team_a')).toBe('winner');
        expect(scoreTone(walkover, 'team_b')).toBe('loser');
    });

    it('per set: the winner\'s lost set reads as a loser\'s', () => {
        const threeSets = {
            ...match('m', 1, 'completed'),
            winner_team: 'team_a' as const,
            sets: [
                { team_a_score: 6, team_b_score: 4, is_tiebreak: null },
                { team_a_score: 3, team_b_score: 6, is_tiebreak: null },
            ],
        };
        expect(scoreTone(threeSets, 'team_a', threeSets.sets[0])).toBe('winner');
        expect(scoreTone(threeSets, 'team_a', threeSets.sets[1])).toBe('loser');
        expect(scoreTone(threeSets, 'team_b', threeSets.sets[1])).toBe('loser');
    });
});

describe('keepNamesWhole', () => {
    it('leaves the break between the two players and joins each name with non-breaking spaces and hyphens', () => {
        expect(keepNamesWhole('אלכסנדרה רוזנבלום-שטרנברג / יוסי בן דוד'))
            .toBe('אלכסנדרה\u00A0רוזנבלום\u2011שטרנברג / יוסי\u00A0בן\u00A0דוד');
    });

    it('keeps a hyphenated Latin name and a maqaf-joined Hebrew name in one piece', () => {
        expect(keepNamesWhole('Dan Ben-Ami / Gal Cohen-Levi')).toBe('Dan\u00A0Ben\u2011Ami / Gal\u00A0Cohen\u2011Levi');
        expect(keepNamesWhole('בן\u05BEדוד')).toBe('בן\u05BE\u2060דוד');
    });

    it('leaves no break opportunity inside a name: only the slash separates', () => {
        const kept = keepNamesWhole('Noa Bar-Lev / Ido Ben-David Cohen');
        expect(kept.split(' / ')).toHaveLength(2);
        kept.split(' / ').forEach(name => expect(name).not.toMatch(/[ -]/));
    });

    it('keeps a single name in one piece', () => {
        expect(keepNamesWhole('Dan Levi')).toBe('Dan\u00A0Levi');
        expect(keepNamesWhole('')).toBe('');
    });
});

describe('plainNames', () => {
    it('is the inverse of keepNamesWhole for ordinary names', () => {
        ['Dan Levi', 'Dan Ben-Ami / Gal Cohen-Levi', 'Bar-Lev-Cohen', ''].forEach(x => {
            expect(plainNames(keepNamesWhole(x))).toBe(x);
        });
    });

    it('is the inverse of keepNamesWhole for a maqaf-joined Hebrew name too', () => {
        const x = 'בן\u05BEדוד';
        expect(plainNames(keepNamesWhole(x))).toBe(x);
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

describe('activeRoundIndex', () => {
    const round = (n: number, matches: PublicMatch[]): PublicRound => ({
        round_number: n, round_name: `Round ${n}`, matches,
    });

    it('is the first round holding something still to play', () => {
        expect(activeRoundIndex([
            round(1, [match('a', 1, 'completed')]),
            round(2, [match('b', 2, 'scheduled')]),
            round(3, [match('c', 3, 'scheduled')]),
        ])).toBe(1);
    });

    it('advances past a round whose remaining fixtures were all voided', () => {
        expect(activeRoundIndex([
            round(1, [match('a', 1, 'completed')]),
            round(2, [match('b', 2, 'completed'), match('c', 2, 'cancelled')]),
            round(3, [match('d', 3, 'scheduled')]),
        ])).toBe(2);
    });

    it('still falls back to the last round when nothing anywhere is left to play', () => {
        expect(activeRoundIndex([
            round(1, [match('a', 1, 'completed')]),
            round(2, [match('b', 2, 'cancelled')]),
        ])).toBe(1);
        expect(activeRoundIndex([])).toBe(0);
    });
});

describe('activeRoundNumber', () => {
    const round = (n: number, matches: PublicMatch[]) => ({ roundNumber: n, matches });

    it('is the first round holding something still to play', () => {
        expect(activeRoundNumber([
            round(1, [match('a', 1, 'completed')]),
            round(2, [match('b', 2, 'scheduled')]),
        ])).toBe(2);
    });

    it('advances past a round whose remaining fixtures were all voided', () => {
        expect(activeRoundNumber([
            round(1, [match('a', 1, 'completed')]),
            round(2, [match('b', 2, 'walkover'), match('c', 2, 'cancelled')]),
            round(3, [match('d', 3, 'scheduled')]),
        ])).toBe(3);
    });

    it('still prefers a live round over everything else', () => {
        expect(activeRoundNumber([
            round(1, [match('a', 1, 'scheduled')]),
            round(2, [match('b', 2, 'cancelled'), match('c', 2, 'in_progress')]),
        ])).toBe(2);
    });

    it('still falls back to the last round number when nothing is left to play', () => {
        expect(activeRoundNumber([
            round(1, [match('a', 1, 'completed')]),
            round(7, [match('b', 7, 'cancelled')]),
        ])).toBe(7);
        expect(activeRoundNumber([])).toBe(1);
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

    it('drops a fixture a disqualification voided, however early it was due', () => {
        // The live defect, exactly as the hall saw it. `cascade_disqualification` voids the pair's
        // unplayed group fixtures but leaves both registrations in their slots, so the game is
        // still fully decided and still carries the evening's earliest start — it led the court
        // rail, announcing a game nobody would ever come out to play.
        const ids = upNextMatches(bracket([
            at('voided', 'Court 1', '2026-08-11T09:00:00Z', 'cancelled'),
            at('next', 'Court 2', '2026-08-11T10:00:00Z'),
        ])).map(m => m.id);
        expect(ids).toEqual(['next']);
    });

    it('leaves nothing to queue when every remaining fixture was voided', () => {
        expect(upNextMatches(bracket([
            at('v1', 'Court 1', '2026-08-11T09:00:00Z', 'cancelled'),
            at('v2', 'Court 2', '2026-08-11T10:00:00Z', 'cancelled'),
        ]))).toEqual([]);
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

describe('getRoundName', () => {
    const he = i18n.getFixedT('he');
    const en = i18n.getFixedT('en');

    // A league's and an Americano's rounds arrive as plain "Round N" and used to stay English on
    // the Hebrew page. Any N: an Americano evening runs 8 rounds, past the five fixed keys.
    it.each([
        ['Round 1', 'סיבוב 1'],
        ['Round 8', 'סיבוב 8'],
        ['round 12', 'סיבוב 12'],
    ])('translates %s to %s', (name, hebrew) => {
        expect(getRoundName(name, he)).toBe(hebrew);
    });

    it('reads Round 16 and Round 32 as round numbers, not the knockout rounds of 16 and 32', () => {
        expect(getRoundName('Round 16', he)).toBe('סיבוב 16');
        expect(getRoundName('Round 32', he)).toBe('סיבוב 32');
        expect(getRoundName('Round 16', en)).toBe('Round 16');
    });

    it('leaves the knockout names as they were', () => {
        expect(getRoundName('Round of 16', he)).toBe('שמינית גמר');
        expect(getRoundName('Round of 32', he)).toBe('שלושים ושתיים אחרונות');
        expect(getRoundName('Final', he)).toBe('גמר');
        expect(getRoundName('Semi-final', he)).toBe('חצי גמר');
        expect(getRoundName('Quarter-final', he)).toBe('רבע גמר');
        expect(getRoundName('Plate Round 1', he)).toBe('Plate Round 1');
        expect(getRoundName('Round of 16', en)).toBe('Round of 16');
    });
});

describe('a draw with nothing voided reads exactly as it did before', () => {
    // Every selector the voided branch touches, pinned together on a clean evening. A tournament
    // that disqualified nobody is the overwhelmingly common case, and the new branch has to be
    // invisible to it — these are the answers the five gave before it existed.
    const pair = (name: string) => ({ team_name: name, player_1: null, player_2: null, is_lucky_loser: null });
    const timed = (id: string, round: number, when: string, status = 'scheduled'): PublicMatch => ({
        ...match(id, round, status),
        team_a: pair(`${id} A`), team_b: pair(`${id} B`), court_name: 'Court 1', scheduled_at: when,
    });
    const r1 = timed('r1', 1, '2026-08-11T09:00:00Z', 'completed');
    const r2 = timed('r2', 2, '2026-08-11T10:00:00Z');
    const r3 = timed('r3', 3, '2026-08-11T11:00:00Z');

    it('gives the same answer from all five selectors', () => {
        expect(activeMatchIndex([r1, r2, r3])).toBe(1);
        expect(roundStateOf([r1])).toBe('done');
        expect(roundStateOf([r2, r3])).toBe('upcoming');
        expect(activeRoundIndex([
            { round_number: 1, round_name: 'Round 1', matches: [r1] },
            { round_number: 2, round_name: 'Round 2', matches: [r2] },
            { round_number: 3, round_name: 'Round 3', matches: [r3] },
        ])).toBe(1);
        expect(activeRoundNumber([
            { roundNumber: 1, matches: [r1] },
            { roundNumber: 2, matches: [r2] },
            { roundNumber: 3, matches: [r3] },
        ])).toBe(2);
        expect(upNextMatches({
            tournament_id: 't', tournament_name: 'T', structure: 'group_then_knockout',
            club_name: null, club_logo_url: null, sponsors: [], videos: [],
            knockout_rounds: [], plate_rounds: [], league_standings: null, third_place_match: null,
            groups: [{ group_name: 'Group A', matches: [r1, r2, r3], standings: [] }],
        }).map(m => m.id)).toEqual(['r2', 'r3']);
    });
});
