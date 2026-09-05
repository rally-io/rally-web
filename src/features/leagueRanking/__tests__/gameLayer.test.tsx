import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { LeagueFetch, LeagueResult, MyLeagueCard, PublicStandings, StandingsRow } from '../types';
import { biggestClimb, findChaseTarget } from '../components/boardInsights';

vi.mock('../api/publicLeague', () => ({
  fetchPublicStandings: vi.fn(),
  fetchPublicPlayerSeason: vi.fn(),
}));
vi.mock('../api/myLeague', () => ({ fetchMyLeagueCard: vi.fn(), fetchMyStandings: vi.fn() }));

const mockSession = vi.hoisted(() => ({ current: null as { user: { id: string } } | null }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ session: mockSession.current, user: null }),
}));

import { fetchPublicStandings } from '../api/publicLeague';
import { fetchMyLeagueCard, fetchMyStandings } from '../api/myLeague';
import RankingPage from '../pages/RankingPage';

/**
 * `overrides` is spread last so a test can vary the block fields (`band_code`,
 * `is_provisional`) without touching the defaults every existing call relies on.
 * The defaults — level B, settled — deliberately match `signIn`'s card, so the
 * chase tests that predate the block rule still describe a same-block chase.
 */
const row = (
  rank: number,
  id: string,
  points: number,
  rankChange: number | null = null,
  overrides: Partial<StandingsRow> = {},
): StandingsRow => ({
  rank,
  player_id: id,
  first_name: `P${id}`,
  last_name: 'Levi',
  avatar_url: null,
  avatar_clean_url: null,
  skill_tier: null,
  band_code: 'B',
  gender: null,
  points,
  counted_results: 3,
  rank_change: rankChange,
  is_provisional: false,
  ...overrides,
});

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

const SEASON = {
  id: 's1',
  name: 'Season 1',
  starts_at: '2026-01-01T00:00:00Z',
  ends_at: '2026-12-31T00:00:00Z',
  counting_results: 4,
  is_active: true,
  quarters: [],
};

const standings = (rows: StandingsRow[]): LeagueFetch<PublicStandings> => ({
  kind: 'ok',
  data: { season: SEASON, frame: 'global', total_players: 1204, rows, me: null },
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

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.current = null;
});

describe('findChaseTarget', () => {
  const rows = [row(1, 'a', 900), row(2, 'b', 800), row(2, 'c', 790), row(4, 'd', 700)];

  it('targets the row directly above, and inside a tied group the closest one', () => {
    // Above rank 4 sit two rows tied at 2 — the chase is the LAST of them,
    // because server order is points-descending and that one is nearest.
    expect(findChaseTarget(rows, 4)?.player_id).toBe('c');
  });

  it('returns null for the leader and for the unranked', () => {
    expect(findChaseTarget(rows, 1)).toBeNull();
    expect(findChaseTarget(rows, null)).toBeNull();
  });

  it('returns null when the rows on screen do not reach above the viewer', () => {
    expect(findChaseTarget([row(60, 'x', 100)], 51)).toBeNull();
  });

  it('hides rather than pointing at a distant row when the true neighbour is off-page', () => {
    // Only the leader is on screen; a 47th's real neighbour (46) is not.
    // Claiming "next spot — 1" would be a lie, so the chase stays hidden.
    expect(findChaseTarget([row(1, 'a', 900)], 47)).toBeNull();
  });
});

describe('biggestClimb', () => {
  it('crowns the biggest climb from ▲2 up, and never a mere ▲1', () => {
    expect(biggestClimb([row(1, 'a', 900, 1), row(2, 'b', 800, 9)])).toBe(9);
    expect(biggestClimb([row(1, 'a', 900, 1), row(2, 'b', 800, 0)])).toBeNull();
    expect(biggestClimb([row(1, 'a', 900, null)])).toBeNull();
  });
});

