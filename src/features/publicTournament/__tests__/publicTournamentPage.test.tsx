import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { PublicBracketData, PublicMatch } from '../types';

vi.mock('../api/publicBracket', () => ({ fetchPublicBracket: vi.fn() }));
import { fetchPublicBracket } from '../api/publicBracket';
import PublicTournamentPage from '../pages/PublicTournamentPage';

// jsdom implements neither of these, and the page reads both before it renders anything:
// `useMediaQuery` decides TV-vs-phone, and TvCanvas measures itself to pick a scale.
beforeAll(() => {
    window.matchMedia = ((query: string) => ({
        matches: true, // the venue screen — this suite is about the TV footer
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
});

const player = (id: string, first: string) => ({
    id, first_name: first, last_name: 'Levi', skill_level: null, is_guest: null,
});

const match = (over: Partial<PublicMatch>): PublicMatch => ({
    id: 'm', match_label: null, round_number: 1,
    team_a: { team_name: null, player_1: player('p1', 'Gal'), player_2: null, is_lucky_loser: null },
    team_b: { team_name: null, player_1: player('p2', 'Adi'), player_2: null, is_lucky_loser: null },
    sets: [], winner_team: null, next_match_id: null,
    status: 'scheduled', court_name: 'Court 1', scheduled_at: '2026-08-11T10:00:00Z',
    ...over,
});

/** A mid-tournament board: one match live on a named court, one already finished. */
const bracket = (): PublicBracketData => ({
    tournament_id: 't', tournament_name: 'Evening Cup', structure: 'group_then_knockout',
    club_name: null, club_logo_url: null, sponsors: [], videos: [],
    knockout_rounds: [], plate_rounds: [], league_standings: null, third_place_match: null,
    groups: [{
        group_name: 'Group A',
        matches: [
            match({ id: 'live', status: 'in_progress', court_name: 'Court 1', sets: [{ team_a_score: 4, team_b_score: 3, is_tiebreak: null }] }),
            match({ id: 'done', status: 'completed', court_name: 'Court 2', sets: [{ team_a_score: 6, team_b_score: 2, is_tiebreak: null }], winner_team: 'team_a' }),
            match({ id: 'later', status: 'scheduled', court_name: 'Court 2', scheduled_at: '2026-08-11T12:00:00Z' }),
        ],
        standings: [],
    }],
});

function renderPage(): void {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={['/live/tok']}>
                <Routes><Route path="/live/:token" element={<PublicTournamentPage />} /></Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

/** The rail's own tile heading. Scoped to the footer because a lane card's header also carries
 *  the court name, as "Live · Court 1" — the whole reason the rail was thought redundant there. */
function footerCourts(): string[] {
    const footer = document.querySelector('footer');
    if (!footer) throw new Error('no footer — the TV shell did not render');
    return within(footer).queryAllByText(/^Court \d+$/).map(el => el.textContent ?? '');
}

describe('the venue footer', () => {
    it('keeps the court rail on the matches tab, not only on the groups tab', async () => {
        // The regression this pins: the rail was gated on `view !== 'games'`, so rotating to the
        // lanes emptied the footer to just the QR panel — a band of dead space arriving and
        // leaving every 12 seconds on an unattended screen.
        vi.mocked(fetchPublicBracket).mockResolvedValue(bracket());
        renderPage();

        await waitFor(() => expect(screen.getByRole('button', { name: 'Groups' })).toBeInTheDocument());
        expect(footerCourts()).toEqual(['Court 1', 'Court 2']);

        await userEvent.click(screen.getByRole('button', { name: 'Matches' }));

        expect(footerCourts()).toEqual(['Court 1', 'Court 2']);
    });

    it('still renders nothing in the rail when no match names a court', async () => {
        // The gate that remains is the rail's own: no courts, no tiles — on every view, so the
        // fix above cannot resurrect an empty row of placeholders.
        const noCourts = bracket();
        noCourts.groups![0].matches = noCourts.groups![0].matches.map(m => ({ ...m, court_name: null }));
        vi.mocked(fetchPublicBracket).mockResolvedValue(noCourts);
        renderPage();

        await waitFor(() => expect(screen.getByRole('button', { name: 'Groups' })).toBeInTheDocument());
        expect(footerCourts()).toEqual([]);
    });
});
