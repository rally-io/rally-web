import { describe, expect, it } from 'vitest';

import { getLiveLayout } from '../liveLayouts';
import { toLiveBoard } from '../americano';
import type { PublicBracketData, PublicMatch, PublicRound } from '../types';
import { FINAL_BOARD, RAW_BOARD, americanoBracket } from './fixtures/americanoBoard';

const match = (withPlayer: boolean): PublicMatch => ({
    id: 'm1', match_label: null, round_number: 1,
    team_a: withPlayer ? { team_name: null, player_1: { id: 'p1', first_name: 'Gal', last_name: 'L', skill_level: null, is_guest: null }, player_2: null } : null,
    team_b: null, sets: [], winner_team: null, next_match_id: null, status: 'scheduled', court_name: null, scheduled_at: null,
});
const round = (withPlayer: boolean): PublicRound => ({ round_number: 1, round_name: 'Round 1', matches: [match(withPlayer)] });

const bracket = (over: Partial<PublicBracketData>): PublicBracketData => ({
    tournament_id: 't', tournament_name: 'Cup', structure: 'group_then_knockout',
    club_name: null, club_logo_url: null, sponsors: [], videos: [],
    knockout_rounds: [], plate_rounds: [], league_standings: null, groups: null, third_place_match: null,
    ...over,
});
const live = (board: unknown = RAW_BOARD): PublicBracketData => toLiveBoard(americanoBracket(board));
const groups = [{ group_name: 'Group A', matches: [match(true)], standings: [] }];

describe('getLiveLayout', () => {
    it('no bracket yet: the knockout layout, no tabs, no rotation', () => {
        const layout = getLiveLayout(null);
        expect(layout).toMatchObject({ kind: 'knockout', showTabs: false, canAutoRotate: false, rotationViews: [], defaultView: 'knockout' });
    });

    it('a single elimination: one screen, never rotates, accepts no pick', () => {
        const layout = getLiveLayout(bracket({ structure: 'single_elimination', knockout_rounds: [round(true)] }));
        expect(layout).toMatchObject({ kind: 'knockout', showTabs: false, canAutoRotate: false, rotationViews: [], defaultView: 'knockout' });
        expect(layout.tabs(true)).toEqual(['knockout']);
        expect(layout.accepts('groups')).toBe(false);
    });

    it('a league, and an Americano before its schedule: the league layout on standings', () => {
        for (const b of [bracket({ structure: 'round_robin_league' }), live({ ...RAW_BOARD, rounds: [], resting: {} })]) {
            const layout = getLiveLayout(b);
            expect(layout).toMatchObject({ kind: 'league', showTabs: false, canAutoRotate: false, defaultView: 'standings' });
            expect(layout.tabs(false)).toEqual(['standings']);
        }
    });

    it('group+knockout in the group phase: groups/games on a TV, groups/standings on a phone', () => {
        const layout = getLiveLayout(bracket({ groups }));
        expect(layout).toMatchObject({ kind: 'groups', showTabs: true, canAutoRotate: true, defaultView: 'groups', stage: 'group' });
        expect(layout.rotationViews).toEqual(['groups', 'games']);
        expect(layout.tabs(true)).toEqual(['groups', 'games', 'knockout']);
        expect(layout.tabs(false)).toEqual(['groups', 'standings', 'knockout']);
    });

    it('group+knockout with no groups drawn: one view, so no rotate toggle', () => {
        const layout = getLiveLayout(bracket({}));
        expect(layout.rotationViews).toEqual(['games']);
        expect(layout.canAutoRotate).toBe(false);
    });

    it('group+knockout in the knockout phase with a plate: the plate tab, and a pick of it only while it exists', () => {
        const withPlate = getLiveLayout(bracket({ groups, knockout_rounds: [round(true)], plate_rounds: [round(false)] }));
        expect(withPlate).toMatchObject({ defaultView: 'knockout', stage: 'knockout' });
        expect(withPlate.tabs(true)).toEqual(['groups', 'games', 'knockout', 'plate']);
        expect(withPlate.accepts('plate')).toBe(true);
        const noPlate = getLiveLayout(bracket({ groups, knockout_rounds: [round(true)] }));
        expect(noPlate.accepts('plate')).toBe(false);
        expect(noPlate.accepts('standings')).toBe(true);
    });

    it('a live Americano: Standings and Matches, the games first on a TV', () => {
        const layout = getLiveLayout(live());
        expect(layout).toMatchObject({ kind: 'americano', showTabs: true, canAutoRotate: true, defaultView: 'standings', takeover: null });
        expect(layout.rotationViews).toEqual(['games', 'standings']);
        expect(layout.tabs(true)).toEqual(['standings', 'games']);
        expect(layout.accepts('final')).toBe(false);
    });

    it('an Americano with its final drawn: a Final tab that takes over every screen', () => {
        const layout = getLiveLayout(live(FINAL_BOARD));
        expect(layout).toMatchObject({ defaultView: 'final', takeover: 'final' });
        expect(layout.rotationViews).toEqual(['final', 'standings']);
        expect(layout.tabs(false)).toEqual(['standings', 'games', 'final']);
        expect(layout.accepts('final')).toBe(true);
        expect(layout.accepts('knockout')).toBe(false);
    });
});