describe('the game layer on the page', () => {
  function signIn(
    results: LeagueResult[],
    globalRank: number | null = 47,
    extra: Partial<MyLeagueCard> = {},
  ): void {
    mockSession.current = { user: { id: 'u1' } };
    vi.mocked(fetchMyLeagueCard).mockResolvedValue({
      kind: 'ok',
      data: {
        season: SEASON,
        points: 421,
        global_rank: globalRank,
        rank_change: 4,
        results,
        movement_reason: null,
        band_code: 'B',
        is_provisional: false,
        level_rank: null,
        gap_to_above: null,
        career_points: 0,
        quarters: [],
        ...extra,
      },
    });
  }

  it('shows the chase with the named target and the exact gap', async () => {
    signIn([]);
    vi.mocked(fetchPublicStandings).mockResolvedValue(
      standings([row(45, 'a', 440), row(46, 'b', 433), row(47, 'me', 421)]),
    );

    renderPage();

    const chase = await screen.findByTestId('league-chase');
    expect(within(chase).getByText('Pb Levi')).toBeTruthy();
    // 433 - 421: the gap is computed from the card's own points.
    expect(within(chase).getByText(/12/)).toBeTruthy();
  });

  it('hides the chase when the row above belongs to another level', async () => {
    // A settled B player at global rank 3. The board is ordered level-first, so
    // the rows above them are the bottom of level A — a gap rule 4 makes
    // closable only by a level change, never by points. Offering it as a chase
    // would invite them to run at a wall, so no chase is offered at all.
    signIn([result('a', 150, true)], 3, { band_code: 'B', is_provisional: false });
    vi.mocked(fetchPublicStandings).mockResolvedValue(
      standings([
        row(1, 'a', 900, null, { band_code: 'A' }),
        row(2, 'b', 800, null, { band_code: 'A' }),
        row(3, 'me', 421),
      ]),
    );

    renderPage();

    await screen.findByTestId('league-personal-card');
    // The A row directly above is provably on screen before the absence is
    // asserted — otherwise "no chase" would pass merely because the rows had
    // not arrived yet, with or without the block rule. `findAllBy` because the
    // pre-fix page renders that name twice (table row plus chase panel), and
    // the ambiguity must not throw here: the assertion below is the one that
    // should report the failure.
    expect(await screen.findAllByText('Pb Levi')).not.toHaveLength(0);
    expect(screen.queryByTestId('league-chase')).toBeNull();
  });

  it('shows the chase when that same row shares the viewer\'s level', async () => {
    // The twin of the test above, differing only in the target's band — which
    // is what proves the negative there is the rule firing, not a dead page.
    signIn([result('a', 150, true)], 3, { band_code: 'B', is_provisional: false });
    vi.mocked(fetchPublicStandings).mockResolvedValue(
      standings([
        row(1, 'a', 900, null, { band_code: 'B' }),
        row(2, 'b', 800, null, { band_code: 'B' }),
        row(3, 'me', 421),
      ]),
    );

    renderPage();

    const chase = await screen.findByTestId('league-chase');
    expect(within(chase).getByText('Pb Levi')).toBeTruthy();
    // 800 - 421.
    expect(within(chase).getByText(/379/)).toBeTruthy();
  });

  it('crowns every row tied for the biggest weekly climb, and only those', async () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      row(i + 1, `p${i + 1}`, 900 - i * 10, i === 3 || i === 7 ? 9 : 1),
    );
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings(rows));

    renderPage();

    await screen.findByTestId('top-ranks');
    // p4 sits in the featured column, p8 also featured; both climbed ▲9.
    expect(screen.getAllByTestId('league-climber')).toHaveLength(2);
  });

  it('collapses to one slim line for a player with nothing yet — no tray, no chase', async () => {
    signIn([], null); // unranked, zero results
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();

    const card = await screen.findByTestId('league-personal-card');
    expect(within(card).getByText(/Not ranked yet/i)).toBeTruthy();
    expect(within(card).queryByTestId('league-quarters')).toBeNull();
    expect(within(card).queryByTestId('league-chase')).toBeNull();
  });

  it('crowns nobody when nothing moved', async () => {
    vi.mocked(fetchPublicStandings).mockResolvedValue(
      standings([row(1, 'a', 900, 0), row(2, 'b', 800, 0)]),
    );

    renderPage();

    await screen.findByRole('table');
    expect(screen.queryByTestId('league-climber')).toBeNull();
  });

  const quarter = (key: string, dropsAt: string, points: number, available: number, results: LeagueResult[]) =>
    ({ key, starts_at: '', ends_at: '', drops_at: dropsAt, points, available, results });

  it('shows the four quarter tiles, newest first, with totals and the last counting day', async () => {
    signIn([result('a', 150, true), result('b', 90, true), result('c', 115, true)], 19, {
      quarters: [
        quarter('2025-Q4', '2026-09-30T21:00:00Z', 0, 0, []),
        quarter('2026-Q1', '2026-12-31T22:00:00Z', 0, 0, []),
        quarter('2026-Q2', '2027-03-31T21:00:00Z', 407, 638, [result('a', 150, true)]),
        quarter('2026-Q3', '2027-06-30T21:00:00Z', 205, 353, [result('b', 90, true), result('c', 115, true)]),
      ],
    });
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();

    const tiles = await screen.findByTestId('league-quarters');
    const keys = within(tiles).getAllByTestId(/^league-quarter-/).map(el => el.getAttribute('data-quarter'));
    expect(keys).toEqual(['2026-Q3', '2026-Q2', '2026-Q1', '2025-Q4']);
    const q3 = within(tiles).getByTestId('league-quarter-2026-Q3');
    expect(q3).toHaveTextContent('205');
    expect(q3).toHaveTextContent('30.6.2027');
    // The oldest tile says when it leaves, not until when it counts.
    expect(within(tiles).getByTestId('league-quarter-2025-Q4')).toHaveTextContent('1.10.2026');
  });

  it('says leading only when the rank on the board being viewed is 1', async () => {
    // Global 19 but first in the level: leading on the band frame, not on global.
    signIn([result('a', 150, true)], 19, { level_rank: 1, band_code: 'B' });
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();

    await screen.findByTestId('league-personal-card');
    expect(screen.queryByTestId('league-chase-leading')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'By level' }));
    fireEvent.click(within(screen.getByTestId('band-picker')).getByRole('button', { name: 'B' }));
    await waitFor(() => expect(screen.getByTestId('league-chase-leading')).toBeTruthy());

    // Looking at another level's board is not leading it.
    fireEvent.click(within(screen.getByTestId('band-picker')).getByRole('button', { name: 'A' }));
    await waitFor(() => expect(screen.queryByTestId('league-chase-leading')).toBeNull());
  });

  it('shows the other rank, the reason and career points on the card', async () => {
    signIn([result('a', 150, true)], 19, { level_rank: 7, band_code: 'B', career_points: 1140, movement_reason: 'played' });
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();

    const card = await screen.findByTestId('league-personal-card');
    // On the global frame (the page's default) the other rank is the level one.
    expect(within(card).getByTestId('league-personal-other-rank')).toHaveTextContent(/7/);
    expect(within(card).getByTestId('league-personal-reason')).toHaveTextContent(/since your last tournament/i);
    expect(within(card).getByTestId('league-personal-career')).toHaveTextContent(/1,?140/);
  });

  it('makes the hero the rank of the board on screen, with the other rank beside it', async () => {
    // Spec §5: on their own level board the card reads "#7 in B · #19 overall".
    // The bug this replaces printed the GLOBAL rank as the hero on every frame
    // and then repeated that same number in the sub-line, so the rank of the
    // board actually being viewed never appeared anywhere on the card.
    signIn([result('a', 150, true)], 19, { level_rank: 7, band_code: 'B' });
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();

    // `getByText` with an exact string matches only an element's own text
    // children, so it lands on RankCell's numeral span and not on the
    // sub-line's "#7 in level B" or the movement badge.
    const cardNow = () => screen.getByTestId('league-personal-card');
    await screen.findByTestId('league-personal-card');
    expect(within(cardNow()).getByText('19')).toBeTruthy();
    expect(within(cardNow()).getByTestId('league-personal-other-rank')).toHaveTextContent(/7/);

    // The viewer's own level board ranks them 7th — so 7 is the hero and 19
    // moves to the sub-line.
    fireEvent.click(screen.getByRole('button', { name: 'By level' }));
    fireEvent.click(within(screen.getByTestId('band-picker')).getByRole('button', { name: 'B' }));
    await waitFor(() => expect(within(cardNow()).getByText('7')).toBeTruthy());
    expect(within(cardNow()).getByTestId('league-personal-other-rank')).toHaveTextContent(/19/);

    // Another level's board does not rank this player at all, so the card
    // falls back to the global hero and the level sub-line.
    fireEvent.click(within(screen.getByTestId('band-picker')).getByRole('button', { name: 'A' }));
    await waitFor(() => expect(within(cardNow()).getByText('19')).toBeTruthy());
    expect(within(cardNow()).getByTestId('league-personal-other-rank')).toHaveTextContent(/7/);
  });
});

