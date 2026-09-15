import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppSessionStatus } from '@/contexts/AppSessionContext';
import type { PublicPlayerSeason } from '../types';

vi.mock('../api/publicLeague', () => ({ fetchPublicPlayerSeason: vi.fn() }));

/**
 * The viewer is mocked at the two LEAF hooks, not at `useReadyViewerId`, so these
 * tests exercise the real `ready` gate — the one that keeps a signed-in visitor with
 * an incomplete profile from firing a request the API answers with a 403 that the
 * shared client turns into a navigation to /profile/edit.
 */
const mockSession = vi.hoisted(() => ({ current: null as { user: { id: string } } | null }));
const mockStatus = vi.hoisted(() => ({ current: 'signed_out' as AppSessionStatus }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: mockSession.current }) }));
vi.mock('@/hooks/useAppSession', () => ({ useAppSession: () => ({ status: mockStatus.current }) }));

import * as statsApi from '@/features/playerGlobe/api/playerStats';
import { fetchPublicPlayerSeason } from '../api/publicLeague';
import PlayerSeasonPage from '../pages/PlayerSeasonPage';

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
  level_verified: null,
  level_reliability: 62,
  is_provisional: false,
  level_rank: 7,
  level_players: 42,
  level_rank_change: 2,
  gap_to_above: null,
  career_points: 0,
  quarters: [],
  results: [],
  ...overrides,
});

const fullStats = {
  matches_played: 12,
  matches_won: 7,
  matches_lost: 5,
  win_rate: 58,
  current_streak: 2,
  best_streak: 4,
  tournaments_played: 3,
  tournaments_won: 1,
  skill_history: [
    { skill_level: 3.2, recorded_at: '2026-08-01T10:00:00Z' },
    { skill_level: 3.5, recorded_at: '2026-08-20T10:00:00Z' },
  ],
  top_partners: [{ player_id: 'p2', display_name: 'Omer Cohen', avatar_url: null, matches_played: 6 }],
  top_clubs: [{ club_id: 'c1', name: 'Rally TLV', logo_url: null, matches_played: 9 }],
};

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

function signedOut(): void {
  mockSession.current = null;
  mockStatus.current = 'signed_out';
}

function signedIn(status: AppSessionStatus): void {
  mockSession.current = { user: { id: 'viewer-1' } };
  mockStatus.current = status;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  signedOut();
  vi.mocked(fetchPublicPlayerSeason).mockResolvedValue(season());
});

describe('the full player page, anonymous — the page it has always been', () => {
  it('issues NO request for the in-network payload and renders no extra blocks', async () => {
    const full = vi.spyOn(statsApi, 'fetchFullPlayerStats').mockResolvedValue(fullStats);
    renderPage();

    expect(await screen.findByTestId('player-season-header')).toBeInTheDocument();
    // the page as it is today: reliability is public and still here
    expect(screen.getByTestId('player-season-reliability')).toBeInTheDocument();
    expect(screen.getByTestId('player-season-results')).toBeInTheDocument();

    expect(full).not.toHaveBeenCalled();
    expect(screen.queryByTestId('skill-line')).not.toBeInTheDocument();
    expect(screen.queryByTestId('top-partners')).not.toBeInTheDocument();
    expect(screen.queryByTestId('top-clubs')).not.toBeInTheDocument();
  });
});

describe('the full player page, signed in but without a player row', () => {
  it('issues NO request either — that 403 navigates the visitor off the page', async () => {
    signedIn('profile_incomplete');
    const full = vi.spyOn(statsApi, 'fetchFullPlayerStats').mockResolvedValue(fullStats);
    renderPage();

    expect(await screen.findByTestId('player-season-header')).toBeInTheDocument();
    expect(full).not.toHaveBeenCalled();
    expect(screen.queryByTestId('skill-line')).not.toBeInTheDocument();
  });
});

describe('the full player page, signed in and entitled', () => {
  beforeEach(() => signedIn('ready'));

  it('adds the level chart, the top partners and the top clubs', async () => {
    vi.spyOn(statsApi, 'fetchFullPlayerStats').mockResolvedValue(fullStats);
    renderPage();

    expect(await screen.findByTestId('skill-line')).toBeInTheDocument();
    const partners = await screen.findByTestId('top-partners');
    expect(partners).toHaveTextContent('Omer Cohen');
    const clubs = await screen.findByTestId('top-clubs');
    expect(clubs).toHaveTextContent('Rally TLV');

    // and nothing the page already had went away
    expect(screen.getByTestId('player-season-header')).toBeInTheDocument();
    expect(screen.getByTestId('player-season-reliability')).toBeInTheDocument();
    expect(screen.getByTestId('player-season-results')).toBeInTheDocument();
  });

  it('never lets the extra fetch delay the page: the season renders while it is still pending', async () => {
    vi.spyOn(statsApi, 'fetchFullPlayerStats').mockImplementation(() => new Promise(() => {}));
    renderPage();

    expect(await screen.findByTestId('player-season-header')).toBeInTheDocument();
    expect(screen.getByTestId('player-season-results')).toBeInTheDocument();
    expect(screen.queryByTestId('skill-line')).not.toBeInTheDocument();
  });

  it('leaves out only the empty lists, keeping the chart', async () => {
    vi.spyOn(statsApi, 'fetchFullPlayerStats').mockResolvedValue({
      ...fullStats,
      top_partners: [],
      top_clubs: [],
    });
    renderPage();

    expect(await screen.findByTestId('skill-line')).toBeInTheDocument();
    expect(screen.queryByTestId('top-partners')).not.toBeInTheDocument();
    expect(screen.queryByTestId('top-clubs')).not.toBeInTheDocument();
  });
});

/**
 * Both rejection shapes this endpoint's 404 actually takes — see the comment above
 * `fetchFullPlayerStats`. Either way the answer is "not visible", which must be
 * silent: no blocks, no error card, and the public page intact.
 */
describe('the full player page, signed in but not entitled (404)', () => {
  const shapes: Array<[name: string, rejection: unknown]> = [
    ['the bare 404 shape', { status: 404, isNotFound: true, message: 'Not found' }],
    ['the enveloped 404 shape (no isNotFound key)', { status: 404, code: 'PLAYER_NOT_FOUND', message: 'Player not found' }],
  ];

  it.each(shapes)('renders nothing extra and no error for %s', async (_name, rejection) => {
    signedIn('ready');
    const full = vi.spyOn(statsApi, 'fetchFullPlayerStats').mockRejectedValue(rejection);
    renderPage();

    expect(await screen.findByTestId('player-season-header')).toBeInTheDocument();
    await waitFor(() => expect(full).toHaveBeenCalled());

    expect(screen.queryByTestId('skill-line')).not.toBeInTheDocument();
    expect(screen.queryByTestId('top-partners')).not.toBeInTheDocument();
    expect(screen.queryByTestId('top-clubs')).not.toBeInTheDocument();
    expect(screen.queryByTestId('player-season-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('player-season-results')).toBeInTheDocument();
  });
});
