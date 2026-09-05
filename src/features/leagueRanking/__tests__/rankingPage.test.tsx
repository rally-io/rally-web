import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { LeagueFetch, PublicStandings, StandingsRow } from '../types';

vi.mock('../api/publicLeague', () => ({ fetchPublicStandings: vi.fn() }));
vi.mock('../api/myLeague', () => ({ fetchMyLeagueCard: vi.fn(), fetchMyStandings: vi.fn() }));

const mockSession = vi.hoisted(() => ({ current: null as { user: { id: string } } | null }));
const mockUser = vi.hoisted(
  () => ({ current: null as { user_metadata?: Record<string, unknown> } | null }),
);
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: mockSession.current, user: mockUser.current }),
}));

import { fetchPublicStandings } from '../api/publicLeague';
import { fetchMyLeagueCard } from '../api/myLeague';
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
      {/* The page links to /level, so it needs router context even though it takes
          no route params of its own. */}
      <MemoryRouter>
        <RankingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The rank cell of each rendered table row, in render order. */
/**
 * Every rank on the page, top to bottom: the featured ladder first (a board of
 * three or more rows that opens at rank 1 is featured), then the table when one
 * is rendered. Both halves show the server's rank, so the sequence is what an
 * index-derived implementation would get wrong.
 */
async function renderedRanks(): Promise<string[]> {
  await waitFor(() => {
    if (!screen.queryByTestId('top-ranks') && !screen.queryByRole('table')) {
      throw new Error('no ranks rendered yet');
    }
  });
  const ladder = screen.queryByTestId('top-ranks');
  const featured = ladder
    ? within(ladder).getAllByTestId('top-rank').map(el => el.textContent?.trim() ?? '')
    : [];
  const table = screen.queryByRole('table');
  const tabled = table
    ? within(table)
        .getAllByRole('row')
        .slice(1) // drop the header row
        .map(r => within(r).getAllByRole('cell')[0].textContent?.trim() ?? '')
    : [];
  return [...featured, ...tabled];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.current = null;
  mockUser.current = null;
});

describe('RankingPage', () => {
  it('renders server ranks through the whole page, ties included', async () => {
    // Ranks 1, 1, 3 — an index-derived implementation renders 1, 2, 3 and fails here.
    vi.mocked(fetchPublicStandings).mockResolvedValue(
      standings([row(1, 'a', 900), row(1, 'b', 900), row(3, 'c', 700)]),
    );

    renderPage();

    await waitFor(async () => expect(await renderedRanks()).toEqual(['1', '1', '3']));
  });

  it('renders a page that opens at 51 as 51, not as 1', async () => {
    // Nothing computed on the client can produce this: index numbering gives 1, 2, 3,
    // and a client-side competition ranking over the page gives the same. Only the
    // server's own rank survives.
    vi.mocked(fetchPublicStandings).mockResolvedValue(
      standings([row(51, 'a', 300), row(52, 'b', 290), row(53, 'c', 280)]),
    );

    renderPage();

    await waitFor(async () => expect(await renderedRanks()).toEqual(['51', '52', '53']));
  });

  it('is fully usable logged out: table present, no personal card, no error', async () => {
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();

    expect(await screen.findByRole('table')).toBeTruthy();
    expect(screen.queryByTestId('league-personal-card')).toBeNull();
    expect(screen.queryByTestId('league-error')).toBeNull();
    // The circle chip shows logged out too (rule reversed 2026-09-02 — selecting
    // it renders the sign-in CTA, pinned in gameLayer.test.tsx).
    expect(screen.getByTestId('league-frame-circle')).toBeTruthy();
    // Logged out gets the download nudge instead of the personal card — under
    // the table, never in front of it.
    expect(screen.getByTestId('league-cta')).toBeTruthy();
    expect(fetchMyLeagueCard).not.toHaveBeenCalled();
  });

  it('renders the personal card alongside the table when signed in', async () => {
    mockSession.current = { user: { id: 'u1' } };
    mockUser.current = { user_metadata: { full_name: 'Noa Levi' } };
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));
    vi.mocked(fetchMyLeagueCard).mockResolvedValue({
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
      },
    });

    renderPage();

    const card = await screen.findByTestId('league-personal-card');
    expect(within(card).getByText(/47/)).toBeTruthy();
    expect(within(card).getByText(/Noa Levi/)).toBeTruthy();
    expect(await screen.findByRole('table')).toBeTruthy();
  });

  it('shows an error state, not an empty table, when the request fails', async () => {
    // The distinction matters: an empty table claims nobody is ranked, which is a
    // different and false statement about the league.
    vi.mocked(fetchPublicStandings).mockRejectedValue(new Error('network'));

    renderPage();

    expect(await screen.findByTestId('league-error')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows the season-has-not-started state distinctly from an error', async () => {
    vi.mocked(fetchPublicStandings).mockResolvedValue({
      kind: 'no-active-season',
      message: 'No active season',
    });

    renderPage();

    expect(await screen.findByTestId('league-no-season')).toBeTruthy();
    expect(screen.queryByTestId('league-error')).toBeNull();
  });

  it('does not render a half-populated table while loading', async () => {
    let release: (v: LeagueFetch<PublicStandings>) => void = () => {};
    vi.mocked(fetchPublicStandings).mockReturnValue(
      new Promise<LeagueFetch<PublicStandings>>(res => {
        release = res;
      }),
    );

    renderPage();

    expect(await screen.findByTestId('league-loading')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();

    release(standings([row(1, 'a', 900)]));
    expect(await screen.findByRole('table')).toBeTruthy();
  });
});

