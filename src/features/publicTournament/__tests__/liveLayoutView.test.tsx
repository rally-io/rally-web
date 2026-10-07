import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LiveLayoutView } from '../components/LiveLayoutView';
import { toLiveBoard } from '../americano';
import { americanoBracket, FINAL_BOARD } from './fixtures/americanoBoard';
import type { LayoutKind, ViewMode } from '../liveLayouts';
import type { PublicBracketData, PublicMatch, PublicRound, PublicGroup, PublicStanding, PublicTeam } from '../types';

/**
 * `liveLayouts.test.ts` pins the DESCRIPTOR — which kind and tabs a bracket maps to. Nothing
 * rendered the renderers themselves: a swapped entry in `LiveLayoutView`'s `renderers` map, a
 * champion bar or third-place match dropped from the knockout tree, or a plate tab that leaked
 * the main bracket's champion, would all pass the rest of the suite untouched.
 *
 * Each test below renders `LiveLayoutView` with an explicit `kind` — the same value the hook
 * hands the page — and asserts the one or two things that are true of THAT kind's render and no
 * other: a wrong dispatch inside the `renderers` map fails the assertion, because the content it
 * produces is a different kind's content.
 */

/** jsdom has no ResizeObserver; `BracketTreeTV` constructs one unguarded (FitText guards its
 *  own). A no-op is enough — these tests never need the callback to fire, only for construction
 *  not to throw. Scoped to this whole file; nothing here depends on the global being absent. */
class StubResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function team(name: string): PublicTeam {
    return { team_name: name, player_1: null, player_2: null, is_lucky_loser: null };
}

function match(id: string, teamA: string, teamB: string, over: Partial<PublicMatch> = {}): PublicMatch {
    return {
        id, match_label: null, round_number: 1,
        team_a: team(teamA), team_b: team(teamB),
        sets: [], winner_team: null, next_match_id: null,
        status: 'scheduled', court_name: null, scheduled_at: null,
        ...over,
    };
}

function round(number: number, name: string, matches: PublicMatch[]): PublicRound {
    return { round_number: number, round_name: name, matches };
}

function standingRow(teamName: string, position: number): PublicStanding {
    return {
        position, is_disqualified: false, player_name: null, team_name: teamName,
        player_1: null, player_2: null, matches_played: 0, wins: 0, losses: 0,
        sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0, points: null,
    };
}

function baseBracket(over: Partial<PublicBracketData> = {}): PublicBracketData {
    return {
        tournament_id: 't', tournament_name: 'Cup', structure: 'single_elimination',
        club_name: null, club_logo_url: null, sponsors: [], videos: [],
        knockout_rounds: [], plate_rounds: [], league_standings: null, groups: null,
        third_place_match: null,
        ...over,
    };
}

function renderLayout(kind: LayoutKind, view: ViewMode, bracket: PublicBracketData, isBigScreen = false): void {
    render(<LiveLayoutView kind={kind} view={view} bracket={bracket} isBigScreen={isBigScreen} dir="ltr" />);
}

describe('single elimination (kind: knockout)', () => {
    const finalMatch = match('final', 'Team Falcons', 'Team Hawks', { status: 'completed', winner_team: 'team_a' });
    const thirdPlace = match('third', 'Team Eagles', 'Team Owls');
    const bracket = baseBracket({
        knockout_rounds: [round(1, 'Final', [finalMatch])],
        third_place_match: thirdPlace,
    });

    it('on a venue TV: the bracket tree, the champion, and the third-place match', () => {
        renderLayout('knockout', 'knockout', bracket, true);
        expect(screen.getByText('The Final')).toBeInTheDocument();
        expect(screen.getByText('Tournament Champion')).toBeInTheDocument(); // ChampionBar, present
        // "Team Falcons" names the final's winning side twice: once in the match card, once as
        // the champion under it — the second occurrence IS the assertion that showChampion fired.
        expect(screen.getAllByText('Team Falcons')).toHaveLength(2);
        expect(screen.getByText('3rd Place')).toBeInTheDocument();
        expect(screen.getByText('Team Eagles')).toBeInTheDocument(); // the third-place match itself
        // Nothing from any other kind's renderer leaked in.
        expect(screen.queryByText('League Table')).toBeNull();
        expect(screen.queryByText('No bracket data yet.')).toBeNull();
    });

    it('on a phone: the round, the champion, and the third-place match', () => {
        renderLayout('knockout', 'knockout', bracket, false);
        expect(screen.getByText('Tournament Champion')).toBeInTheDocument(); // ChampionBar, present
        expect(screen.getAllByText('Team Falcons')).toHaveLength(2); // the match card, and the champion
        expect(screen.getByText('3rd Place')).toBeInTheDocument();
        expect(screen.getByText('Team Eagles')).toBeInTheDocument();
        expect(screen.queryByText('The Final')).toBeNull(); // the TV tree's own heading, never on a phone
    });

    it('with no rounds yet: the empty board, not a crash', () => {
        renderLayout('knockout', 'knockout', baseBracket(), true);
        expect(screen.getByText('No bracket data yet.')).toBeInTheDocument();
    });
});

