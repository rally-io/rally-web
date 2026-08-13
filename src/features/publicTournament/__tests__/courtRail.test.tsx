import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CourtRail } from '../components/CourtRail';
import type { PublicBracketData, PublicMatch } from '../types';

const player = (id: string, first: string) => ({
    id, first_name: first, last_name: 'P', skill_level: null, is_guest: null,
});

const match = (over: Partial<PublicMatch>): PublicMatch => ({
    id: 'm', match_label: null, round_number: 1,
    team_a: { team_name: null, player_1: player('p1', 'Gal'), player_2: null, is_lucky_loser: null },
    team_b: { team_name: null, player_1: player('p2', 'Adi'), player_2: null, is_lucky_loser: null },
    sets: [], winner_team: null, next_match_id: null,
    status: 'scheduled', court_name: 'Court 1', scheduled_at: '2026-08-11T10:00:00Z',
    ...over,
});

const bracket = (matches: PublicMatch[]): PublicBracketData => ({
    tournament_id: 't', tournament_name: 'T', structure: 'group_then_knockout',
    club_name: null, club_logo_url: null, sponsors: [], videos: [],
    knockout_rounds: [], plate_rounds: [], league_standings: null, third_place_match: null,
    groups: [{ group_name: 'Group A', matches, standings: [] }],
});

