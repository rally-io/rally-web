import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';

import type { LeagueResult, PublicPlayerSeason } from '../types';

vi.mock('../api/publicLeague', () => ({ fetchPublicPlayerSeason: vi.fn() }));

/**
 * The page renders `PlayerSeasonContent`, which asks `useReadyViewerId()` whether there is
 * a signed-in viewer entitled to the in-network extras. These stubs stand in for the two
 * providers this test never mounts, and answer "signed out" — the page's primary visitor,
 * and the state every assertion below was written against. The signed-in states have their
 * own file: `playerSeasonEnrichment.test.tsx`.
 */
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: null }) }));
vi.mock('@/hooks/useAppSession', () => ({ useAppSession: () => ({ status: 'signed_out' }) }));

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
  level_verified: false,
  level_reliability: null,
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

  it('says why the level rank moved, and flags a provisional rank', async () => {
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

  /**
   * The RESULTS LIST is flat: one row per tournament, newest first, never grouped into
   * per-quarter sections with their own totals and expiry captions.
   *
   * RE-SCOPED, not loosened. The caption assertion below used to be page-wide, from
   * when the page mentioned quarters nowhere at all. The page now carries a separate
   * `player-season-window` block (the rolling four quarters, spec §3) whose tiles
   * legitimately say "counts until" and "on offer" — so the assertion moved inside
   * `player-season-results`, which is the thing this test is actually about. The
   * `player-season-quarter-` sweep on the next line stays PAGE-WIDE and untouched: the
   * new block's tiles are `league-quarter-*`, so that guard still fails the moment the
   * results list grows quarter group headers.
   */
  it('lists tournaments as one flat list, never grouped into quarter sections', async () => {
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
    const list = screen.getByTestId('player-season-results');
    expect(within(list).queryByText(/counts until|leaves the count|on offer/)).toBeNull();
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

/**
 * The arrow has TWO destinations and must never promise the wrong one. Arrived
 * from inside the app (`history.state.idx > 0`) it is a real history back, which
 * can land on the globe, the network page, anywhere — so it may only say "Back".
 * Arrived cold on a shared link there is no in-app history, it goes to the
 * ranking board, and it says so.
 *
 * jsdom starts each file with `history.state === null`, so every OTHER test in
 * this file already exercises the cold branch; the in-app branch is set with a
 * real `replaceState` (not a spy — `vi.clearAllMocks()` does not restore spies,
 * and a leaked history stub would silently flip the branch for every later test)
 * and wound back afterwards.
 */
describe('PlayerSeasonPage back arrow', () => {
  afterEach(() => window.history.replaceState(null, ''));

  it('promises the ranking board only on the branch that actually goes there', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ results: [result('t1', 150, true)] }));

    renderPage();

    await screen.findByTestId('player-season-header');
    expect(screen.getByRole('button', { name: 'Back to rankings' })).toBeTruthy();
  });

  it('says only "Back" when the click is a history back that may go anywhere', async () => {
    window.history.replaceState({ idx: 3 }, '');
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ results: [result('t1', 150, true)] }));

    renderPage();

    await screen.findByTestId('player-season-header');
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back to rankings' })).toBeNull();
  });
});

describe('PlayerSeasonPage door to the ball', () => {
  it('links to the ball pinned on this player, beside the back button', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ results: [result('t1', 150, true)] }));

    renderPage();

    await screen.findByTestId('player-season-header');
    const link = screen.getByRole('link', { name: 'See on the ball' });
    expect(link.getAttribute('href')).toBe('/network?player=p1');
    // signed out here (see the mocks above), so it is never "find yourself"
    expect(screen.queryByRole('link', { name: /find yourself/i })).toBeNull();
  });
});

describe('PlayerSeasonPage verification seal', () => {
  it('shows the seal beside the name when the level is verified', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      level_verified: true,
      band_code: 'B',
      level_rank: 7,
      level_players: 42,
      results: [result('t1', 150, true)],
    }));

    renderPage();

    const header = await screen.findByTestId('player-season-header');
    expect(within(header).getByTestId('verified-seal')).toBeTruthy();
  });

  it('shows no seal when the level is not verified', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      level_verified: false,
      band_code: 'B',
      results: [result('t1', 150, true)],
    }));

    renderPage();

    const header = await screen.findByTestId('player-season-header');
    expect(within(header).queryByTestId('verified-seal')).toBeNull();
  });

  /**
   * The frozen-award exclusion, made executable: `LeagueResultSchema` deliberately carries
   * no `level_verified` (types.ts) because a historical `band_code` is the band as it stood
   * at award time, not a claim about the player's level today. A verified player with several
   * past results must still show exactly ONE seal — beside their current name in the header —
   * never one per result row.
   */
  it('seals the player exactly once even with several historical results', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      level_verified: true,
      band_code: 'B',
      level_rank: 7,
      level_players: 42,
      results: [result('t1', 150, true), result('t2', 90, true)],
    }));

    renderPage();

    await screen.findByTestId('player-season-header');
    expect(screen.getAllByTestId('verified-seal')).toHaveLength(1);
  });
});

/**
 * Reliability is PUBLIC (spec: shown about any player, on every league surface) —
 * unlike `PersonalCard`'s own card, this page is always about SOMEBODY ELSE, so the
 * TARGET clause ("you have this far to go") must never appear here: telling a
 * visitor what someone else has left to earn is noise, not information for them.
 *
 * Reuses the existing flat `level.reliability` i18next key verbatim (never nested
 * under it — that exact collision broke two earlier tasks in this plan, since
 * `level.reliability` is a plain string consumed as-is by `LevelStatusLine.tsx`)
 * and the same `ltrIsolate` handling as `LevelStatusLine.tsx` / `PersonalCard.tsx`:
 * the template carries no `%`, only the interpolated value does, so an exact
 * `.textContent` comparison (not a regex spanning the number) is the only
 * assertion that would catch a doubled `%` or a dropped isolate mark.
 */
describe('PlayerSeasonPage reliability', () => {
  it('shows the reliability percentage for a player who has one', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      level_reliability: 91,
      results: [result('t1', 150, true)],
    }));

    renderPage();

    const header = await screen.findByTestId('player-season-header');
    expect(within(header).getByTestId('player-season-reliability').textContent).toBe(
      '⁦91%⁩ level reliability',
    );
  });

  it('renders nothing reliability-related when the server sent none', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      level_reliability: null,
      results: [result('t1', 150, true)],
    }));

    renderPage();

    await screen.findByTestId('player-season-header');
    expect(screen.queryByTestId('player-season-reliability')).toBeNull();
  });

  it('never shows the self-only target clause, even for an unverified player', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      level_verified: false,
      level_reliability: 40,
      results: [result('t1', 150, true)],
    }));

    renderPage();

    const header = await screen.findByTestId('player-season-header');
    const line = within(header).getByTestId('player-season-reliability');
    expect(line.textContent).toBe('⁦40%⁩ level reliability');
    expect(line.textContent).not.toMatch(/Verified at/);
  });
});
