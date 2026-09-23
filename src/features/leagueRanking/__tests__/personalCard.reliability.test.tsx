import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VERIFIED_RELIABILITY_THRESHOLD } from '@/components/players/level';
import { PersonalCard } from '../components/PersonalCard';
import type { MyLeagueCard } from '../types';

/**
 * Reliability is PUBLIC (shown about any player on every league surface), but the
 * TARGET clause — "you have this far to go" — is self-only: telling a visitor what
 * someone else has left to earn is noise, but on the viewer's own card it is the
 * thing they act on. This suite covers `PersonalCard`, the viewer's own card.
 *
 * DEVIATION FROM THE BRIEF, both intentional:
 *
 * 1. The brief's Step 4 sample writes `level.reliability.line` / `level.reliability.target`
 *    — nesting under the existing flat `level.reliability` string. That is the exact
 *    collision Step 1 of this same brief warns against (and the one task 3 hit with
 *    `level.verified`): `level.reliability` is already a flat i18next STRING
 *    (`'{{pct}} level reliability'` / `'אמינות הרמה {{pct}}'`), consumed as-is by
 *    `LevelStatusLine.tsx`. Nesting `.line` under it would force it into an object and
 *    break that consumer. This suite exercises the keys Step 1 actually specifies:
 *    the untouched `level.reliability` plus a new flat sibling, `level.reliabilityTarget`.
 *
 * 2. The brief's Step 2 sample asserts Hebrew text (`/אמינות הרמה 40%/`, `/מאומת ב-86%/`).
 *    `src/test-setup.ts` force-sets the test locale to `en` for every test in this repo
 *    (`i18n.changeLanguage('en')` in `beforeAll`) — no test in this suite ever runs in
 *    Hebrew, so those exact literals could never match here. This file asserts the
 *    equivalent English copy instead.
 *
 * The percentage is rendered through `ltrIsolate` (U+2066 LRI … U+2069 PDI), the
 * established convention for a number/percent interpolated into a sentence
 * (`LevelStatusLine.tsx`, `explainerBlocks.ts`'s own `VERIFIED_RELIABILITY_THRESHOLD`
 * usage) — see `src/lib/bidi.ts` and `wiki/gotchas/web-rtl-score-string-mirroring.md`.
 * That is why the assertions below compare exact `.textContent`, not a regex spanning
 * the number: a regex like `/Verified at 86%/` would fail to match its own isolate
 * marks, and an exact-string comparison is also the strongest available guard against
 * anything extra (a countdown, a stray character) hiding in the line.
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

// Required by `PersonalCardProps` — omitted from the brief's snippet, same as the
// sibling `PersonalCard.levelFields.test.tsx`.
const baseProps = { frameLabel: 'globally', frame: 'global' as const, band: null };

describe('PersonalCard reliability + target', () => {
  it('an unverified card shows the percentage and the target', () => {
    render(<PersonalCard card={card({ level_verified: false, level_reliability: 40 })} {...baseProps} />);
    const line = screen.getByTestId('league-level-reliability');
    expect(line.textContent).toBe(`⁦40%⁩ level reliability · Verified at ⁦${VERIFIED_RELIABILITY_THRESHOLD}%⁩`);
  });

  it('a verified card shows the percentage and drops the target', () => {
    render(<PersonalCard card={card({ level_verified: true, level_reliability: 91 })} {...baseProps} />);
    const line = screen.getByTestId('league-level-reliability');
    expect(line.textContent).toBe('⁦91%⁩ level reliability');
    expect(line.textContent).not.toMatch(/Verified at/);
  });

  it('a card with no reliability shows neither', () => {
    render(<PersonalCard card={card({ level_verified: null, level_reliability: null })} {...baseProps} />);
    expect(screen.queryByTestId('league-level-reliability')).not.toBeInTheDocument();
  });

  it('a null level_verified with a reliability number still withholds the target — the server never said "unverified"', () => {
    render(<PersonalCard card={card({ level_verified: null, level_reliability: 55 })} {...baseProps} />);
    const line = screen.getByTestId('league-level-reliability');
    expect(line.textContent).toBe('⁦55%⁩ level reliability');
  });

  it('never renders a countdown', () => {
    const { container } = render(
      <PersonalCard card={card({ level_verified: false, level_reliability: 40 })} {...baseProps} />,
    );
    expect(container.textContent).not.toMatch(/עוד \d+/);
    expect(container.textContent).not.toMatch(/\d+ more (matches|tournaments)/i);
  });
});

/**
 * THE FOURTH STATE: no rating at all.
 *
 * The brief proposes detecting this with `level_reliability === 0 && counted_results
 * === 0` — verified against a live payload and against the paired API branch
 * (`rally-api-rating`, `feat/level-and-ranking`) and rejected on two independent
 * grounds:
 *
 * 1. `counted_results` is not a field on `MyLeagueCard` / `LeagueMeOut` at all —
 *    only `StandingsRow` (the public standings row) carries it. The brief's own
 *    Step 2 sample passes `counted_results: 0` to this suite's `card()` helper,
 *    which does not type-check against `MyLeagueCard`.
 * 2. `level_reliability === 0` is NOT unique to "no σ": `GET /public/league/standings`
 *    on a live local server (`rtk proxy curl`, 2026-09-10) showed the vast majority
 *    of real, ranked players sitting at `level_reliability: 0` while
 *    `counted_results` was 1 or 2 — a real σ that is simply still very uncertain,
 *    not an absent one. Gating on `=== 0` would strip the normal unverified mark
 *    from most of today's real unverified players.
 *
 * The actual signal, read from `app/routers/consumer/league.py::get_my_season` on
 * the paired API branch: `my_level_verified` and `my_level_reliability` are
 * initialised to `False` / `None` and are left untouched — never passed through
 * `level_fields()` / `reliability_snapshot()` — exactly when the caller has no
 * ledger rows in the window (`mine is None`) AND `caller.skill_level is None`.
 * Every other path (a real standings row, or a caller with a questionnaire-declared
 * `skill_level`) calls `level_fields()`, which always returns an `int` for
 * reliability, never `None` — `reliability_snapshot(sigma=None, ...)` itself
 * returns `(False, 0)`, an int zero. So on the wire, `null` means "no snapshot was
 * ever taken" and `0` means "a snapshot was taken and it read zero" — the pair
 * `(level_verified === false, level_reliability == null)` is the one combination
 * that only "no σ at all" produces.
 *
 * CAVEAT, stated plainly rather than buried: against the CURRENT API, this branch
 * is unreachable in production. `mine is None` also forces `global_rank: null` and
 * an empty `results` list on the same response (`season_totals()` and the `/me`
 * ledger query read the same `LeaguePointsLedger` table over the same rolling
 * window), which is exactly the condition `PersonalCard`'s own pre-existing early
 * return (`resultsInWindow === 0 && card.global_rank == null`) already intercepts,
 * rendering the separate minimal "not ranked yet" card instead. This suite still
 * pins the deep-card behaviour because the component's contract should be correct
 * for every field combination the schema allows, not only the ones today's server
 * happens to emit — and a future API change (e.g. a caller who has points this
 * window but genuinely no σ) would land exactly here.
 */
