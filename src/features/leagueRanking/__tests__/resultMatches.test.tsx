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

/**
 * The page renders `PlayerSeasonContent`, which asks `useReadyViewerId()` whether there is
 * a signed-in viewer entitled to the in-network extras. These stubs stand in for the two
 * providers this test never mounts, and answer "signed out" — the page's primary visitor,
 * and the state every assertion below was written against. The signed-in states have their
 * own file: `playerSeasonEnrichment.test.tsx`.
 */
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: null }) }));
vi.mock('@/hooks/useAppSession', () => ({ useAppSession: () => ({ status: 'signed_out' }) }));

import { fetchPublicPlayerSeason, fetchPublicPlayerMatches } from '../api/publicLeague';
import PlayerSeasonPage from '../pages/PlayerSeasonPage';
import { PlayerSeasonModal } from '../components/PlayerSeasonModal';

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
  level_verified: false,
  level_reliability: null,
  is_provisional: false,
  level_rank: null,
  level_players: null,
  level_rank_change: null,
  gap_to_above: null,
  career_points: 0,
  // Exercise the quarter-backed wire shape while the UI renders a flat list.
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
    expect(within(row).getByRole('button')).toHaveAccessibleName(/Cup t1.*150.*Show matches/);
    await userEvent.click(within(row).getByRole('button', { expanded: false }));

    const list = await within(row).findByTestId('result-matches');
    expect(fetchPublicPlayerMatches).toHaveBeenCalledWith('p1', 't1');

    const won = within(list).getByTestId('result-match-m1');
    expect(won.getAttribute('data-won')).toBe('true');
    expect(within(won).getByText('Win')).toBeTruthy();
    expect(within(won).getAllByText('6')[0].parentElement).toHaveAttribute('dir', 'ltr');
    // My pair: the profiled player plus the API-provided partner.
    expect(within(won).getByText('Noa Levi / Guest Partner')).toBeTruthy();
    expect(within(won).getByText('Opp One')).toBeTruthy();

    const lost = within(list).getByTestId('result-match-m2');
    expect(lost.getAttribute('data-won')).toBe('false');
    expect(within(lost).getByText('Loss')).toBeTruthy();
    await userEvent.click(within(row).getByRole('button', { expanded: true }));
    expect(within(row).queryByTestId('result-matches')).toBeNull();
    await userEvent.click(within(row).getByRole('button', { expanded: false }));
    expect(await within(row).findByTestId('result-matches')).toBeTruthy();
    expect(fetchPublicPlayerMatches).toHaveBeenCalledTimes(1);
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
    expect(within(card).getByText('Technical / no result')).toBeTruthy();
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
    vi.mocked(fetchPublicPlayerMatches).mockResolvedValue({ tournament_id: 't1', matches: [] });
    await userEvent.click(within(row).getByRole('button', { name: 'Try again' }));
    expect(await within(row).findByTestId('result-matches-empty')).toBeTruthy();
    expect(fetchPublicPlayerMatches).toHaveBeenCalledTimes(2);
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


describe('player modal parity', () => {
  it('shows career data and tournaments, resets expansion when switching players, and keeps caches separate', async () => {
    const stats = { matches_played: 8, matches_won: 6, matches_lost: 2, win_rate: 75,
      current_streak: 2, best_streak: 4, tournaments_played: 2, tournaments_won: 1 };
    vi.mocked(fetchPublicPlayerSeason).mockImplementation(async id => ({
      ...season([result('t1', 150, true)], stats), player_id: id,
      first_name: id === 'p1' ? 'Noa' : 'Other',
    }));
    const unknown = { ...match('m1', null), partner: { ...match('m1', null).partner!, first_name: null, last_name: null }, opponents: [] };
    vi.mocked(fetchPublicPlayerMatches).mockImplementation(async id => ({
      tournament_id: 't1', matches: [{ ...unknown, match_id: id }],
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const modal = (id: string) => <QueryClientProvider client={client}><MemoryRouter>
      <PlayerSeasonModal playerId={id} onClose={() => {}} />
    </MemoryRouter></QueryClientProvider>;
    const { rerender } = render(modal('p1'));
    expect(await screen.findByTestId('player-season-stats')).toHaveTextContent('75%');
    expect(screen.getByTestId('player-season-stats')).toHaveTextContent('Career statistics');
    expect(screen.queryByTestId(/^player-season-quarter-/)).toBeNull();
    const first = await screen.findByTestId('player-season-result-t1');
    await userEvent.click(within(first).getByRole('button', { expanded: false }));
    expect(await screen.findByTestId('result-match-p1')).toHaveTextContent('Unknown player');
    rerender(modal('p2'));
    await screen.findByText('Other Levi');
    expect(screen.queryByTestId('result-match-p1')).toBeNull();
    const second = screen.getByTestId('player-season-result-t1');
    await userEvent.click(within(second).getByRole('button', { expanded: false }));
    expect(await screen.findByTestId('result-match-p2')).toHaveTextContent('Other Levi');
    expect(fetchPublicPlayerMatches).toHaveBeenNthCalledWith(2, 'p2', 't1');
  });
});
