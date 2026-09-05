import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { LeagueFetch, PublicStandings, StandingsRow } from '../types';
import { TopRanks } from '../components/TopRanks';

vi.mock('../api/publicLeague', () => ({
  fetchPublicStandings: vi.fn(),
  fetchPublicPlayerSeason: vi.fn(),
}));
vi.mock('../api/myLeague', () => ({ fetchMyLeagueCard: vi.fn(), fetchMyStandings: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: null, user: null }) }));

import { fetchPublicStandings, fetchPublicPlayerSeason } from '../api/publicLeague';
import RankingPage from '../pages/RankingPage';

const row = (rank: number, id: string, points: number): StandingsRow => ({
  rank,
  player_id: id,
  first_name: `P${id}`,
  last_name: 'Levi',
  avatar_url: null,
  avatar_clean_url: null,
  skill_tier: null,
  band_code: 'B',
  points,
  counted_results: 3,
  rank_change: null,
  is_provisional: false,
});

const standings = (rows: StandingsRow[]): LeagueFetch<PublicStandings> => ({
  kind: 'ok',
  data: {
    season: {
      id: 's1',
      name: 'Season 1',
      starts_at: '2026-01-01T00:00:00Z',
      ends_at: '2026-12-31T00:00:00Z',
      counting_results: 4,
      is_active: true,
      quarters: [],
    },
    frame: 'global',
    total_players: 1204,
    rows,
    me: null,
  },
});

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RankingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('TopRanks', () => {
  it('renders the server rank on each featured row, ties included', () => {
    // Two rows tied at 1: an index-derived implementation renders 1 and 2.
    render(
      <MemoryRouter>
        <TopRanks rows={[row(1, 'a', 900), row(1, 'b', 900), row(3, 'c', 700)]} />
      </MemoryRouter>,
    );

    const ranks = screen.getAllByTestId('top-rank').map(el => el.textContent);
    expect(ranks).toEqual(['1', '1', '3']);
  });
});

describe('RankingPage featured column', () => {
  it('splits an 11+ row page into ten featured rows and a table that carries on from 11', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(i + 1, `p${i + 1}`, 900 - i * 10));
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings(rows));

    renderPage();

    const featured = await screen.findByTestId('top-ranks');
    expect(within(featured).getAllByTestId('top-rank').map(el => el.textContent)).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    ]);

    // The table continues from 11 with server ranks — nothing dropped, nothing renumbered.
    const table = screen.getByRole('table');
    const tableRanks = within(table)
      .getAllByTestId('standings-rank')
      .map(el => el.textContent?.trim());
    expect(tableRanks).toEqual(['11', '12']);
  });

  it('keeps a one- or two-row board entirely in the table — a ladder of one is not a ladder', async () => {
    const rows = [row(1, 'p1', 900), row(2, 'p2', 880)];
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings(rows));

    renderPage();

    const table = await screen.findByRole('table');
    expect(within(table).getAllByTestId('standings-rank')).toHaveLength(2);
    expect(screen.queryByTestId('top-ranks')).toBeNull();
  });

  it('features a small board from three rows up and drops the table instead of showing it empty', async () => {
    // Five rows: all five are the ladder. A table would only carry the "nobody is
    // ranked" sentence directly beneath five ranked players — so there is none.
    const rows = Array.from({ length: 5 }, (_, i) => row(i + 1, `p${i + 1}`, 900 - i * 10));
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings(rows));

    renderPage();

    const featured = await screen.findByTestId('top-ranks');
    expect(within(featured).getAllByTestId('top-rank').map(el => el.textContent)).toEqual(['1', '2', '3', '4', '5']);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByTestId('standings-empty')).toBeNull();
  });

  it('features exactly ten of a ten-row board, still with no table', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(i + 1, `p${i + 1}`, 900 - i * 10));
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings(rows));

    renderPage();

    const featured = await screen.findByTestId('top-ranks');
    expect(within(featured).getAllByTestId('top-rank')).toHaveLength(10);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('never features a page that does not open at rank 1', async () => {
    // Page two of a big frame: the featured column is the top of the frame, and
    // this page does not contain it.
    const rows = Array.from({ length: 12 }, (_, i) => row(51 + i, `p${51 + i}`, 300 - i));
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings(rows));

    renderPage();

    const table = await screen.findByRole('table');
    await waitFor(() =>
      expect(
        within(table)
          .getAllByTestId('standings-rank')
          .map(el => el.textContent?.trim()),
      ).toHaveLength(12),
    );
    expect(screen.queryByTestId('top-ranks')).toBeNull();
  });

  it('opens the player modal in place when a featured row is picked', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(i + 1, `p${i + 1}`, 900 - i * 10));
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings(rows));
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue({
      season: {
        id: 's1',
        name: 'Season 1',
        starts_at: '2026-01-01T00:00:00Z',
        ends_at: '2026-12-31T00:00:00Z',
        counting_results: 4,
        is_active: true,
        quarters: [],
      },
      player_id: 'p1',
      first_name: 'Pp1',
      last_name: 'Levi',
      avatar_url: null,
      avatar_clean_url: null,
      points: 890,
      global_rank: 1,
      rank_change: null,
      movement_reason: null,
      band_code: null,
      is_provisional: false,
      level_rank: null,
      gap_to_above: null,
      career_points: 0,
      quarters: [],
      results: [],
    });

    renderPage();

    const featured = await screen.findByTestId('top-ranks');
    await userEvent.click(within(featured).getAllByRole('button')[0]);

    const modal = await screen.findByTestId('player-season-modal');
    expect(await within(modal).findByTestId('player-season-header')).toBeTruthy();
    expect(within(modal).getByText(/Pp1/)).toBeTruthy();
    expect(vi.mocked(fetchPublicPlayerSeason).mock.calls[0][0]).toBe('p1');
    // The board is still behind the overlay — the modal replaced no page.
    expect(screen.getByTestId('top-ranks')).toBeTruthy();
  });
});

