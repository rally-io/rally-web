import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PersonalCard } from '../components/PersonalCard';
import type { MyLeagueCard } from '../types';

/**
 * Two independent trust signals meet on this card:
 *   - `level_verified` — a claim about the LEVEL (the number/band). Seal + a level
 *     line, either way.
 *   - `is_provisional` — a claim about the RANK (fewer than 4 rated matches to hold
 *     a settled place on the level board). A separate line, only when true.
 *
 * Neither implies the other. This suite pins that they never share a string and
 * that both can render on screen at once.
 *
 * `level_verified` ITSELF IS THREE STATES, not two (spec §4): `true`/`false` are
 * the server's own claim, either direction; `null` means the server said nothing
 * (an older API build omits the field entirely — see `feat/league-ranking` on
 * rally-api's `LeagueMeOut`). This is the viewer's OWN card, so a `null` here is
 * not a hypothetical: the same rule that stops every other league surface from
 * asserting "not verified" about a fact nobody stated applies to the signed-in
 * player looking at themselves. The null case below pins that the whole level
 * line — colour, seal, and sentence together — disappears rather than guessing.
 *
 * NOTE ON DEVIATION FROM THE BRIEF: the brief's own Step 1 sample asserts
 * `getByTestId('league-reliability-ring')` — but the same brief's header (and the
 * task's explicit ruling) says a `ReliabilityRing` must NEVER appear here:
 * `MyLeagueCardSchema` carries no `skill_level`, so the ring's `value` prop (the
 * level, two decimals) would always be null and draw "no level yet" for a player
 * who has one. That sample test is stale from an earlier draft; this file asserts
 * the ring is ABSENT instead, and adds a "provisional props" object so the required
 * `frameLabel` / `frame` / `band` props (omitted in the brief's snippet) type-check.
 */

const SEASON = {
  id: 's1',
  name: 'Season 1',
  starts_at: '2026-01-01T00:00:00Z',
  ends_at: '2026-12-31T00:00:00Z',
  counting_results: 4,
  is_active: true,
  quarters: [],
};

const card = (overrides: Partial<MyLeagueCard> = {}): MyLeagueCard => ({
  season: SEASON,
  points: 421,
  global_rank: 4,
  rank_change: null,
  results: [],
  movement_reason: null,
  band_code: 'B',
  level_rank: 4,
  level_players: 30,
  level_rank_change: null,
  gap_to_above: null,
  career_points: 900,
  quarters: [],
  is_provisional: false,
  level_verified: false,
  level_reliability: 40,
  ...overrides,
});

// Required by `PersonalCardProps` — the brief's snippet omits them entirely.
const baseProps = { frameLabel: 'globally', frame: 'global' as const, band: null };

describe('PersonalCard trust signals', () => {
  it('never renders a ReliabilityRing on the own card (MyLeagueCard carries no skill_level)', () => {
    render(<PersonalCard card={card()} {...baseProps} />);
    expect(screen.queryByTestId('league-reliability-ring')).not.toBeInTheDocument();
  });

  it('unverified: no seal, and a level note that reads as "still firming", not "unverified level"', () => {
    render(<PersonalCard card={card()} {...baseProps} />);
    expect(screen.queryByTestId('verified-seal')).not.toBeInTheDocument();
    expect(screen.getByTestId('league-level-note')).toHaveTextContent('Your level is still firming up');
  });

  it('shows the seal once verified, and swaps the level note to the verified copy', () => {
    render(<PersonalCard card={card({ level_verified: true, level_reliability: 91 })} {...baseProps} />);
    expect(screen.getByTestId('verified-seal')).toBeInTheDocument();
    expect(screen.getByTestId('league-level-note')).toHaveTextContent('Your level is verified');
  });

  it('the server said nothing (null): no accent, no seal, no "still firming up" — never asserts on the player\'s own behalf', () => {
    render(<PersonalCard card={card({ level_verified: null })} {...baseProps} />);
    expect(screen.queryByTestId('league-level-note')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verified-seal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verified-seal-ghost')).not.toBeInTheDocument();
  });

  it('a null level_verified does not swallow the independent provisional note', () => {
    render(<PersonalCard card={card({ level_verified: null, is_provisional: true })} {...baseProps} />);
    expect(screen.queryByTestId('league-level-note')).not.toBeInTheDocument();
    expect(screen.getByTestId('league-provisional-note')).toBeInTheDocument();
  });

  it('hides the provisional note once the player is past provisional', () => {
    render(<PersonalCard card={card({ is_provisional: false })} {...baseProps} />);
    expect(screen.queryByTestId('league-provisional-note')).not.toBeInTheDocument();
  });

  it('provisional and level notes are two different sentences — compares the actual text, not mere presence', () => {
    render(<PersonalCard card={card({ is_provisional: true })} {...baseProps} />);
    const provisionalText = screen.getByTestId('league-provisional-note').textContent;
    const levelText = screen.getByTestId('league-level-note').textContent;
    expect(provisionalText).toBeTruthy();
    expect(levelText).toBeTruthy();
    expect(provisionalText).not.toBe(levelText);
    // And neither sentence borrows the other signal's vocabulary: the level note
    // never says "rank"/"provisional", the provisional note never says "level"/"verified".
    expect(levelText).not.toMatch(/provisional|rank/i);
    expect(provisionalText).not.toMatch(/level|verified/i);
  });

  it('a verified-but-still-provisional player shows BOTH signals at once — neither hides the other', () => {
    render(<PersonalCard card={card({ is_provisional: true, level_verified: true })} {...baseProps} />);
    expect(screen.getByTestId('verified-seal')).toBeInTheDocument();
    expect(screen.getByTestId('league-level-note')).toHaveTextContent('Your level is verified');
    expect(screen.getByTestId('league-provisional-note')).toBeInTheDocument();
  });

  it('an unverified-but-past-provisional player shows the level note alone — no provisional note', () => {
    render(<PersonalCard card={card({ is_provisional: false, level_verified: false })} {...baseProps} />);
    expect(screen.getByTestId('league-level-note')).toBeInTheDocument();
    expect(screen.queryByTestId('league-provisional-note')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verified-seal')).not.toBeInTheDocument();
  });
});
