import { render as rtlRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { StandingsTable } from '../components/StandingsTable';
import { TopRanks } from '../components/TopRanks';
import type { StandingsRow } from '../types';

// Both board surfaces link every row to the ball, so both need router context.
function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: MemoryRouter });
}

/**
 * Pins the THREE-STATE rule (spec §4) on the board surfaces: `true` renders the real
 * seal, `false` renders the ghost (never nothing), `null` renders neither. Replaced
 * the old two-state D2 guard on 2026-09-10 — that guard asserted a verified-vs-not
 * pair via `getByTestId('verified-seal')` / `queryByTestId('verified-seal')` absence,
 * which stayed green after `VerificationMark` started rendering a ghost for `false`
 * (testid `verified-seal-ghost`, asserted in `VerifiedSeal.test.tsx` and
 * `VerificationMark.test.tsx`) because that testid was never queried here: `false`
 * and `null` both satisfied "no `verified-seal`" identically, so the suite quietly
 * stopped telling them apart. `[data-verified]` — set by `VerificationMark` itself,
 * only when it has an opinion — is what actually discriminates all three states, so
 * that is what every assertion below reads.
 *
 * Typed against the real `StandingsRow` shape (see `standingsTable.test.tsx` /
 * `topRanks.test.tsx` for the same pattern) rather than a hand-rolled literal —
 * `skill_tier` is one of `SKILL_TIERS`, and `counted_results` / `is_provisional`
 * are required fields the brief's proposed fixture omitted.
 */
function row(overrides: Partial<StandingsRow> = {}): StandingsRow {
  return {
    rank: 1,
    player_id: 'p1',
    first_name: 'Noa',
    last_name: 'Levi',
    points: 421,
    skill_tier: 'gold',
    band_code: 'A',
    is_provisional: false,
    avatar_url: null,
    avatar_clean_url: null,
    counted_results: 6,
    rank_change: null,
    level_verified: false,
    level_reliability: 40,
    ...overrides,
  };
}

describe('StandingsTable shows verification — seal comes from PlayerIdentity, untouched here', () => {
  it('true: the real seal, marked data-verified="true"', () => {
    const { container } = render(<StandingsTable rows={[row({ level_verified: true })]} />);
    expect(container.querySelector('[data-verified="true"]')).toBeInTheDocument();
    expect(container.querySelector('[data-verified="false"]')).not.toBeInTheDocument();
  });

  it('false: the ghost, marked data-verified="false" — not nothing', () => {
    const { container } = render(<StandingsTable rows={[row({ level_verified: false })]} />);
    expect(container.querySelector('[data-verified="false"]')).toBeInTheDocument();
    expect(container.querySelector('[data-verified="true"]')).not.toBeInTheDocument();
  });

  it('null: neither state — the server never said, so nothing is asserted', () => {
    const { container } = render(<StandingsTable rows={[row({ level_verified: null })]} />);
    expect(container.querySelector('[data-verified="true"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-verified="false"]')).not.toBeInTheDocument();
  });

  it('a mixed board marks each row by its own state — true, false and null side by side', () => {
    const { container } = render(
      <StandingsTable
        rows={[
          row({ player_id: 'a', level_verified: true }),
          row({ player_id: 'b', rank: 2, level_verified: false }),
          row({ player_id: 'c', rank: 3, level_verified: null }),
        ]}
      />,
    );
    expect(container.querySelectorAll('[data-verified="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-verified="false"]')).toHaveLength(1);
  });

  it('the band pill is untouched by verification', () => {
    render(<StandingsTable rows={[row({ level_verified: true })]} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});

function renderTopRanks(rows: StandingsRow[]) {
  return render(<TopRanks rows={rows} />);
}

describe('TopRanks shows verification — it draws its own name block, so its own seal', () => {
  it('true: the real seal, marked data-verified="true"', () => {
    const { container } = renderTopRanks([row({ level_verified: true })]);
    expect(container.querySelector('[data-verified="true"]')).toBeInTheDocument();
    expect(container.querySelector('[data-verified="false"]')).not.toBeInTheDocument();
  });

  it('false: the ghost, marked data-verified="false" — not nothing', () => {
    const { container } = renderTopRanks([row({ level_verified: false })]);
    expect(container.querySelector('[data-verified="false"]')).toBeInTheDocument();
    expect(container.querySelector('[data-verified="true"]')).not.toBeInTheDocument();
  });

  it('null: neither state — the server never said, so nothing is asserted', () => {
    const { container } = renderTopRanks([row({ level_verified: null })]);
    expect(container.querySelector('[data-verified="true"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-verified="false"]')).not.toBeInTheDocument();
  });

  it('a mixed podium marks each row by its own state — true, false and null side by side', () => {
    const { container } = renderTopRanks([
      row({ player_id: 'a', rank: 1, level_verified: true }),
      row({ player_id: 'b', rank: 2, level_verified: false }),
      row({ player_id: 'c', rank: 3, level_verified: null }),
    ]);
    expect(container.querySelectorAll('[data-verified="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-verified="false"]')).toHaveLength(1);
  });

  it('the rank numeral and band pill are untouched by verification', () => {
    renderTopRanks([row({ level_verified: true })]);
    expect(screen.getByTestId('top-rank')).toHaveTextContent('1');
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
