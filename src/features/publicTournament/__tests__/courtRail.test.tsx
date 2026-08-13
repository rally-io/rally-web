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

/** Every tile in the rail, in render order. */
const tiles = (container: HTMLElement): Element[] => {
    const rail = container.querySelector('[data-testid="court-rail"]');
    if (!rail) throw new Error('court rail not rendered');
    return Array.from(rail.querySelectorAll(':scope > div > div'));
};

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

    it('queues every upcoming match, not one per court', () => {
        // Keyed on court, this rendered TWO tiles for these four matches and the later pair had
        // nowhere to appear — no amount of scrolling reached them.
        const { container } = render(<CourtRail bracket={bracket([
            match({ id: 'a', court_name: 'Court 1', scheduled_at: '2026-08-11T10:00:00Z' }),
            match({ id: 'b', court_name: 'Court 2', scheduled_at: '2026-08-11T10:00:00Z' }),
            match({ id: 'c', court_name: 'Court 1', scheduled_at: '2026-08-11T11:00:00Z' }),
            match({ id: 'd', court_name: 'Court 2', scheduled_at: '2026-08-11T11:00:00Z' }),
        ])} />);
        expect(tiles(container)).toHaveLength(4);
    });

    it('still queues a match the CRM has not put on a court', () => {
        // The whole rail used to vanish for a club that seeds courts on the night.
        const { container } = render(<CourtRail bracket={bracket([
            match({ id: 'nocourt', court_name: null }),
        ])} />);
        expect(tiles(container)).toHaveLength(1);
        expect(screen.getByText('Gal P')).toBeInTheDocument();
        // No court to name, so no court label — but the tile is there.
        expect(screen.queryByText(/^Court/)).toBeNull();
    });

    it('renders nothing at all when every match is finished', () => {
        const { container } = render(<CourtRail bracket={bracket([
            match({ id: 'a', status: 'completed' }),
            match({ id: 'b', status: 'walkover' }),
        ])} />);
        expect(container).toBeEmptyDOMElement();
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

    const eightMatches = (): PublicMatch[] =>
        Array.from({ length: 8 }, (_, i) => match({
            id: `m${i}`, court_name: `Court ${i + 1}`,
            scheduled_at: `2026-08-11T${String(10 + i).padStart(2, '0')}:00:00Z`,
        }));

    it('stays still when the queue fits, and renders each tile exactly once', () => {
        // 8 tiles need 8*208 + 7*10 = 1734px. A rail wider than that has nothing to reveal, so
        // motion here would be decoration — the thing this design deliberately does not do.
        stubWidth(1800);
        const { container } = render(<CourtRail bracket={bracket(eightMatches())} />);
        expect(container.querySelector('.pb-rail-track')).toBeNull();
        expect(tiles(container)).toHaveLength(8);
    });

    it('scrolls once the queue outgrows the rail, duplicating the tiles for a seamless loop', () => {
        stubWidth(1200); // 1734px of tiles into 1200px
        const { container } = render(<CourtRail bracket={bracket(eightMatches())} />);
        const track = container.querySelector('.pb-rail-track');
        expect(track).not.toBeNull();
        // Two copies: the animation travels exactly half the track, landing on the duplicate's
        // first tile, which is what makes the wrap invisible.
        expect(tiles(container)).toHaveLength(16);
        // Duration scales with the count so a ten-match queue is no faster than an eight.
        expect(track!.getAttribute('style')).toContain('--pb-rail-dur: 40s');
    });

    it('hides the duplicate from assistive tech, so no match is announced twice', () => {
        stubWidth(1200);
        const { container } = render(<CourtRail bracket={bracket(eightMatches())} />);
        const all = tiles(container);
        expect(all).toHaveLength(16);
        // Asserted on the attribute, not via a query: getAllByText does NOT skip aria-hidden
        // subtrees, so counting rendered text would pass whether or not the flag were set.
        expect(all.slice(0, 8).some(el => el.hasAttribute('aria-hidden'))).toBe(false);
        expect(all.slice(8).every(el => el.getAttribute('aria-hidden') === 'true')).toBe(true);
    });

    it('caps a tile so a two-match queue does not stretch across the whole footer', () => {
        // Unbounded, two tiles took 635px each and read as two balloons with their content
        // pinned to the far edges.
        stubWidth(1800);
        const { container } = render(<CourtRail bracket={bracket([
            match({ id: 'a', court_name: 'Court 1' }),
            match({ id: 'b', court_name: 'Court 2', scheduled_at: '2026-08-11T11:00:00Z' }),
        ])} />);
        tiles(container).forEach(tile => {
            expect((tile as HTMLElement).style.maxWidth).toBe('272px');
        });
    });
});