describe('group+knockout (kind: groups)', () => {
    const groupA: PublicGroup = { group_name: 'Group A', matches: [match('ga', 'Group A T1', 'Group A T2')], standings: [] };
    const groupB: PublicGroup = { group_name: 'Group B', matches: [match('gb', 'Group B T1', 'Group B T2')], standings: [] };
    const finalMatch = match('kfinal', 'Finalist One', 'Finalist Two', { status: 'completed', winner_team: 'team_a' });
    const plateMatch = match('plate1', 'Plate Team A', 'Plate Team B');
    const bracket = baseBracket({
        structure: 'group_then_knockout',
        groups: [groupA, groupB],
        knockout_rounds: [round(1, 'Final', [finalMatch])],
        plate_rounds: [round(1, 'Plate Final', [plateMatch])],
    });

    it('groups tab on a phone: the active group only, with its match list', () => {
        renderLayout('groups', 'groups', bracket, false);
        expect(screen.getByText('Group A T1')).toBeInTheDocument();
        expect(screen.getByText('Matches')).toBeInTheDocument(); // the match-list heading this tab has and 'standings' does not
        expect(screen.queryByText('Group B T1')).toBeNull(); // the other group is a tap away, not on screen
    });

    it("standings tab on a phone: every group's table, no match cards", () => {
        renderLayout('groups', 'standings', bracket, false);
        expect(screen.getByText('Group A')).toBeInTheDocument();
        expect(screen.getByText('Group B')).toBeInTheDocument();
        expect(screen.queryByText('Group A T1')).toBeNull(); // no match cards on this tab
        expect(screen.queryByText('Matches')).toBeNull();
    });

    it('knockout tab: the final and its champion, not a group or the plate', () => {
        renderLayout('groups', 'knockout', bracket, false);
        expect(screen.getByText('Tournament Champion')).toBeInTheDocument();
        expect(screen.getAllByText('Finalist One')).toHaveLength(2); // the match card, and the champion
        expect(screen.queryByText('Group A T1')).toBeNull();
        expect(screen.queryByText('Plate Team A')).toBeNull();
    });

    it('plate tab when a plate exists: the plate final, with no champion and no third place', () => {
        renderLayout('groups', 'plate', bracket, false);
        expect(screen.getByText('Plate Team A')).toBeInTheDocument();
        expect(screen.queryByText('Finalist One')).toBeNull(); // not the main knockout
        expect(screen.queryByText('Tournament Champion')).toBeNull(); // ChampionBar never renders on the plate
        expect(screen.queryByText('3rd Place')).toBeNull();
    });
});

describe('a league (kind: league)', () => {
    const bracket = baseBracket({
        structure: 'round_robin_league',
        league_standings: [standingRow('League Pair One', 1), standingRow('League Pair Two', 2)],
        // Different names than the standings rows above, on purpose — a league's table and its
        // round-robin round are two different lists, and reusing one name between them would hide
        // a `getByText` collision rather than prove the title/mode assertion below.
        knockout_rounds: [round(1, 'Round 1', [match('lm', 'Round Pair A', 'Round Pair B')])],
    });

    it('titles the table "League Table" in games mode, not points mode', () => {
        renderLayout('league', 'standings', bracket, false);
        expect(screen.getByText('League Table')).toBeInTheDocument();
        expect(screen.getByText('Games')).toBeInTheDocument();
        expect(screen.queryByText('Pts')).toBeNull();
        expect(screen.queryByText('T')).toBeNull();
        expect(screen.getByText('League Pair One')).toBeInTheDocument();
    });

    it('with no standings or rounds: the empty board', () => {
        renderLayout('league', 'standings', baseBracket({ structure: 'round_robin_league', league_standings: [] }), false);
        expect(screen.getByText('No bracket data yet.')).toBeInTheDocument();
    });
});

describe('a live Americano (kind: americano)', () => {
    const live = toLiveBoard(americanoBracket());             // RAW_BOARD: round 3 on court, no final drawn
    const withFinal = toLiveBoard(americanoBracket(FINAL_BOARD)); // the final round drawn

    it('table view: the standings in points mode', () => {
        renderLayout('americano', 'standings', live, false);
        expect(screen.getByText('Pts')).toBeInTheDocument();
        expect(screen.getByText('Noa L')).toBeInTheDocument();
        expect(screen.queryByText('League Table')).toBeNull(); // the league kind's title, never an Americano's
    });

    it('games view: the round on court, with no table alongside it', () => {
        renderLayout('americano', 'games', live, false);
        expect(screen.getAllByText('Noa L').length).toBeGreaterThanOrEqual(1); // round 3, on screen
        expect(screen.queryByText('Pts')).toBeNull();
        // `toLiveBoard` already put this Americano's rounds and table where a league keeps them
        // (../americano.ts), so a league's round-robin round looks the same as this one — the
        // only way to tell "the games view" apart from "a league wrongly dispatched" is that the
        // league kind always renders its table beside the rounds, and this view never does.
        expect(screen.queryByText('League Table')).toBeNull();
        expect(screen.queryByText('Games')).toBeNull();
    });

    it('final view: the final round staged under its own heading', () => {
        renderLayout('americano', 'final', withFinal, false);
        expect(screen.getByRole('heading', { name: 'The Final' })).toBeInTheDocument();
        expect(screen.queryByText('Pts')).toBeNull(); // the table, not shown on this tab
    });
});