/** `standings` pins total_players at 1204; paging tests need a reachable end. */
const page = (rows: StandingsRow[], total: number): LeagueFetch<PublicStandings> => {
  const base = standings(rows);
  return base.kind === 'ok' ? { ...base, data: { ...base.data, total_players: total } } : base;
};

describe('RankingPage load more', () => {
  it('appends the next page under the table and retires the button on the last one', async () => {
    const first = Array.from({ length: 12 }, (_, i) => row(i + 1, `p${i + 1}`, 900 - i * 10));
    vi.mocked(fetchPublicStandings).mockResolvedValueOnce(page(first, 14));

    renderPage();

    const button = await screen.findByTestId('league-load-more');

    // The production edge this ships for: the cut landed mid-tie, so the next
    // page opens on the same rank the previous page closed near.
    vi.mocked(fetchPublicStandings).mockResolvedValueOnce(
      page([row(13, 'p13', 100), row(13, 'p14', 100)], 14),
    );
    await userEvent.click(button);

    const table = screen.getByRole('table');
    await waitFor(() =>
      expect(
        within(table)
          .getAllByTestId('standings-rank')
          .map(el => el.textContent?.trim()),
      ).toEqual(['11', '12', '13', '13']),
    );
    // The second request asked for the rows after the twelve already shown.
    expect(vi.mocked(fetchPublicStandings)).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 12 }),
    );
    // 14 of 14 loaded: the button's absence is the "you have seen everyone" signal.
    expect(screen.queryByTestId('league-load-more')).toBeNull();
    // The featured column did not move — it stays the top of the frame.
    expect(within(screen.getByTestId('top-ranks')).getAllByTestId('top-rank')).toHaveLength(10);
  });

  it('shows no button when a single page holds the whole frame', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(i + 1, `p${i + 1}`, 900 - i * 10));
    vi.mocked(fetchPublicStandings).mockResolvedValue(page(rows, 12));

    renderPage();

    await screen.findByTestId('top-ranks');
    expect(screen.queryByTestId('league-load-more')).toBeNull();
  });
});