/** `standings` pins total_players at 1204; search results need real counts. */
const searchPage = (rows: StandingsRow[], total: number): LeagueFetch<PublicStandings> => {
  const base = standings(rows);
  return base.kind === 'ok' ? { ...base, data: { ...base.data, total_players: total } } : base;
};

describe('RankingPage name search', () => {
  it('debounces, queries with q, and renders matches as a pure table with true frame ranks', async () => {
    const board = Array.from({ length: 12 }, (_, i) => row(i + 1, `p${i + 1}`, 900 - i));
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings(board));

    renderPage();
    await screen.findByTestId('top-ranks');

    // Two matches from opposite ends of the board: rank 1 and rank 137.
    vi.mocked(fetchPublicStandings).mockResolvedValue(
      searchPage([row(1, 'a', 900), row(137, 'z', 60)], 2),
    );
    fireEvent.change(screen.getByTestId('league-search'), { target: { value: 'levi' } });

    await waitFor(() =>
      expect(vi.mocked(fetchPublicStandings)).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'levi' }),
      ),
    );
    // True frame ranks, in one plain table — no ladder even though rank 1
    // matched: the featured column is the top of the FRAME, and a result set
    // is not that.
    await waitFor(async () => expect(await renderedRanks()).toEqual(['1', '137']));
    expect(screen.queryByTestId('top-ranks')).toBeNull();
    // The match count replaces the season line.
    expect(screen.getByTestId('league-search-count')).toBeTruthy();
    expect(screen.queryByTestId('league-season')).toBeNull();
  });

  it('stays off the wire below two characters', async () => {
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();
    await screen.findByRole('table');
    const calls = vi.mocked(fetchPublicStandings).mock.calls.length;

    fireEvent.change(screen.getByTestId('league-search'), { target: { value: 'y' } });
    // Past the 300ms debounce: still nothing — one character is below the
    // API's own minimum, so the page must not ask.
    await new Promise<void>(resolve => setTimeout(resolve, 400));
    expect(vi.mocked(fetchPublicStandings).mock.calls.length).toBe(calls);
  });

  it('says "no players match", never "nobody is ranked", for a missed search', async () => {
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();
    await screen.findByRole('table');

    vi.mocked(fetchPublicStandings).mockResolvedValue(searchPage([], 0));
    fireEvent.change(screen.getByTestId('league-search'), { target: { value: 'zzz' } });

    expect(await screen.findByTestId('league-search-empty')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('the clear button restores the full board', async () => {
    const board = Array.from({ length: 12 }, (_, i) => row(i + 1, `p${i + 1}`, 900 - i));
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings(board));

    renderPage();
    await screen.findByTestId('top-ranks');

    vi.mocked(fetchPublicStandings).mockResolvedValue(searchPage([row(5, 'p5', 896)], 1));
    fireEvent.change(screen.getByTestId('league-search'), { target: { value: 'p5' } });
    await screen.findByTestId('league-search-count');

    fireEvent.click(screen.getByTestId('league-search-clear'));

    expect(await screen.findByTestId('top-ranks')).toBeTruthy();
    expect(screen.queryByTestId('league-search-count')).toBeNull();
  });

  it('hides the search box on the circle frame', async () => {
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();
    await screen.findByRole('table');
    expect(screen.getByTestId('league-search')).toBeTruthy();

    fireEvent.click(screen.getByTestId('league-frame-circle'));
    await waitFor(() => expect(screen.queryByTestId('league-search')).toBeNull());
  });
});
