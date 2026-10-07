import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { PublicBracketData } from '../types';

vi.mock('../api/publicBracket', () => ({ fetchPublicBracket: vi.fn() }));
import { fetchPublicBracket } from '../api/publicBracket';
import PublicTournamentPage from '../pages/PublicTournamentPage';
import { FINAL_BOARD, RAW_BOARD, americanoBracket, rawPlayer } from './fixtures/americanoBoard';

/** `matches` decides phone (false) or venue TV (true); jsdom has no matchMedia of its own. */
function setScreen(isBig: boolean): void {
    window.matchMedia = ((query: string) => ({
        matches: isBig, media: query, onchange: null,
        addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

/**
 * The mocked fetch returns the bracket exactly as `fetchPublicBracket` would after parsing — the
 * Americano still in its own block. Everything after that is the real page, including the
 * `toLiveBoard` select in usePublicBracket.
 */
function renderPage(bracket: PublicBracketData): void {
    vi.mocked(fetchPublicBracket).mockResolvedValue(bracket);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={['/live/tok']}>
                <Routes><Route path="/live/:token" element={<PublicTournamentPage />} /></Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

/**
 * The Americano's table title, not the "Standings" tab button that sits beside it now that a
 * live Americano gets tabs (owner 2026-10-03): the tab's own text also matches `findByText`.
 */
async function standingsCard(isBig = false): Promise<HTMLElement> {
    // The venue screen draws the table as group-style cards headed by the places they hold.
    const title = isBig
        ? await screen.findByText(/^Places 1–/)
        : (await screen.findAllByText('Standings')).find(el => !el.closest('button')) as HTMLElement;
    return title.closest('.overflow-hidden') as HTMLElement;
}

/** Open a tab by its label (the tab bar's button). */
async function openTab(label: string): Promise<void> {
    const tab = (await screen.findAllByRole('button', { name: label }))[0];
    await userEvent.click(tab);
}

describe('the live page for an Americano', () => {
    it.each([false, true])('draws its table in points mode (big screen: %s)', async isBig => {
        setScreen(isBig);
        renderPage(americanoBracket());
        if (isBig) await openTab('Standings');
        const table = await standingsCard(isBig);
        expect(within(table).getByText('T')).toBeInTheDocument();
        expect(within(table).getByText('Pts')).toBeInTheDocument();
        expect(within(table).getByText('Noa L')).toBeInTheDocument();
        expect(within(table).getByText('Disqualified')).toBeInTheDocument();
        expect(screen.queryByText('League Table')).toBeNull();
        expect(screen.queryByText('No bracket data yet.')).toBeNull();
    });

    it('opens on the round on court and shows its games, four names each', async () => {
        setScreen(false);
        renderPage(americanoBracket());
        await openTab('Matches');
        // Round 3 is on screen: Noa + Dan vs Gal + Maya, unplayed; the table is on its own tab.
        ['Noa L', 'Dan L', 'Gal L', 'Maya L'].forEach(name => expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1));
        expect(screen.queryByText('Pts')).toBeNull();
        expect(screen.queryByTestId('round-note')).toBeNull();                    // nobody rests in round 3
    });

    it('steps back to round 2: the walkover, the resting line, never the cancelled game', async () => {
        setScreen(false);
        renderPage(americanoBracket());
        await openTab('Matches');
        await userEvent.click(screen.getByRole('button', { name: /Round 2/ }));
        expect(screen.getByTestId('round-note')).toHaveTextContent('Resting: Dan L, Gal L, Roi L, Maya L');
        expect(screen.getAllByText('W/O')).toHaveLength(1);
        // Eden was disqualified and their game cancelled: not on the Matches tab at all.
        expect(screen.queryByText('Eden L')).toBeNull();
    });

    it('prints resting names as typed — an apostrophe, a geresh or an ampersand is never an HTML entity', async () => {
        // i18next escapes interpolated values for HTML by default; React already escapes text, so
        // an escaped value would reach the screen as a literal "&#39;" or "&amp;".
        setScreen(false);
        const resting = { ...RAW_BOARD.resting, '3': [rawPlayer("O'Neil"), rawPlayer('Tom & Jerry'), rawPlayer("ג'ורג'")] };
        renderPage(americanoBracket({ ...RAW_BOARD, resting }));
        await openTab('Matches');
        expect(screen.getByTestId('round-note').textContent).toBe("Resting: O'Neil L, Tom & Jerry L, ג'ורג' L");
    });

    it('labels the tie in round 1', async () => {
        setScreen(false);
        renderPage(americanoBracket());
        await openTab('Matches');
        await userEvent.click(screen.getByRole('button', { name: /Round 1/ }));
        expect(screen.getByText('Tie')).toBeInTheDocument();
    });

    it.each([false, true])('before the schedule exists shows the empty board a league shows before its draw (big screen: %s)', async isBig => {
        // Production has one of these today (Din's, registration open, schedule generated on the
        // evening): the block carries registered players at zero and no rounds.
        setScreen(isBig);
        renderPage(americanoBracket({ ...RAW_BOARD, rounds: [], resting: {}, current_round: null }));
        expect(await screen.findByText('No bracket data yet.')).toBeInTheDocument();
        expect(screen.getByText('Check back once the draw has been generated.')).toBeInTheDocument();
        expect(screen.queryByText('Standings')).toBeNull();
        expect(screen.queryByText('Noa L')).toBeNull();
        expect(screen.getByText('Tuesday Americano')).toBeInTheDocument();
    });

    it('falls back to the empty board when the block is missing', async () => {
        setScreen(false);
        renderPage(americanoBracket(null));
        expect(await screen.findByText('No bracket data yet.')).toBeInTheDocument();
        expect(screen.getByText('Tuesday Americano')).toBeInTheDocument();
    });

    it('has Standings and Matches tabs, and a Final tab only once the final is drawn', async () => {
        setScreen(false);
        renderPage(americanoBracket());
        expect((await screen.findAllByRole('button', { name: 'Matches' })).length).toBeGreaterThan(0);
        expect(screen.queryAllByRole('button', { name: 'Final' })).toHaveLength(0);
    });

    it('jumps to the final once drawn; the Matches tab leaves it out', async () => {
        setScreen(false);
        renderPage(americanoBracket(FINAL_BOARD));
        // The Final tab, and the final staged under its own heading.
        expect(await screen.findByRole('button', { name: 'Final' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'The Final' })).toBeInTheDocument();
        expect(screen.queryByText('Pts')).toBeNull();                            // not the table
        await openTab('Matches');
        expect(screen.queryAllByRole('button', { name: /Final/ }).filter(b => b.textContent === 'Final')).toHaveLength(1); // the tab only
        expect(screen.getAllByRole('button', { name: /Round 3/ }).length).toBeGreaterThan(0);
    });

    it('a final whose every game is cancelled gets no Final tab, and Standings stays highlighted', async () => {
        setScreen(false);
        const cancelledFinal = {
            ...FINAL_BOARD,
            rounds: FINAL_BOARD.rounds.map(r => (r.round_number === 4
                ? { ...r, matches: r.matches.map(m => ({ ...m, status: 'cancelled' })) }
                : r)),
        };
        renderPage(americanoBracket(cancelledFinal));
        const standingsTab = (await screen.findAllByRole('button', { name: 'Standings' }))[0];
        expect(screen.getByRole('button', { name: 'Matches' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Final' })).toBeNull();
        // The content already falls back to the table either way (finalRounds is empty), so the
        // highlighted tab is the only thing on screen the hook/page disagreement changes: before the
        // fix the hook lands on a 'final' view no tab in the list matches, so nothing lights up.
        expect(standingsTab.className).toContain('bg-(--pb-accent-bg)');
    });

    it('names who sits the final out, like every Matches round does', async () => {
        setScreen(false);
        const resting = { ...FINAL_BOARD.resting, '4': [rawPlayer('Zohar'), rawPlayer('Yuval')] };
        renderPage(americanoBracket({ ...FINAL_BOARD, resting }));
        await openTab('Final');
        expect(screen.getByTestId('round-note')).toHaveTextContent('Resting: Zohar L, Yuval L');
    });

    it('a venue TV offers the rotate toggle', async () => {
        setScreen(true);
        renderPage(americanoBracket());
        expect(await screen.findByRole('button', { name: 'Auto rotate' })).toBeInTheDocument();
    });
});

describe('the live page for a league is unchanged', () => {
    const league: PublicBracketData = {
        tournament_id: 'l', tournament_name: 'Sunday League', structure: 'round_robin_league',
        club_name: null, club_logo_url: null, sponsors: [], videos: [],
        knockout_rounds: [{
            round_number: 1, round_name: 'Round 1', matches: [{
                id: 'lm', match_label: null, round_number: 1,
                team_a: { team_name: 'Pair One', player_1: null, player_2: null, is_lucky_loser: null },
                team_b: { team_name: 'Pair Two', player_1: null, player_2: null, is_lucky_loser: null },
                sets: [], winner_team: null, next_match_id: null, status: 'scheduled', court_name: 'Court 1', scheduled_at: null,
            }],
        }],
        plate_rounds: [], groups: null, third_place_match: null,
        league_standings: [{
            position: 1, is_disqualified: false, player_name: null, team_name: 'Pair One', player_1: null, player_2: null,
            matches_played: 0, wins: 0, losses: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0, points: null,
        }],
    };

    it('before its draw shows the empty board — the state an Americano before its schedule must match', async () => {
        setScreen(false);
        renderPage({ ...league, knockout_rounds: [], league_standings: [] });
        expect(await screen.findByText('No bracket data yet.')).toBeInTheDocument();
        expect(screen.getByText('Check back once the draw has been generated.')).toBeInTheDocument();
    });

    it('keeps its title and its games columns, with no T, points or resting line', async () => {
        setScreen(false);
        renderPage(league);
        expect(await screen.findByText('League Table')).toBeInTheDocument();
        expect(screen.getByText('Games')).toBeInTheDocument();
        expect(screen.queryByText('T')).toBeNull();
        expect(screen.queryByText('Pts')).toBeNull();
        expect(screen.queryByTestId('round-note')).toBeNull();
        expect(screen.queryAllByRole('button', { name: 'Matches' })).toHaveLength(0);   // still no tabs
    });
});
