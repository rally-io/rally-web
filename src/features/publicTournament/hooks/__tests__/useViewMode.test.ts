import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { PublicBracketData, PublicGroup, PublicMatch, PublicRound, PublicVideo } from '../../types';
import { getRotationPhase, getRotationViews, useViewMode } from '../useViewMode';

function makeMatch(hasPlayer: boolean): PublicMatch {
    return {
        id: 'm1',
        match_label: null,
        team_a: hasPlayer ? { team_name: null, player_1: { id: 'p1', first_name: null, last_name: null, skill_level: null, is_guest: null }, player_2: null } : null,
        team_b: null,
        sets: [],
        winner_team: null,
        next_match_id: null,
        status: 'scheduled',
        court_name: null,
        scheduled_at: null,
    };
}

function makeRound(hasPlayer: boolean): PublicRound {
    return { round_number: 1, round_name: 'Round 1', matches: [makeMatch(hasPlayer)] };
}

function makeBracket(overrides: Partial<PublicBracketData>): PublicBracketData {
    return {
        tournament_id: 't1',
        tournament_name: 'Test Cup',
        structure: 'group_then_knockout',
        club_name: null,
        club_logo_url: null,
        sponsors: [],
        videos: [],
        knockout_rounds: [],
        plate_rounds: [],
        league_standings: null,
        groups: null,
        third_place_match: null,
        ...overrides,
    };
}

describe('getRotationPhase', () => {
    it('defaults to the group phase when there is no bracket yet', () => {
        expect(getRotationPhase(null)).toBe('group');
    });

    it('is the group phase while no knockout match holds a real player', () => {
        const bracket = makeBracket({ knockout_rounds: [makeRound(false)] });
        expect(getRotationPhase(bracket)).toBe('group');
    });

    it('flips to the knockout phase once any knockout match holds a real player', () => {
        const bracket = makeBracket({ knockout_rounds: [makeRound(false), makeRound(true)] });
        expect(getRotationPhase(bracket)).toBe('knockout');
    });
});

describe('getRotationViews', () => {
    it('collapses to the schedule while no groups have been drawn', () => {
        // Two empty screens to alternate between is the "toggle that rotates nothing" case.
        expect(getRotationViews('group', false, false)).toEqual(['games']);
        expect(getRotationViews('group', true, false)).toEqual(['games']);
    });

    it('rotates tables and matches from the draw onward, not from the first result', () => {
        // Regression: this used to gate on results, which hid the Auto-rotate toggle on a
        // venue TV for the whole pre-start evening — the busiest time for "which group am I
        // in". The tables are safe to show early because GroupBoardCard holds back the
        // numerals and the cutoff line until a result earns them.
        expect(getRotationViews('group', false, true)).toEqual(['groups', 'games']);
        expect(getRotationViews('group', true, true)).toEqual(['groups', 'games']);
    });

    it('knockout phase rotates knockout -> plate -> groups when a plate bracket exists', () => {
        expect(getRotationViews('knockout', true, true)).toEqual(['knockout', 'plate', 'groups']);
    });

    it('knockout phase rotates knockout <-> groups when there is no plate', () => {
        expect(getRotationViews('knockout', false, true)).toEqual(['knockout', 'groups']);
    });

    it('keeps the group tables reachable in every phase that has a draw', () => {
        // The final group standings are what players look for long after the last group match —
        // the knockout starting must not hide them. The undrawn case is excluded because there
        // is no table to reach at all.
        for (const views of [
            getRotationViews('group', false, true),
            getRotationViews('group', true, true),
            getRotationViews('knockout', false, true),
            getRotationViews('knockout', true, true),
        ]) {
            expect(views).toContain('groups');
        }
    });

    it('never lists a view twice, so a full cycle visits every entry', () => {
        // The hook advances with `(i + 1) % views.length`; a duplicate would make the screen
        // appear to stall on the repeated view.
        for (const views of [
            getRotationViews('group', false, false),
            getRotationViews('group', false, true),
            getRotationViews('knockout', false, true),
            getRotationViews('knockout', true, true),
        ]) {
            expect(new Set(views).size).toBe(views.length);
        }
    });

    it('marks the undrawn phase so the Auto-rotate toggle can be hidden', () => {
        // `useViewMode` derives `canAutoRotate` from this length. At length 1, `(i + 1) % 1` is
        // the identity: offering the toggle would leave it reading as on with nothing moving.
        expect(getRotationViews('group', false, false).length > 1).toBe(false);
        expect(getRotationViews('group', false, true).length > 1).toBe(true);
        expect(getRotationViews('knockout', false, true).length > 1).toBe(true);
    });
});

