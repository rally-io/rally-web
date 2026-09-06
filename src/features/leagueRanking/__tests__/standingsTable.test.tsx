import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { StandingsTable } from '../components/StandingsTable';
import type { StandingsRow } from '../types';

/**
 * The two rank tests below are a pair, and neither replaces the other.
 *
 * A client-side competition ranking computed over the rendered page would satisfy
 * the tie test on its own — it too emits 1, 1, 3. Only the paging test can tell
 * the two apart: a page that opens at rank 51 opens at 51, and every client-side
 * derivation over that page (index + 1, a counter, a re-ranking) yields 1.
 *
 * Fixture numbers are chosen so no other cell's text is exactly "1", "2", "3" or
 * "51": points and counted results would otherwise satisfy an exact-text query and
 * make these assertions pass for the wrong reason.
 */
function row(rank: number, playerId: string, overrides: Partial<StandingsRow> = {}): StandingsRow {
  return {
    rank,
    player_id: playerId,
    first_name: 'Noa',
    last_name: playerId.toUpperCase(),
    avatar_url: null,
    avatar_clean_url: null,
    skill_tier: null,
    band_code: 'A',
    points: 420,
    counted_results: 6,
    rank_change: null,
    is_provisional: false,
    ...overrides,
  };
}

function bodyRows(): HTMLElement[] {
  // Row 0 is the header row; the body rows follow it.
  return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

describe('StandingsTable — ranks are the server’s, and ties are real', () => {
  it('renders a tie as 1, 1, 3 and never renumbers it to 1, 2, 3', () => {
    render(<StandingsTable rows={[row(1, 'pa'), row(1, 'pb'), row(3, 'pc')]} />);

    expect(screen.getAllByText('1')).toHaveLength(2);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('2')).toBeNull();
  });

  it('renders a page that starts at rank 51 starting at 51', () => {
    render(<StandingsTable rows={[row(51, 'pa'), row(52, 'pb'), row(53, 'pc')]} />);

    const rows = bodyRows();
    expect(within(rows[0]).getByText('51')).toBeInTheDocument();
    expect(within(rows[1]).getByText('52')).toBeInTheDocument();
    expect(within(rows[2]).getByText('53')).toBeInTheDocument();

    // What an index-derived implementation would have rendered instead.
    expect(screen.queryByText('1')).toBeNull();
    expect(screen.queryByText('2')).toBeNull();
    expect(screen.queryByText('3')).toBeNull();
  });

  it('keeps the server’s row order instead of sorting the page itself', () => {
    // The server may return a frame ordered by something other than rank alone.
    render(<StandingsTable rows={[row(7, 'pa'), row(4, 'pb'), row(9, 'pc')]} />);

    const ranks = bodyRows().map(r => within(r).getByTestId('standings-rank').textContent);
    expect(ranks).toEqual(['7', '4', '9']);
  });

  it('delegates movement to RankCell rather than reimplementing it', () => {
    render(<StandingsTable rows={[row(9, 'pa', { rank_change: -12 })]} />);

    const movement = screen.getByTestId('rank-movement');
    expect(movement).toHaveAttribute('data-direction', 'down');
    expect(movement.textContent).toContain('12');
    expect(movement.textContent).not.toContain('-12');
  });
});

describe('StandingsTable — the rest of the row', () => {
  it('renders each player’s identity, band and points', () => {
    render(<StandingsTable rows={[row(1, 'pa', { band_code: 'C', points: 375 })]} />);

    expect(screen.getByText('Noa PA')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('375')).toBeInTheDocument();
  });

  it('renders a placeholder for a player with no band rather than an empty cell', () => {
    render(<StandingsTable rows={[row(1, 'pa', { band_code: null })]} />);
    expect(screen.getByTestId('standings-band')).toHaveTextContent('—');
  });
});

describe('StandingsTable — empty, named and scrollable', () => {
  it('renders an explicit empty state, not a bare table head', () => {
    render(<StandingsTable rows={[]} />);

    expect(screen.getByText('No players are ranked yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('columnheader')).toBeNull();
  });

  it('lets the caller word the empty state for the frame being shown', () => {
    render(<StandingsTable rows={[]} emptyMessage="Nobody is ranked in level A yet." />);
    expect(screen.getByText('Nobody is ranked in level A yet.')).toBeInTheDocument();
  });

  it('gives the table an accessible name, because this page is public', () => {
    render(<StandingsTable rows={[row(1, 'pa')]} />);
    expect(screen.getByRole('table', { name: 'League standings' })).toBeInTheDocument();
  });

  it('lets the caller name the table after the frame it is showing', () => {
    render(<StandingsTable rows={[row(1, 'pa')]} caption="Level A — 2026" />);
    expect(screen.getByRole('table', { name: 'Level A — 2026' })).toBeInTheDocument();
  });

  it('scrolls sideways inside its own container so the page body never does', () => {
    render(<StandingsTable rows={[row(1, 'pa')]} />);

    const scroller = screen.getByTestId('standings-scroll');
    expect(scroller.className).toContain('overflow-x-auto');
    expect(scroller).toContainElement(screen.getByRole('table'));
  });
});