describe('the level picker default', () => {
  function signInWithBand(band: 'A' | 'B' | 'C' | 'D'): void {
    mockSession.current = { user: { id: 'u1' } };
    vi.mocked(fetchMyLeagueCard).mockResolvedValue({
      kind: 'ok',
      data: {
        season: SEASON,
        points: 421,
        global_rank: 19,
        rank_change: null,
        results: [],
        movement_reason: null,
        band_code: band,
        is_provisional: false,
        level_rank: 7,
        gap_to_above: null,
        career_points: 0,
        quarters: [],
      },
    });
  }

  it('opens "By level" on the viewer\'s own level, without a tap on the picker', async () => {
    signInWithBand('C');
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();
    await screen.findByTestId('league-personal-card');

    fireEvent.click(screen.getByRole('button', { name: 'By level' }));

    const picker = await screen.findByTestId('band-picker');
    await waitFor(() =>
      expect(within(picker).getByRole('button', { name: 'C' })).toHaveAttribute('aria-pressed', 'true'),
    );
    // The request went out for that level — nobody had to choose it.
    await waitFor(() =>
      expect(vi.mocked(fetchPublicStandings).mock.calls.some(call => call[0]?.band === 'C')).toBe(true),
    );
    expect(screen.queryByTestId('league-awaiting-band')).toBeNull();
  });

  it('lets an explicit pick win over the default, and defaults again on return', async () => {
    signInWithBand('C');
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();
    await screen.findByTestId('league-personal-card');

    fireEvent.click(screen.getByRole('button', { name: 'By level' }));
    const picker = await screen.findByTestId('band-picker');
    fireEvent.click(within(picker).getByRole('button', { name: 'A' }));
    expect(within(picker).getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(picker).getByRole('button', { name: 'C' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Global' }));
    fireEvent.click(screen.getByRole('button', { name: 'By level' }));
    const pickerAgain = await screen.findByTestId('band-picker');
    expect(within(pickerAgain).getByRole('button', { name: 'C' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('assumes nothing for a signed-out visitor: the picker still waits for a choice', async () => {
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: 'By level' }));
    expect(await screen.findByTestId('league-awaiting-band')).toBeInTheDocument();
    const picker = screen.getByTestId('band-picker');
    for (const band of ['A', 'B', 'C', 'D']) {
      expect(within(picker).getByRole('button', { name: band })).toHaveAttribute('aria-pressed', 'false');
    }
  });
});

describe('the circle frame', () => {
  it('logged out: the circle tab is a door — sign-in CTA, and no circle request fired', async () => {
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));

    renderPage();

    await screen.findByRole('table');
    fireEvent.click(screen.getByTestId('league-frame-circle'));

    const cta = await screen.findByTestId('league-circle-cta');
    // One honest button: /login carries both sign-in and sign-up modes.
    expect(within(cta).getByRole('link', { name: 'Log in or sign up' }).getAttribute('href')).toBe(
      '/login?next=/ranking',
    );
    // The guarded hook must never ask the authed endpoint on behalf of nobody.
    expect(vi.mocked(fetchMyStandings)).not.toHaveBeenCalled();
  });

  it('signed in with zero opponents: the go-play invitation, not a bare empty table', async () => {
    signInBare();
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));
    vi.mocked(fetchMyStandings).mockResolvedValue({
      kind: 'ok',
      data: { season: SEASON, frame: 'circle', total_players: 0, rows: [], me: null },
    });

    renderPage();

    await screen.findByRole('table');
    fireEvent.click(screen.getByTestId('league-frame-circle'));

    const empty = await screen.findByTestId('league-circle-empty');
    expect(within(empty).getByText(/haven't faced anyone yet/i)).toBeTruthy();
    expect(within(empty).getByRole('link', { name: 'Find a tournament' }).getAttribute('href')).toBe(
      '/tournaments',
    );
  });

  it('signed in with opponents: a real circle renders as the table, not the invitation', async () => {
    signInBare();
    vi.mocked(fetchPublicStandings).mockResolvedValue(standings([row(1, 'a', 900)]));
    vi.mocked(fetchMyStandings).mockResolvedValue({
      kind: 'ok',
      data: {
        season: SEASON,
        frame: 'circle',
        total_players: 2,
        rows: [row(1, 'x', 300), row(2, 'y', 200)],
        me: null,
      },
    });

    renderPage();

    await screen.findByRole('table');
    fireEvent.click(screen.getByTestId('league-frame-circle'));

    await screen.findByText('Px Levi');
    expect(screen.queryByTestId('league-circle-empty')).toBeNull();
    expect(screen.queryByTestId('league-circle-cta')).toBeNull();
  });
});

/** Signed in with an empty card — enough session for the circle to be fetchable. */
function signInBare(): void {
  mockSession.current = { user: { id: 'u1' } };
  vi.mocked(fetchMyLeagueCard).mockResolvedValue({
    kind: 'ok',
    data: {
      season: SEASON,
      points: 0,
      global_rank: null,
      rank_change: null,
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
}
