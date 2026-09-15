import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppSessionStatus } from '@/contexts/AppSessionContext';
import type { LeagueQuarterBlock, LeagueResult, PublicPlayerSeason } from '../types';

vi.mock('../api/publicLeague', () => ({ fetchPublicPlayerSeason: vi.fn() }));

/**
 * Signed out unless a test says otherwise — this page's PRIMARY visitor, and the
 * state every assertion in this file was written against. Mocked at the two leaf
 * hooks (not at `useReadyViewerId`) so the real `ready` gate still runs, exactly as
 * `playerSeasonEnrichment.test.tsx` does it.
 */
const mockSession = vi.hoisted(() => ({ current: null as { user: { id: string } } | null }));
const mockStatus = vi.hoisted(() => ({ current: 'signed_out' as AppSessionStatus }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: mockSession.current }) }));
vi.mock('@/hooks/useAppSession', () => ({ useAppSession: () => ({ status: mockStatus.current }) }));

import * as statsApi from '@/features/playerGlobe/api/playerStats';
import { fetchPublicPlayerSeason } from '../api/publicLeague';
import { PlayerSeasonContent } from '../components/PlayerSeasonContent';

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

const quarter = (
  key: string,
  dropsAt: string,
  points: number,
  available: number,
  results: LeagueResult[],
): LeagueQuarterBlock => ({
  key,
  starts_at: '',
  ends_at: '',
  drops_at: dropsAt,
  points,
  available,
  results,
});

/**
 * A RANKED player on a level board — the state all three fields describe. `gap_to_above`
 * is the LEVEL board's gap (rally-api `routers/public/league.py`: the chase is computed
 * over `level_board`, never the global one), so it is only meaningful beside a level.
 */
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
  band_code: 'B',
  level_verified: false,
  level_reliability: null,
  is_provisional: false,
  level_rank: 7,
  level_players: 42,
  level_rank_change: null,
  gap_to_above: null,
  career_points: 0,
  quarters: [],
  results: [],
  ...overrides,
});

function renderContent(variant: 'page' | 'modal' = 'page'): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PlayerSeasonContent playerId="p1" variant={variant} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  mockSession.current = null;
  mockStatus.current = 'signed_out';
});

describe('gap_to_above — the target the rank turns into', () => {
  it('says how many points separate the player from the spot above', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ gap_to_above: 25 }));
    renderContent();

    const gap = await screen.findByTestId('player-season-gap');
    // The number is LTR-isolated (U+2066 LRI … U+2069 PDI) BEFORE interpolation, so it
    // stays one left-to-right run inside the Hebrew sentence — the same treatment
    // `ReliabilityLine` gives its percentage.
    expect(gap.textContent).toBe('⁦25⁩ points from the spot above');
  });

  it('counts the smallest real gap — one point — in the singular', async () => {
    // 1 is the FLOOR, not an edge case picked for the plural: rally-api computes the
    // gap from the points STRICTLY above (`routers/public/league.py`), so a tied
    // neighbour is skipped and 0 can never arrive. The guard in the component is still
    // `== null` rather than `!gap`, so a dense-ranking change upstream would render
    // rather than silently vanish.
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ gap_to_above: 1 }));
    renderContent();

    expect((await screen.findByTestId('player-season-gap')).textContent)
      .toBe('⁦1⁩ point from the spot above');
  });

  it('renders NOTHING for a player with nobody above them', async () => {
    // Rank 1 on the level board: the API sends null, not 0. Nothing is the honest
    // render — a dash or a zero would both claim a gap that does not exist.
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ level_rank: 1, gap_to_above: null }));
    renderContent();

    await screen.findByTestId('player-season-header');
    expect(screen.queryByTestId('player-season-gap')).toBeNull();
    expect(screen.queryByText(/spot above/)).toBeNull();
  });
});

describe('global_rank — where the player sits across every band', () => {
  it('states the overall rank, OUTSIDE the header the level rank owns', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ global_rank: 47 }));
    renderContent();

    const overall = await screen.findByTestId('player-season-overall');
    expect(overall).toHaveTextContent('47');
    // The hero stays the LEVEL rank: the overall one is a separate, quieter line and
    // never enters the header card. `playerSeasonPage.test.tsx` guards the same fact
    // from the other side and is deliberately left untouched.
    const header = screen.getByTestId('player-season-header');
    expect(within(header).queryByTestId('player-season-overall')).toBeNull();
    expect(within(header).queryByText(/47/)).toBeNull();
  });

  it('renders NOTHING for an unranked player', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ global_rank: null }));
    renderContent();

    await screen.findByTestId('player-season-header');
    expect(screen.queryByTestId('player-season-overall')).toBeNull();
  });
});

