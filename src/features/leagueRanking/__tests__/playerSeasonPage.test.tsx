import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { LeagueResult, PublicPlayerSeason } from '../types';

vi.mock('../api/publicLeague', () => ({ fetchPublicPlayerSeason: vi.fn() }));

import { fetchPublicPlayerSeason } from '../api/publicLeague';
import PlayerSeasonPage from '../pages/PlayerSeasonPage';

const result = (id: string, points: number, counted: boolean): LeagueResult => ({
  tournament_id: id,
  tournament_name: `Cup ${id}`,
  placement_bucket: 'first',
  final_position: 1,
  band_code: 'B',
  draw_size: 16,
  points,
  counted,
  awarded_at: '2026-08-01T00:00:00Z',
});

const season = (overrides: Partial<PublicPlayerSeason> = {}): PublicPlayerSeason => ({
  season: {
    id: 's1',
    name: 'Season 1',
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2026-12-31T00:00:00Z',
    counting_results: 2,
    is_active: true,
    quarters: [],
  },
  player_id: 'p1',
  first_name: 'Noa',
  last_name: 'Levi',
  avatar_url: null,
  avatar_clean_url: null,
  points: 421,
  global_rank: 47,
  rank_change: 4,
  movement_reason: null,
  band_code: null,
  is_provisional: false,
  level_rank: null,
  gap_to_above: null,
  career_points: 0,
  quarters: [],
  results: [],
  ...overrides,
});

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/ranking/player/p1']}>
        <Routes>
          <Route path="/ranking/player/:id" element={<PlayerSeasonPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('PlayerSeasonPage', () => {
  it('renders the player, their points and their server rank', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ results: [result('t1', 150, true)] }));

    renderPage();

    const header = await screen.findByTestId('player-season-header');
    expect(within(header).getByText(/Noa/)).toBeTruthy();
    expect(within(header).getByText(/47/)).toBeTruthy();
    expect(within(header).getByText(/421/)).toBeTruthy();
  });

  it('groups results by quarter, newest first, with each quarter\'s total and last counting day', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      quarters: [
        { key: '2026-Q2', starts_at: '', ends_at: '', drops_at: '2027-03-31T21:00:00Z', points: 150, available: 150, results: [result('t1', 150, true)] },
        { key: '2026-Q3', starts_at: '', ends_at: '', drops_at: '2027-06-30T21:00:00Z', points: 135, available: 200, results: [result('t2', 90, true), result('t3', 45, true)] },
      ],
      results: [result('t2', 90, true), result('t3', 45, true), result('t1', 150, true)],
    }));
    renderPage();
    const sections = await screen.findAllByTestId(/^player-season-quarter-/);
    expect(sections.map(s => s.getAttribute('data-quarter'))).toEqual(['2026-Q3', '2026-Q2']);
    const q3 = screen.getByTestId('player-season-quarter-2026-Q3');
    expect(within(q3).getByTestId('player-season-result-t2')).toBeTruthy();
    expect(within(q3).getByTestId('player-season-result-t3')).toBeTruthy();
    expect(q3).toHaveTextContent('135');
    expect(q3).toHaveTextContent('30.6.2027');
    expect(screen.queryByTestId('player-season-dropped')).toBeNull();
  });

  it('renders an empty quarter as a line, and the career total in the header', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      career_points: 500,
      quarters: [{ key: '2026-Q3', starts_at: '', ends_at: '', drops_at: '2027-06-30T21:00:00Z', points: 0, available: 0, results: [] }],
      results: [],
    }));
    renderPage();
    const q3 = await screen.findByTestId('player-season-quarter-2026-Q3');
    expect(within(q3).getByText(/did not play|לא שיחקתם/)).toBeTruthy();
    expect(screen.getByTestId('player-season-career')).toHaveTextContent('500');
  });

  it('renders a not-found state for an unknown player, distinct from an error', async () => {
    const notFound = Object.assign(new Error('Request failed with status code 404'), {
      isAxiosError: true,
      response: { status: 404 },
    });
    vi.mocked(fetchPublicPlayerSeason).mockRejectedValue(notFound);

    renderPage();

    expect(await screen.findByTestId('player-season-not-found')).toBeTruthy();
    expect(screen.queryByTestId('player-season-error')).toBeNull();
  });

  it('renders an error state for a failure that is not a 404', async () => {
    // Telling a visitor a player does not exist because the network hiccuped is a lie
    // the page can avoid, so the two states are kept apart.
    const boom = Object.assign(new Error('boom'), {
      isAxiosError: true,
      response: { status: 500 },
    });
    vi.mocked(fetchPublicPlayerSeason).mockRejectedValue(boom);

    renderPage();

    expect(await screen.findByTestId('player-season-error')).toBeTruthy();
    expect(screen.queryByTestId('player-season-not-found')).toBeNull();
  });

  it('renders an empty state, not a blank page, for a player with no results', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ results: [] }));

    renderPage();

    const results = await screen.findByTestId('player-season-results');
    expect(within(results).getByText(/No results in the window yet/i)).toBeTruthy();
  });
});
