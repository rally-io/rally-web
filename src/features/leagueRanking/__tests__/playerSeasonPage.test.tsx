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
  level_players: null,
  level_rank_change: null,
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
  it('leads with the LEVEL rank and the level, never the overall rank', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      band_code: 'B',
      level_rank: 7,
      level_players: 42,
      level_rank_change: 2,
      results: [result('t1', 150, true)],
    }));

    renderPage();

    const header = await screen.findByTestId('player-season-header');
    expect(within(header).getByText(/Noa/)).toBeTruthy();
    expect(within(header).getByText('7')).toBeTruthy();
    expect(within(header).getByTestId('player-season-level')).toHaveTextContent('Level B');
    expect(within(header).getByTestId('player-season-level')).toHaveTextContent('of 42 players');
    expect(within(header).getByText(/421/)).toBeTruthy();
    expect(await screen.findByTestId('player-season-result-t1')).toBeTruthy();
    // The discriminating assertions: this must be the level rank INSTEAD OF the
    // overall one, not beside it. `global_rank` is 47 in the fixture, and a header
    // that still prints it has kept the old hero and merely gained a level line.
    expect(within(header).queryByText(/47/)).toBeNull();
    // And the arrow beside the numeral is the LEVEL board's move (2), not the global
    // re-rank (4) — the fixture differs on purpose, so handing `rank_change` to the
    // hero fails here even though every other assertion above still passes.
    expect(within(header).getByTestId('rank-movement')).toHaveTextContent('2');
    expect(within(header).getByTestId('rank-movement').textContent).not.toMatch(/4/);
  });

  it('names the level without a count when the board size is unknown', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      band_code: 'B',
      level_rank: 7,
      level_players: null,
      results: [result('t1', 150, true)],
    }));

    renderPage();

    const level = await screen.findByTestId('player-season-level');
    expect(level).toHaveTextContent('Level B');
    expect(level.textContent).not.toMatch(/players/);
  });

  it('says why the level rank moved, and flags a provisional level', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      band_code: 'B',
      level_rank: 7,
      level_players: 42,
      level_rank_change: 2,
      movement_reason: 'played',
      is_provisional: true,
      results: [result('t1', 150, true)],
    }));

    renderPage();

    const header = await screen.findByTestId('player-season-header');
    // Third person: this page is about somebody else, so it must not say "your".
    expect(within(header).getByTestId('player-season-reason')).toHaveTextContent(
      'since their last tournament',
    );
    expect(within(header).getByTestId('player-season-reason').textContent).not.toMatch(/your/i);
    expect(within(header).getByTestId('player-season-provisional')).toHaveTextContent(
      /Provisional/i,
    );
  });

  it('captions no reason when the level rank has not moved, and no badge when the level is settled', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      band_code: 'B',
      level_rank: 7,
      level_players: 42,
      level_rank_change: null,
      // A reason with no arrow explains nothing on screen, so it stays off.
      movement_reason: 'played',
      is_provisional: false,
      results: [result('t1', 150, true)],
    }));

    renderPage();

    await screen.findByTestId('player-season-header');
    expect(screen.queryByTestId('player-season-reason')).toBeNull();
    expect(screen.queryByTestId('player-season-provisional')).toBeNull();
  });

  it('treats holding station as no move: the neutral glyph, no reason text', async () => {
    // Zero is a real value — the player held their place — and `RankCell` says so with
    // its neutral glyph. Captioning it ("· an old quarter left the count") is the noise
    // mobile shipped on a live player, so a zero change earns no reason line here.
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      band_code: 'B',
      level_rank: 7,
      level_players: 42,
      level_rank_change: 0,
      movement_reason: 'quarter_ended',
      results: [result('t1', 150, true)],
    }));

    renderPage();

    const header = await screen.findByTestId('player-season-header');
    expect(within(header).getByTestId('rank-movement')).toHaveAttribute('data-direction', 'same');
    expect(within(header).queryByTestId('player-season-reason')).toBeNull();
  });

  it('says nothing about a level for a player who has none', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ results: [result('t1', 150, true)] }));

    renderPage();

    await screen.findByTestId('player-season-header');
    expect(screen.queryByTestId('player-season-level')).toBeNull();
  });

  it('lists tournaments newest first without quarter totals or expiry captions', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      quarters: [
        { key: '2026-Q2', starts_at: '', ends_at: '', drops_at: '2027-03-31T21:00:00Z', points: 150, available: 150, results: [{ ...result('t1', 150, true), awarded_at: '2026-04-01T00:00:00Z' }] },
        { key: '2026-Q3', starts_at: '', ends_at: '', drops_at: '2027-06-30T21:00:00Z', points: 90, available: 200, results: [{ ...result('t2', 90, true), awarded_at: '2026-09-01T00:00:00Z' }, result('t3', 45, false)] },
      ],
      results: [result('t2', 90, true), result('t3', 45, false), result('t1', 150, true)],
    }));
    renderPage();
    const rows = await screen.findAllByTestId(/^player-season-result-/);
    expect(rows.map(row => row.dataset.testid)).toEqual([
      'player-season-result-t2', 'player-season-result-t3', 'player-season-result-t1',
    ]);
    expect(screen.queryByTestId(/^player-season-quarter-/)).toBeNull();
    expect(screen.queryByText(/counts until|leaves the count|on offer/)).toBeNull();
    expect(screen.getByText('Contributing tournaments').nextElementSibling).toHaveTextContent('2');
  });

  it('treats empty quarter containers as no results, retaining career points', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      career_points: 500,
      quarters: [{ key: '2026-Q3', starts_at: '', ends_at: '', drops_at: '2027-06-30T21:00:00Z', points: 0, available: 0, results: [] }],
      results: [],
    }));
    renderPage();
    const results = await screen.findByTestId('player-season-results');
    expect(within(results).getByText('No results yet.')).toBeTruthy();
    expect(screen.queryByTestId(/^player-season-quarter-/)).toBeNull();
    expect(screen.getByTestId('player-season-career')).toHaveTextContent('500');
  });

  it('dates each result with its Israel award day, and omits the date when there is none', async () => {
    const dated = result('t1', 150, true);
    const undated: LeagueResult = { ...result('t2', 90, true), awarded_at: null };
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      quarters: [{
        key: '2026-Q3', starts_at: '', ends_at: '', drops_at: '2027-06-30T21:00:00Z',
        points: 240, available: 300, results: [dated, undated],
      }],
      results: [dated, undated],
    }));

    renderPage();

    const t1 = await screen.findByTestId('player-season-result-t1');
    expect(within(t1).getByTestId('league-result-date')).toHaveTextContent('1.8.2026');
    const t2 = screen.getByTestId('player-season-result-t2');
    expect(within(t2).queryByTestId('league-result-date')).toBeNull();
  });

  it('shows no date rather than a broken one when the award timestamp is unreadable', async () => {
    const broken: LeagueResult = { ...result('t1', 150, true), awarded_at: 'not-a-date' };
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      quarters: [{
        key: '2026-Q3', starts_at: '', ends_at: '', drops_at: '2027-06-30T21:00:00Z',
        points: 150, available: 150, results: [broken],
      }],
      results: [broken],
    }));

    renderPage();

    const row = await screen.findByTestId('player-season-result-t1');
    expect(within(row).queryByTestId('league-result-date')).toBeNull();
    expect(row.textContent).not.toMatch(/NaN/);
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
    expect(within(results).getByText(/No results yet/i)).toBeTruthy();
  });
});
