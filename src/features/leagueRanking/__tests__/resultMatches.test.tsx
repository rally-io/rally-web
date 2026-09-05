import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { LeagueResult, PublicPlayerMatch, PublicPlayerSeason } from '../types';

vi.mock('../api/publicLeague', () => ({
  fetchPublicPlayerSeason: vi.fn(),
  fetchPublicPlayerMatches: vi.fn(),
}));

import { fetchPublicPlayerSeason, fetchPublicPlayerMatches } from '../api/publicLeague';
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

const season = (
  results: LeagueResult[],
  stats: PublicPlayerSeason['stats'] = null,
): PublicPlayerSeason => ({
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
  // The page now renders results grouped by quarter, so these tests (which only
  // care about row expand/collapse and match orientation, not grouping) need
  // their fixture results to actually live inside one, or no row ever mounts.
  quarters:
    results.length > 0
      ? [
          {
            key: '2026-Q3',
            starts_at: '',
            ends_at: '',
            drops_at: '2026-09-30T21:00:00Z',
            points: results.reduce((sum, r) => sum + r.points, 0),
            available: results.reduce((sum, r) => sum + r.points, 0),
            results,
          },
        ]
      : [],
  results,
  stats,
});

const match = (id: string, won: boolean | null): PublicPlayerMatch => ({
  match_id: id,
  round_name: 'Group A',
  completed_at: '2026-08-01T10:00:00Z',
  won,
  partner: {
    player_id: null,
    first_name: 'Guest',
    last_name: 'Partner',
    avatar_url: null,
    avatar_clean_url: null,
  },
  opponents: [
    {
      player_id: 'o1',
      first_name: 'Opp',
      last_name: 'One',
      avatar_url: null,
      avatar_clean_url: null,
    },
  ],
  sets:
    won == null
      ? []
      : [
          { set_number: 1, my_score: 6, opponent_score: 3, is_tiebreak: false },
          { set_number: 2, my_score: 6, opponent_score: 4, is_tiebreak: false },
        ],
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

describe('result rows with collapsible matches', () => {
  it('fetches no matches while every row is collapsed — collapsed is the default', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(
      season([result('t1', 150, true), result('t2', 120, true)]),
    );

    renderPage();

    await screen.findByTestId('player-season-result-t1');
    // The "default collapsed" requirement, made checkable: ten tournaments
    // must cost one season request and zero match requests.
    expect(fetchPublicPlayerMatches).not.toHaveBeenCalled();
    expect(screen.queryByTestId('result-matches')).toBeNull();
  });

  it('expanding a row fetches that tournament and renders the oriented matches', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season([result('t1', 150, true)]));
    vi.mocked(fetchPublicPlayerMatches).mockResolvedValue({
      tournament_id: 't1',
      matches: [match('m1', true), match('m2', false)],
    });

    renderPage();

    const row = await screen.findByTestId('player-season-result-t1');
    await userEvent.click(within(row).getByRole('button', { expanded: false }));

    const list = await within(row).findByTestId('result-matches');
    expect(fetchPublicPlayerMatches).toHaveBeenCalledWith('p1', 't1');

    const won = within(list).getByTestId('result-match-m1');
    expect(won.getAttribute('data-won')).toBe('true');
    // My pair: the profiled player plus the API-provided partner.
    expect(within(won).getByText('Noa Levi / Guest Partner')).toBeTruthy();
    expect(within(won).getByText('Opp One')).toBeTruthy();

    const lost = within(list).getByTestId('result-match-m2');
    expect(lost.getAttribute('data-won')).toBe('false');
  });

  it('renders a walkover as a technical result, not a loss', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season([result('t1', 150, true)]));
    vi.mocked(fetchPublicPlayerMatches).mockResolvedValue({
      tournament_id: 't1',
      matches: [match('m1', null)],
    });

    renderPage();

    const row = await screen.findByTestId('player-season-result-t1');
    await userEvent.click(within(row).getByRole('button', { expanded: false }));

    const card = await within(row).findByTestId('result-match-m1');
    expect(card.getAttribute('data-won')).toBe('unknown');
    expect(within(card).getByText('Walkover')).toBeTruthy();
  });

  it('a failed match fetch stays inside its row — the season page survives', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season([result('t1', 150, true)]));
    vi.mocked(fetchPublicPlayerMatches).mockRejectedValue(new Error('network'));

    renderPage();

    const row = await screen.findByTestId('player-season-result-t1');
    await userEvent.click(within(row).getByRole('button', { expanded: false }));

    expect(await within(row).findByTestId('result-matches-error')).toBeTruthy();
    // The rest of the page is untouched: header still up, no page-level error.
    expect(screen.getByTestId('player-season-header')).toBeTruthy();
    expect(screen.queryByTestId('player-season-error')).toBeNull();
  });
});

describe('career stats section', () => {
  it('renders the stats block on the page variant when the API sends one', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(
      season([result('t1', 150, true)], {
        matches_played: 8,
        matches_won: 6,
        matches_lost: 2,
        win_rate: 75,
        current_streak: 2,
        best_streak: 4,
        tournaments_played: 2,
        tournaments_won: 1,
      }),
    );

    renderPage();

    const stats = await screen.findByTestId('player-season-stats');
    expect(within(stats).getByText('75%')).toBeTruthy();
    expect(within(stats).getByText('8')).toBeTruthy();
    expect(within(stats).getByText('6 wins')).toBeTruthy();
    expect(within(stats).getByText('2 losses')).toBeTruthy();
  });

  it('renders no stats section when the API sends none — decoration degrades', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season([result('t1', 150, true)], null));

    renderPage();

    await screen.findByTestId('player-season-header');
    expect(screen.queryByTestId('player-season-stats')).toBeNull();
  });
});
