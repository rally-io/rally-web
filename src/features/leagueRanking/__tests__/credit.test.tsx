import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
  level_verified: false,
  level_reliability: null,
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
      {/* The page links to /ranking/how, so it needs router context even though
          it takes no route params of its own. */}
      <MemoryRouter>
        <RankingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.current = null;
  mockUser.current = null;
});

/**
 * Tom Bakshi Padel Community collaborates on the rating — it does not own it.
 * The old copy ("Powered by" / Hebrew "the old led-by label") read as ownership of the whole
 * system and was replaced with a muted collaboration line under the hero, plus
 * a long-form credit in the page footer. Tests run in English
 * (src/test-setup.ts calls i18n.changeLanguage('en')), so this asserts the
 * English strings rather than the Hebrew ones the original plan sketched.
 */
describe('RankingPage collaboration credit', () => {
  it('credits the collaboration and never claims leadership', async () => {
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();
    await screen.findByRole('table');

    expect(
      screen.getByText('In collaboration with Tom Bakshi Padel Community'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Powered by/)).not.toBeInTheDocument();
    expect(screen.queryByText(/led by/i)).not.toBeInTheDocument();
  });

  it('puts the long-form credit in the page footer, not beside the hero line', async () => {
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();
    await screen.findByRole('table');

    const longCredit = screen.getByText(
      /The rating was built in collaboration with Tom Bakshi Padel Community/,
    );
    expect(longCredit.closest('footer')).not.toBeNull();
  });

  it('renders the collaboration line with no card: no border, no background', async () => {
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();
    await screen.findByRole('table');

    const line = screen.getByText('In collaboration with Tom Bakshi Padel Community');
    expect(line.className).not.toMatch(/border|bg-rally-surface/);
  });
});