describe('quarters — the rolling window the ranking is actually built from', () => {
  const fourQuarters = [
    quarter('2025-Q4', '2026-09-30T21:00:00Z', 0, 0, []),
    quarter('2026-Q1', '2026-12-31T22:00:00Z', 0, 0, []),
    quarter('2026-Q2', '2027-03-31T21:00:00Z', 407, 638, [result('a', 407, true)]),
    quarter('2026-Q3', '2027-06-30T21:00:00Z', 205, 353, [result('b', 205, true)]),
  ];

  it('breaks the window into its four quarters, newest first, with what drops next', async () => {
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ quarters: fourQuarters }));
    renderContent();

    const tiles = await screen.findByTestId('league-quarters');
    expect(within(tiles).getAllByTestId(/^league-quarter-/).map(el => el.dataset.quarter))
      .toEqual(['2026-Q3', '2026-Q2', '2026-Q1', '2025-Q4']);
    expect(within(tiles).getByTestId('league-quarter-2026-Q3')).toHaveTextContent('205');
    // The oldest tile is the one a player can watch approach.
    expect(within(tiles).getByTestId('league-quarter-2025-Q4')).toHaveTextContent('1.10.2026');
  });

  it('speaks about the player in the third person, never "you did not play"', async () => {
    // This page is about SOMEBODY ELSE — the same reason `league.reason.played` is not
    // reused here. `league.quarters.empty` addresses the viewer, so the tiles take the
    // page's own impersonal label instead.
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ quarters: fourQuarters }));
    renderContent();

    const tiles = await screen.findByTestId('league-quarters');
    expect(within(tiles).getByTestId('league-quarter-2026-Q1')).toHaveTextContent('no tournaments');
    expect(tiles.textContent).not.toMatch(/you did not play/i);
  });

  it('renders NOTHING when the API sent no quarters', async () => {
    // `quarters` defaults to `[]` on an older API. An empty grid of four dashed tiles
    // would invent a window the server never described.
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({ quarters: [] }));
    renderContent();

    await screen.findByTestId('player-season-header');
    expect(screen.queryByTestId('league-quarters')).toBeNull();
    expect(screen.queryByTestId('player-season-window')).toBeNull();
  });

  it('stays off the MODAL, which is the lighter surface', async () => {
    // The modal is a glance while browsing the board; the quarter breakdown is a study
    // block and belongs to the full page. The two lighter lines still render in both.
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(
      season({ quarters: fourQuarters, gap_to_above: 25, global_rank: 47 }),
    );
    renderContent('modal');

    await screen.findByTestId('player-season-header');
    expect(screen.queryByTestId('league-quarters')).toBeNull();
    expect(screen.getByTestId('player-season-gap')).toBeTruthy();
    expect(screen.getByTestId('player-season-overall')).toBeTruthy();
  });
});

describe('the anonymous visitor — the page must not have grown a session requirement', () => {
  it('renders all three fields with no session and issues NO in-network request', async () => {
    const full = vi.spyOn(statsApi, 'fetchFullPlayerStats');
    vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season({
      gap_to_above: 25,
      global_rank: 47,
      quarters: [quarter('2026-Q3', '2027-06-30T21:00:00Z', 205, 353, [result('b', 205, true)])],
    }));

    renderContent();

    expect(await screen.findByTestId('player-season-gap')).toBeTruthy();
    expect(screen.getByTestId('player-season-overall')).toBeTruthy();
    expect(screen.getByTestId('league-quarters')).toBeTruthy();
    // The three additions come from `/public/league/player/{id}`; not one of them may
    // reach for the viewer-scoped endpoint.
    expect(full).not.toHaveBeenCalled();
    expect(screen.queryByTestId('skill-line')).toBeNull();
    expect(screen.queryByTestId('top-partners')).toBeNull();
    expect(screen.queryByTestId('top-clubs')).toBeNull();
  });
});