describe('CourtRail', () => {
    it('shows a live match with per-set scores, never a joined score string', () => {
        render(<CourtRail bracket={bracket([
            match({ id: 'live', status: 'in_progress', sets: [{ team_a_score: 6, team_b_score: 4, is_tiebreak: null }] }),
        ])} />);
        expect(screen.getByText('Court 1')).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.queryByText('6:4')).toBeNull();
    });

    it('shows the earliest upcoming match when nothing is live on that court', () => {
        render(<CourtRail bracket={bracket([
            match({ id: 'late', scheduled_at: '2026-08-11T14:00:00Z', team_a: { team_name: 'Late', player_1: null, player_2: null, is_lucky_loser: null } }),
            match({ id: 'early', scheduled_at: '2026-08-11T10:00:00Z', team_a: { team_name: 'Early', player_1: null, player_2: null, is_lucky_loser: null } }),
        ])} />);
        expect(screen.getByText('Early')).toBeInTheDocument();
        expect(screen.queryByText('Late')).toBeNull();
    });

    it('renders nothing at all when no match names a court', () => {
        const { container } = render(<CourtRail bracket={bracket([match({ court_name: null })])} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('drops a court whose matches are all finished, rather than a TBD tile', () => {
        render(<CourtRail bracket={bracket([
            match({ id: 'done', status: 'completed', court_name: 'Court 1' }),
            match({ id: 'live', status: 'in_progress', court_name: 'Court 2', sets: [{ team_a_score: 6, team_b_score: 4, is_tiebreak: null }] }),
        ])} />);
        expect(screen.queryByText('Court 1')).toBeNull();
        expect(screen.getByText('Court 2')).toBeInTheDocument();
    });

    it('renders nothing at all when every court has nothing live or next', () => {
        const { container } = render(<CourtRail bracket={bracket([
            match({ id: 'a', status: 'completed', court_name: 'Court 1' }),
            match({ id: 'b', status: 'walkover', court_name: 'Court 2' }),
        ])} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows every court, with no cap', () => {
        // Two clubs in the database run 11 and 16 courts. The old six-tile cap dropped the rest
        // silently, so a player on Court 12 never saw their match down there at all.
        const names = Array.from({ length: 16 }, (_, i) => `Court ${i + 1}`);
        render(<CourtRail bracket={bracket(names.map((court, i) =>
            match({ id: `m${i}`, court_name: court, scheduled_at: `2026-08-11T${10 + (i % 12)}:00:00Z` }),
        ))} />);
        expect(screen.getAllByText(/^Court \d+$/)).toHaveLength(16);
        expect(screen.getByText('Court 12')).toBeInTheDocument();
    });

    it('never truncates a team name — the line shrinks instead', () => {
        render(<CourtRail bracket={bracket([
            match({ id: 'live', status: 'in_progress', sets: [{ team_a_score: 6, team_b_score: 4, is_tiebreak: null }] }),
        ])} />);
        // Both sides of the tile, not just the leading one: the second name is the muted line
        // and was a separate truncating span before FitText.
        ['Gal P', 'Adi P'].forEach(name => {
            const line = screen.getByText(name);
            expect(line.className).not.toContain('truncate');
            expect(line.title).toBe(name);
        });
    });

    it('keeps natural court order, so Court 9 still precedes Court 10', () => {
        const names = ['Court 1', 'Court 2', 'Court 3', 'Court 4', 'Court 9', 'Court 10', 'Court 11'];
        render(<CourtRail bracket={bracket(names.map((court, i) =>
            match({ id: `m${i}`, court_name: court, scheduled_at: `2026-08-11T${10 + i}:00:00Z` }),
        ))} />);
        const rendered = screen.getAllByText(/^Court \d+$/).map(el => el.textContent);
        expect(rendered).toEqual(names);
    });
});

describe('CourtRail motion', () => {
    // jsdom does no layout, so the rail's own measurement always reads 0 and it never scrolls
    // there. These stub ResizeObserver to feed it a width, which is the only way the scrolling
    // branch is reachable in CI at all.
    const stubWidth = (width: number): void => {
        class RO {
            constructor(private cb: ResizeObserverCallback) {}
            observe(el: Element): void {
                this.cb([{ target: el, contentRect: { width } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
            }
            unobserve(): void {}
            disconnect(): void {}
        }
        vi.stubGlobal('ResizeObserver', RO);
    };

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const eightCourts = (): PublicMatch[] =>
        Array.from({ length: 8 }, (_, i) => match({ id: `m${i}`, court_name: `Court ${i + 1}`, scheduled_at: `2026-08-11T${10 + i}:00:00Z` }));

    it('stays still when the courts fit, and renders each tile exactly once', () => {
        // 8 tiles need 8*208 + 7*10 = 1734px. A rail wider than that has nothing to reveal, so
        // motion here would be decoration — the thing this design deliberately does not do.
        stubWidth(1800);
        const { container } = render(<CourtRail bracket={bracket(eightCourts())} />);
        expect(container.querySelector('.pb-rail-track')).toBeNull();
        expect(screen.getAllByText(/^Court \d+$/)).toHaveLength(8);
    });

    it('scrolls once the courts outgrow the rail, duplicating the tiles for a seamless loop', () => {
        stubWidth(1200); // 1734px of tiles into 1200px
        const { container } = render(<CourtRail bracket={bracket(eightCourts())} />);
        const track = container.querySelector('.pb-rail-track');
        expect(track).not.toBeNull();
        // Two copies: the animation travels exactly half the track, landing on the duplicate's
        // first tile, which is what makes the wrap invisible.
        expect(container.querySelectorAll('[class*="rounded-xl"][class*="border"]')).toHaveLength(16);
        // Duration scales with the count so a 16-court rail is no faster than an 8-court one.
        expect(track!.getAttribute('style')).toContain('--pb-rail-dur: 40s');
    });

    it('hides the duplicate from assistive tech, so no court is announced twice', () => {
        stubWidth(1200);
        const { container } = render(<CourtRail bracket={bracket(eightCourts())} />);
        const rail = container.querySelector('[data-testid="court-rail"]');
        if (!rail) throw new Error('court rail not found');
        // rail > track > tiles.
        const tiles = Array.from(rail.querySelectorAll(':scope > div > div'));
        expect(tiles).toHaveLength(16);
        // Asserted on the attribute, not via a query: getAllByText does NOT skip aria-hidden
        // subtrees, so counting rendered text would pass whether or not the flag were set.
        expect(tiles.slice(0, 8).some(el => el.hasAttribute('aria-hidden'))).toBe(false);
        expect(tiles.slice(8).every(el => el.getAttribute('aria-hidden') === 'true')).toBe(true);
    });
});