describe('PersonalCard — no rating at all (the null-shaped case)', () => {
  it('no σ at all (level_verified false, level_reliability null): the first-rating sentence, no mark, no reliability line', () => {
    const { container } = render(
      <PersonalCard card={card({ level_verified: false, level_reliability: null })} {...baseProps} />,
    );
    expect(screen.getByText('Your first rating arrives after your first tournament.')).toBeInTheDocument();
    expect(container.querySelector('[data-verified]')).not.toBeInTheDocument();
    expect(screen.queryByTestId('league-level-reliability')).not.toBeInTheDocument();
  });

  it('genuinely 0% WITH a real σ (level_verified false, level_reliability 0) keeps the normal unverified mark — not the first-rating sentence', () => {
    render(<PersonalCard card={card({ level_verified: false, level_reliability: 0 })} {...baseProps} />);
    expect(screen.queryByText(/first rating/i)).not.toBeInTheDocument();
    const mark = document.querySelector('[data-verified]');
    expect(mark).toBeInTheDocument();
    expect(mark).toHaveAttribute('data-verified', 'false');
    const line = screen.getByTestId('league-level-reliability');
    expect(line.textContent).toBe(`⁦0%⁩ level reliability · Verified at ⁦${VERIFIED_RELIABILITY_THRESHOLD}%⁩`);
  });

  it('the server saying nothing (both null) is a distinct state from "no rating at all" — neither mark nor first-rating text', () => {
    render(<PersonalCard card={card({ level_verified: null, level_reliability: null })} {...baseProps} />);
    expect(document.querySelector('[data-verified]')).not.toBeInTheDocument();
    expect(screen.queryByText(/first rating/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('league-level-note')).not.toBeInTheDocument();
  });

  it('verified (true, 91) is unaffected by the new branch: seal, verified note, no target', () => {
    render(<PersonalCard card={card({ level_verified: true, level_reliability: 91 })} {...baseProps} />);
    expect(screen.queryByText(/first rating/i)).not.toBeInTheDocument();
    const mark = document.querySelector('[data-verified]');
    expect(mark).toHaveAttribute('data-verified', 'true');
    expect(screen.getByTestId('league-level-note')).toHaveTextContent('Your level is verified');
    expect(screen.getByTestId('league-level-reliability').textContent).toBe('⁦91%⁩ level reliability');
  });
});