describe('phase transition', () => {
    it('lands on the new phase list\'s first view instead of carrying over a stale index', () => {
        // Mid-rotation in the knockout phase, sitting on the third view ("groups").
        const knockoutViews = getRotationViews('knockout', true, true);
        const staleIndex = 2;
        expect(knockoutViews[staleIndex]).toBe('groups');

        // The hook resets its index to 0 on any phase change
        // (see the `useEffect(() => setRotateIndex(0), [phase])` in the hook).
        expect(getRotationViews('group', true, true)[0]).toBe('groups');
        expect(knockoutViews[0]).toBe('knockout');
    });

    it('a stale index from the knockout phase would fall outside the group phase list', () => {
        // Group phase has at most two entries, so carrying index 2 over would read `undefined`.
        expect(getRotationViews('group', true, true)[2]).toBeUndefined();
        expect(getRotationViews('group', true, false)[1]).toBeUndefined();
    });
});

describe('plate fallback', () => {
    // `useViewMode` resolves a manually-selected 'plate' that has lost its plate
    // bracket to the stage default rather than a hard-coded 'groups'. Asserted on
    // the same predicate the hook uses, since the hook itself needs a React
    // renderer and vitest here runs in a node environment with no .tsx pickup.
    const stageDefault = (bracket: PublicBracketData): 'knockout' | 'groups' =>
        getRotationPhase(bracket) === 'knockout' ? 'knockout' : 'groups';

    it('falls back to the knockout while the knockout is being played', () => {
        // The plate is disabled from the CRM during the finals: the venue screen
        // must stay on the match on court, not jump to the group tables.
        const bracket = makeBracket({ knockout_rounds: [makeRound(true)], plate_rounds: [] });
        expect(stageDefault(bracket)).toBe('knockout');
    });

    it('falls back to the groups before the knockout has any teams', () => {
        const bracket = makeBracket({ knockout_rounds: [makeRound(false)], plate_rounds: [] });
        expect(stageDefault(bracket)).toBe('groups');
    });
});

describe('canAutoRotate structural gate', () => {
    // `view`'s early-return branch for any structure other than group_then_knockout never
    // reads `isAutoRotate`/`rotateView` — rotation only exists on the group_then_knockout
    // branch below it. A single-elimination bracket whose knockout already holds real
    // players still produces a `rotationViews` list of length > 1 (knockoutHasPlayers is
    // true, so getRotationPhase returns 'knockout'), so `canAutoRotate` must be gated on
    // structure too, or the toggle lights up on a venue TV and rotates nothing.
    const video: PublicVideo = { id: 'v1', label: 'Court 1', provider: 'YouTube', embed_url: 'https://example.com/embed', url: 'https://example.com', display_order: 0 };

    it('never offers auto-rotate on a single-elimination bracket, even with a live knockout and a video', () => {
        const bracket = makeBracket({
            structure: 'single_elimination',
            knockout_rounds: [makeRound(true)],
            videos: [video],
        });
        const { result } = renderHook(() => useViewMode(bracket));
        expect(result.current.canAutoRotate).toBe(false);
        // The tab bar still appears and the video is still reachable — only the
        // rotation control (which would do nothing on this structure) is hidden.
        expect(result.current.showTabs).toBe(true);
        expect(result.current.showVideo).toBe(true);
    });
});

describe('rotation interval', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('never starts the 12s interval when the rotation list has collapsed to one entry', () => {
        // No groups drawn yet: getRotationViews('group', ..., false) is ['games'] (length 1).
        // A spinning interval here would be pure overhead — `(i + 1) % 1` is always 0, so
        // nothing it does is ever observable.
        const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
        const bracket = makeBracket({ knockout_rounds: [], groups: [] });

        renderHook(() => useViewMode(bracket, true)); // isBigScreen -> isAutoRotate inits true

        expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it('rotates and offers the toggle on a drawn board before a single match is played', () => {
        // The reported regression, end to end: this is the venue TV on the night, groups drawn
        // and nothing played. It used to sit on one view with no toggle to be seen — and since
        // tapping a tab sets isAutoRotate false with no visible control to undo it, the board
        // then stayed parked even after results began arriving.
        const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
        const group: PublicGroup = { group_name: 'Group A', matches: [makeMatch(true)], standings: [] };
        const bracket = makeBracket({ knockout_rounds: [], groups: [group] });

        const { result } = renderHook(() => useViewMode(bracket, true));

        expect(result.current.canAutoRotate).toBe(true);
        expect(setIntervalSpy).toHaveBeenCalled();
    });

    it('still rotates once results exist', () => {
        const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
        const playedMatch: PublicMatch = {
            id: 'm1',
            match_label: null,
            round_number: 1,
            team_a: { team_name: 'A', player_1: null, player_2: null, is_lucky_loser: null },
            team_b: { team_name: 'B', player_1: null, player_2: null, is_lucky_loser: null },
            sets: [{ team_a_score: 6, team_b_score: 4, is_tiebreak: null }],
            winner_team: 'team_a',
            next_match_id: null,
            status: 'completed',
            court_name: null,
            scheduled_at: null,
        };
        const group: PublicGroup = { group_name: 'Group A', matches: [playedMatch], standings: [] };
        const bracket = makeBracket({ knockout_rounds: [], groups: [group] });

        renderHook(() => useViewMode(bracket, true));

        expect(setIntervalSpy).toHaveBeenCalled();
    });
});
