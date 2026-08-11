# Live Groups Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved spec `docs/superpowers/specs/2026-08-12-live-groups-card-redesign-design.md` — tight standings rows, a green/red games-distribution column plus a signed `+/-` column, and full (never-truncated) player names across every live-screen card.

**Architecture:** All work lives in `src/features/publicTournament`. A new `FitText` component guarantees a full single line of text by stepping its font size down on overflow. `GroupBoardCard` (the TV groups tab) is restructured: stacked one-player-per-line names, a `משחקונים` won–lost column, and a compact centered row cluster replacing `justify-evenly`. `StandingsTable`, `LaneMatchCard`, `CourtRail`, and `MatchCard` swap name `truncate` for `FitText`. Two theme tokens (`--pb-won`, `--pb-lost`) carry the colors across all three skins. No backend changes — `games_won`/`games_lost` are already on `PublicStanding`.

**Tech Stack:** React 18 + TypeScript, Tailwind v4 (`--pb-*` CSS custom properties in `themes.css`), react-i18next, Vitest + Testing Library (jsdom).

**Verification commands** (run from `rally-web/`):

```bash
npx vitest run src/features/publicTournament   # feature suite
npm run test                                   # full suite
npm run lint && npm run build                  # eslint + tsc + vite build
```

**Repo gotchas for the implementer:**

- `docs/` is gitignored in this repo — the spec/plan are committed with `git add -f`. Source files under `src/` are unaffected.
- Import via the `@/` alias for cross-directory imports; sibling imports in the feature use relative paths (`./FitText`, `../utils`) — follow the existing style in each file.
- Tests run in English (`src/test-setup.ts` forces `i18n.changeLanguage('en')`), so assert English fallbacks/values (e.g. the `Games` header label).
- jsdom does no layout: `scrollWidth`/`clientWidth` are 0, so `FitText` naturally stays at `maxPx` in every component test. Only `FitText`'s own test mocks measurements.
- All visible text goes through `t('key', 'fallback')` — never hardcoded Hebrew/English in JSX.
- RTL: never render a joined score string like `"20-10"` — the dash is a bidi joiner and the number pair mirrors in Hebrew. Won/lost are separate elements inside a `dir="ltr"` container (the codebase already does this for set scores).

---

## File structure

| File | Change | Responsibility |
|---|---|---|
| `src/features/publicTournament/themes.css` | Modify | Add `--pb-won` / `--pb-lost` per skin |
| `src/i18n/locales/he.json`, `en.json` | Modify | Add `public_bracket.standings_headers.games` |
| `src/features/publicTournament/components/FitText.tsx` | Create | Shrink-to-fit single line of text |
| `src/features/publicTournament/__tests__/fitText.test.tsx` | Create | FitText unit tests (mocked measurement) |
| `src/features/publicTournament/components/GroupBoardCard.tsx` | Modify | Stacked names, distribution + diff columns, tight rows |
| `src/features/publicTournament/__tests__/groupBoardCard.test.tsx` | Modify | Updated + new assertions |
| `src/features/publicTournament/components/StandingsTable.tsx` | Modify | Games-based diff, distribution column, FitText names |
| `src/features/publicTournament/__tests__/standingsTable.test.tsx` | Create | Score-column tests |
| `src/features/publicTournament/__tests__/disqualifiedStanding.test.tsx` | Modify | Dash count 4 → 5 (new column) |
| `src/features/publicTournament/components/LaneMatchCard.tsx` | Modify | Name `truncate` → FitText |
| `src/features/publicTournament/components/CourtRail.tsx` | Modify | Name `truncate` → FitText |
| `src/features/publicTournament/__tests__/laneMatchCard.test.tsx` | Modify | Add no-truncation assertion |
| `src/features/publicTournament/components/MatchCard.tsx` | Modify | Player-name `truncate` → FitText |

---

### Task 1: Theme tokens and i18n keys

**Files:**
- Modify: `src/features/publicTournament/themes.css` (the three `[data-bracket-theme='…']` blocks, lines ~27–80)
- Modify: `src/i18n/locales/he.json` (inside `public_bracket.standings_headers`)
- Modify: `src/i18n/locales/en.json` (inside `public_bracket.standings_headers`)

No unit test of its own — CSS custom properties and JSON keys aren't executable; the GroupBoardCard/StandingsTable tests in Tasks 3–4 assert the classes and the `Games` header label that consume them.

- [ ] **Step 1: Add `--pb-won` / `--pb-lost` to each theme block in `themes.css`**

Append inside `[data-bracket-theme='dark'] { … }` (after `--pb-glow`):

```css
    /* The distribution column's two inks: the pair's own games vs the opponents'.
       Green/red on every row by design — not a sign color. */
    --pb-won: #4ade80;
    --pb-lost: #f87171;
```

Append inside `[data-bracket-theme='light'] { … }` (after `--pb-glow`):

```css
    --pb-won: #16a34a;
    --pb-lost: #dc2626;
```

Append inside `[data-bracket-theme='gradient'] { … }` (after `--pb-live`):

```css
    /* Lightened for the blue ground, same reason --pb-live is: mid greens/reds fall
       under the 3:1 large-text floor against #0055ff. --pb-lost matches --pb-live's
       hue family so "opponent games" and "live" reds don't clash on one card. */
    --pb-won: #a7f3d0;
    --pb-lost: #ffc2cd;
```

- [ ] **Step 2: Add the `games` header key to both locales**

In `src/i18n/locales/he.json`, find `"games_l"` inside `public_bracket.standings_headers` and add a `games` key right after it:

```json
"games": "משחקונים",
```

In `src/i18n/locales/en.json`, same position:

```json
"games": "Games",
```

(Preserve each file's existing formatting — these are additions next to `"games_l"`, nothing else changes.)

- [ ] **Step 3: Sanity check**

Run: `npm run build`
Expected: succeeds (tsc + vite; also catches malformed JSON).

- [ ] **Step 4: Commit**

```bash
git add src/features/publicTournament/themes.css src/i18n/locales/he.json src/i18n/locales/en.json
git commit -m "feat(live): won/lost theme inks and the games column label"
```

---

### Task 2: FitText component

**Files:**
- Create: `src/features/publicTournament/components/FitText.tsx`
- Test: `src/features/publicTournament/__tests__/fitText.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/publicTournament/__tests__/fitText.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { FitText } from '../components/FitText';

/**
 * jsdom does no text layout — scrollWidth/clientWidth are always 0, so FitText naturally
 * stays at maxPx there (which is also why no OTHER component test needs mocking). These
 * tests install getters modelling a text run whose width scales linearly with the current
 * font-size — exactly the relationship the fitting step relies on.
 */
function mockMeasure(el: HTMLElement, widthAtMax: number, boxWidth: number, maxPx: number): void {
    Object.defineProperty(el, 'scrollWidth', {
        configurable: true,
        get: () => Math.round(widthAtMax * (parseFloat(el.style.fontSize) / maxPx)),
    });
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => boxWidth });
}

describe('FitText', () => {
    it('renders at maxPx with the full text and a title attribute when it fits', () => {
        render(<FitText text="short" maxPx={15} minPx={9} />);
        const el = screen.getByTitle('short');
        expect(el.textContent).toBe('short');
        expect(el.style.fontSize).toBe('15px');
        expect(el.className).not.toContain('truncate');
    });

    it('shrinks an overflowing line until it fits', () => {
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} />);
        // 120px wide at 15px, in a 100px box → floor(15 × 100/120) = 12px, which fits (96px).
        mockMeasure(screen.getByTitle('first'), 120, 100, 15);
        rerender(<FitText text="a longer name" maxPx={15} minPx={9} />);
        expect(screen.getByTitle('a longer name').style.fontSize).toBe('12px');
    });

    it('never goes below minPx even when the text still overflows there', () => {
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} />);
        mockMeasure(screen.getByTitle('first'), 400, 100, 15);
        rerender(<FitText text="an extremely long name" maxPx={15} minPx={9} />);
        expect(screen.getByTitle('an extremely long name').style.fontSize).toBe('9px');
    });

    it('re-grows when the text changes to something that fits', () => {
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} />);
        const el = screen.getByTitle('first');
        mockMeasure(el, 400, 100, 15);
        rerender(<FitText text="an extremely long name" maxPx={15} minPx={9} />);
        expect(screen.getByTitle('an extremely long name').style.fontSize).toBe('9px');
        // Back to jsdom's "everything fits" default, then swap in short text.
        Object.defineProperty(el, 'scrollWidth', { configurable: true, get: () => 0 });
        rerender(<FitText text="ok" maxPx={15} minPx={9} />);
        expect(screen.getByTitle('ok').style.fontSize).toBe('15px');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/publicTournament/__tests__/fitText.test.tsx`
Expected: FAIL — `Cannot find module '../components/FitText'` (or equivalent resolve error).

- [ ] **Step 3: Implement FitText**

Create `src/features/publicTournament/components/FitText.tsx`:

```tsx
import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type FitTextProps = {
    text: string;
    /** Starting and maximum font size, px. */
    maxPx: number;
    /** Floor, px — at this size the text clips rather than shrinking further. */
    minPx: number;
    className?: string;
};

/**
 * A single line that never ellipsizes: on overflow the font steps down until the text fits
 * or hits `minPx`. Measures the real rendered element (scrollWidth vs clientWidth), so the
 * loaded webfonts are what get measured; the TV canvas's transform scale affects neither
 * metric, so fitting works in canvas coordinates. In jsdom both metrics are 0, so the text
 * simply stays at maxPx — component tests need no mocking.
 */
export function FitText({ text, maxPx, minPx, className }: FitTextProps): React.ReactElement {
    const ref = useRef<HTMLSpanElement>(null);
    const [size, setSize] = useState(maxPx);
    const lastWidth = useRef(-1);

    // New text (or a new cap) starts back at full size and re-fits from there.
    useLayoutEffect(() => { setSize(maxPx); }, [text, maxPx]);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || size <= minPx) return;
        if (el.scrollWidth > el.clientWidth) {
            // Text width scales ~linearly with font-size, so one ratio step usually lands it;
            // the effect re-runs on setSize until it fits or bottoms out at minPx.
            const fitted = Math.floor(size * (el.clientWidth / el.scrollWidth));
            setSize(Math.max(minPx, Math.min(fitted, size - 1)));
        }
    }, [size, minPx, text]);

    // Refit when the container's WIDTH changes (canvas rescale, viewport resize). Height is
    // deliberately ignored: shrinking the font changes the element's own height, and a
    // height-sensitive observer would loop reset → shrink → reset forever.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect.width ?? 0;
            if (w !== lastWidth.current) {
                lastWidth.current = w;
                setSize(maxPx);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [maxPx]);

    return (
        <span
            ref={ref}
            title={text}
            className={cn('block max-w-full overflow-hidden whitespace-nowrap', className)}
            style={{ fontSize: `${size}px` }}
        >
            {text}
        </span>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/publicTournament/__tests__/fitText.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/publicTournament/components/FitText.tsx src/features/publicTournament/__tests__/fitText.test.tsx
git commit -m "feat(live): FitText — a name line that shrinks instead of truncating"
```

---

### Task 3: GroupBoardCard — stacked names, distribution column, tight rows

**Files:**
- Modify: `src/features/publicTournament/components/GroupBoardCard.tsx` (full rewrite below)
- Test: `src/features/publicTournament/__tests__/groupBoardCard.test.tsx` (full rewrite below)

- [ ] **Step 1: Replace the test file with the updated + extended version**

Overwrite `src/features/publicTournament/__tests__/groupBoardCard.test.tsx` with:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { GroupBoardCard } from '../components/GroupBoardCard';
import type { PublicGroup, PublicMatch, PublicPlayer, PublicStanding } from '../types';

const player = (id: string, first: string, last: string): PublicPlayer => ({
    id, first_name: first, last_name: last, skill_level: null, is_guest: null,
});

const match = (over: Partial<PublicMatch>): PublicMatch => ({
    id: 'm1',
    match_label: null,
    round_number: 1,
    team_a: null,
    team_b: null,
    sets: [],
    winner_team: null,
    next_match_id: null,
    status: 'scheduled',
    court_name: null,
    scheduled_at: null,
    ...over,
});

const standing = (over: Partial<PublicStanding> & { position: number }): PublicStanding => ({
    player_name: null,
    team_name: 'Team',
    player_1: null,
    player_2: null,
    matches_played: 0,
    wins: 0,
    losses: 0,
    sets_won: 0,
    sets_lost: 0,
    games_won: 0,
    games_lost: 0,
    points: 0,
    is_disqualified: false,
    ...over,
});

const group = (over: Partial<PublicGroup>): PublicGroup => ({
    group_name: 'Group A',
    matches: [],
    standings: [],
    ...over,
});

/** The row wrapper carries the pair's name and every stat cell for that row. */
function rowFor(container: HTMLElement, name: string): HTMLElement {
    const label = within(container).getByText(name);
    const row = label.closest('.rounded-xl');
    if (!row) throw new Error(`no row found for "${name}"`);
    // closest() is typed as Element; every node in this tree is an HTMLElement in jsdom.
    return row as HTMLElement;
}

/**
 * The inline backgroundColor PairChip sets. FitText also carries an inline style
 * (font-size), so the chip is the styled element WITH a backgroundColor — `[style]`
 * alone no longer singles it out.
 */
function chipColorFor(container: HTMLElement, name: string): string {
    const styled = Array.from(rowFor(container, name).querySelectorAll('[style]')) as HTMLElement[];
    const chip = styled.find(el => el.style.backgroundColor);
    if (!chip) throw new Error(`no chip found for "${name}"`);
    return chip.style.backgroundColor;
}

describe('GroupBoardCard', () => {
    it('shows no place numerals or stat columns before the first result, but still shows names', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [], status: 'scheduled' })],
            standings: [
                standing({ position: 1, team_name: 'Solo Alpha' }),
                standing({ position: 2, team_name: 'Solo Beta' }),
            ],
        });
        const { container } = render(<GroupBoardCard group={g} qualifyCount={1} />);

        expect(screen.getByText('Solo Alpha')).toBeInTheDocument();
        expect(screen.getByText('Solo Beta')).toBeInTheDocument();

        // Rank numerals live in the `.text-2xl` span; before any result it must render empty,
        // never "1"/"2" — a numeral there reads as an earned ranking that no game has produced.
        const rankSpans = container.querySelectorAll('.text-2xl');
        expect(rankSpans.length).toBeGreaterThan(0);
        rankSpans.forEach(span => expect(span.textContent).toBe(''));

        // Every numeric cell (MP / W / games / diff, header and rows) carries tabular-nums;
        // pre-results none of them exist at all.
        expect(container.querySelectorAll('.tabular-nums').length).toBe(0);
    });

    it('shows matches-played, wins, the games distribution and the signed diff once results exist', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 2, is_tiebreak: null }] })],
            standings: [
                standing({ position: 1, team_name: 'Leaders', wins: 3, losses: 1, games_won: 10, games_lost: 6 }),
                standing({ position: 2, team_name: 'Trailers', wins: 1, losses: 2, games_won: 5, games_lost: 9 }),
            ],
        });
        const { container } = render(<GroupBoardCard group={g} />);

        const leaders = rowFor(container, 'Leaders');
        const leaderCells = leaders.querySelectorAll('.w-8');
        expect(leaderCells[0].textContent).toBe('4'); // 3 wins + 1 loss
        expect(leaderCells[1].textContent).toBe('3'); // wins
        // Distribution: own games always green, opponents' always red — on every row.
        expect(within(leaders).getByText('10').className).toContain('text-(--pb-won)');
        expect(within(leaders).getByText('6').className).toContain('text-(--pb-lost)');
        expect(within(leaders).getByText('+4').className).toContain('text-(--pb-won)');

        const trailers = rowFor(container, 'Trailers');
        expect(within(trailers).getByText('5').className).toContain('text-(--pb-won)');
        expect(within(trailers).getByText('9').className).toContain('text-(--pb-lost)');
        expect(within(trailers).getByText('-4').className).toContain('text-(--pb-lost)');
    });

    it('renders the distribution as separate elements in a dir="ltr" container, never a joined string', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 2, is_tiebreak: null }] })],
            standings: [standing({ position: 1, team_name: 'Leaders', wins: 1, losses: 0, games_won: 10, games_lost: 6 })],
        });
        const { container } = render(<GroupBoardCard group={g} />);

        const dist = rowFor(container, 'Leaders').querySelector('.w-14');
        expect(dist).not.toBeNull();
        expect(dist!.getAttribute('dir')).toBe('ltr');
        // The dash is a bidi joiner: a pre-joined string would mirror in RTL.
        expect(screen.queryByText('10–6')).toBeNull();
        expect(screen.queryByText('10-6')).toBeNull();
    });

    it('colors a zero diff as muted, not green or red', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 6, is_tiebreak: null }] })],
            standings: [standing({ position: 1, team_name: 'Level', wins: 1, losses: 1, games_won: 8, games_lost: 8 })],
        });
        const { container } = render(<GroupBoardCard group={g} />);

        const diffCell = within(rowFor(container, 'Level')).getByText('0');
        expect(diffCell.className).toContain('text-(--pb-text-muted)');
        expect(diffCell.className).not.toContain('text-(--pb-won)');
        expect(diffCell.className).not.toContain('text-(--pb-lost)');
    });

    it('shows the games column header once results exist', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 2, is_tiebreak: null }] })],
            standings: [standing({ position: 1, team_name: 'Leaders', wins: 1, losses: 0, games_won: 6, games_lost: 2 })],
        });
        render(<GroupBoardCard group={g} />);
        // Test setup forces English; the he.json value is "משחקונים".
        expect(screen.getByText('Games')).toBeInTheDocument();
    });

    it('places the cutoff line between the last qualifying row and the first that misses out', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 1, is_tiebreak: null }] })],
            standings: [
                standing({ position: 1, team_name: 'Row0', wins: 3, losses: 0 }),
                standing({ position: 2, team_name: 'Row1', wins: 2, losses: 1 }),
                standing({ position: 3, team_name: 'Row2', wins: 1, losses: 2 }),
                standing({ position: 4, team_name: 'Row3', wins: 0, losses: 3 }),
            ],
        });
        const { container } = render(<GroupBoardCard group={g} qualifyCount={2} />);

        const list = container.querySelector('.justify-center');
        if (!list) throw new Error('standings list container not found');
        const children = Array.from(list.children);

        // 4 rows + 1 cutoff line = 5 direct children, and the cutoff sits at index 2: right after
        // Row1 (the second and last qualifier) and before Row2 (the first that misses out).
        expect(children).toHaveLength(5);
        expect(children[0].textContent).toContain('Row0');
        expect(children[1].textContent).toContain('Row1');
        expect(children[2].tagName).toBe('P');
        expect(children[2].textContent).toContain('Top 2');
        expect(children[3].textContent).toContain('Row2');
        expect(children[4].textContent).toContain('Row3');
    });

    it('renders em-dashes for a disqualified row and never highlights it as qualifying', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 1, is_tiebreak: null }] })],
            standings: [
                standing({ position: 1, team_name: 'Clean Leader', wins: 3, losses: 0 }),
                // Disqualified but numerically still inside qualifyCount=2 — must not be highlighted.
                standing({ position: 2, team_name: 'DQ Team', wins: 2, losses: 1, is_disqualified: true }),
                standing({ position: 3, team_name: 'Missed Cut', wins: 0, losses: 3 }),
            ],
        });
        const { container } = render(<GroupBoardCard group={g} qualifyCount={2} />);

        const leaderRow = rowFor(container, 'Clean Leader');
        expect(leaderRow.className).toContain('bg-(--pb-winner-bg)');

        const dqRow = rowFor(container, 'DQ Team');
        expect(dqRow.className).not.toContain('bg-(--pb-winner-bg)');
        expect(within(dqRow).getByText('Disqualified')).toBeInTheDocument();
        // MP, W, distribution, diff — all four numeric cells dashed.
        const dqStats = dqRow.querySelectorAll('.tabular-nums');
        expect(dqStats).toHaveLength(4);
        dqStats.forEach(cell => expect(cell.textContent).toBe('—'));
    });

    it('shows each player of a pair on their own full line, never joined or truncated', () => {
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 3, is_tiebreak: null }] })],
            standings: [standing({
                position: 1,
                team_name: null,
                player_1: player('p1', 'Alexander', 'Konstantinov'),
                player_2: player('p2', 'Michael', 'Abramovich'),
                wins: 1, losses: 0,
            })],
        });
        render(<GroupBoardCard group={g} />);

        const first = screen.getByText('Alexander Konstantinov');
        const second = screen.getByText('Michael Abramovich');
        // Two separate lines, not one joined label.
        expect(screen.queryByText('Alexander Konstantinov / Michael Abramovich')).toBeNull();
        // Never ellipsized: no truncate class, and the full text doubles as the title.
        expect(first.className).not.toContain('truncate');
        expect(second.className).not.toContain('truncate');
        expect(first.title).toBe('Alexander Konstantinov');
        expect(second.title).toBe('Michael Abramovich');
    });

    it('keeps a pair\'s chip colour stable when the standings array reorders around it', () => {
        const alpha = standing({
            position: 1,
            team_name: null,
            player_1: player('p1', 'Gal', 'Cohen'),
            player_2: player('p2', 'Noa', 'Levi'),
            wins: 2, losses: 0,
        });
        const beta = standing({
            position: 2,
            team_name: null,
            player_1: player('p3', 'Adi', 'Shani'),
            player_2: player('p4', 'Lian', 'Katz'),
            wins: 0, losses: 2,
        });

        // Names are stacked now — the row is found by its first player's line.
        const first = render(<GroupBoardCard group={group({ standings: [alpha, beta] })} />);
        const colorFirst = chipColorFor(first.container, 'Gal Cohen');
        first.unmount();

        // Same pair, now at index 1 instead of index 0 — an index-derived colour would change here.
        const second = render(<GroupBoardCard group={group({ standings: [beta, alpha] })} />);
        const colorSecond = chipColorFor(second.container, 'Gal Cohen');

        expect(colorFirst).toBeTruthy();
        expect(colorFirst).toBe(colorSecond);
    });

    it('drops no pairs from a 6-pair group (dense mode)', () => {
        const names = ['Ana', 'Bar', 'Cor', 'Dov', 'Eli', 'Fay'];
        const g = group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 3, is_tiebreak: null }] })],
            standings: names.map((n, i) => standing({ position: i + 1, team_name: n, wins: 6 - i, losses: i })),
        });
        render(<GroupBoardCard group={g} qualifyCount={2} />);

        names.forEach(n => expect(screen.getByText(n)).toBeInTheDocument());
    });

    it('renders dense rows with different classes than non-dense rows', () => {
        // Same shape, only the pair count differs: 4 standings (non-dense) vs 6 (dense). The
        // target row carries neither the qualify highlight nor is_disqualified, so its classes
        // reduce to exactly base-vs-base-plus-dense with nothing else mixed in.
        const shaped = (count: number) => group({
            matches: [match({ id: 'm1', sets: [{ team_a_score: 6, team_b_score: 3, is_tiebreak: null }] })],
            standings: Array.from({ length: count }, (_, i) =>
                standing({ position: i + 1, team_name: i === 0 ? 'Focus Pair' : `Filler ${i}`, wins: 2, losses: 1 }),
            ),
        });

        const nonDense = render(<GroupBoardCard group={shaped(4)} />);
        const nonDenseRow = rowFor(nonDense.container, 'Focus Pair');
        const nonDenseName = within(nonDenseRow).getByText('Focus Pair');
        expect(nonDenseRow.className).toBe('flex items-center gap-2 rounded-xl px-3 py-1');
        expect(nonDenseName.style.fontSize).toBe('15px');
        // Rank glyph: non-dense keeps text-2xl.
        expect(nonDenseRow.querySelector('.text-2xl')).not.toBeNull();
        expect(nonDenseRow.querySelector('.text-xl')).toBeNull();
        const nonDenseWins = nonDenseRow.querySelectorAll('.w-8')[1];
        expect(nonDenseWins.className).toContain('text-[15px]');
        expect(nonDenseWins.className).not.toContain('text-[13px]');
        nonDense.unmount();

        const dense = render(<GroupBoardCard group={shaped(6)} />);
        const denseRow = rowFor(dense.container, 'Focus Pair');
        const denseName = within(denseRow).getByText('Focus Pair');
        expect(denseRow.className).toBe('flex items-center gap-2 rounded-xl px-3 py-0.5');
        expect(denseName.style.fontSize).toBe('13px');
        // Dense shrinks text-2xl -> text-xl and must keep leading-none (a regression here
        // previously reintroduced Tailwind's default line-height on text-xl, silently making
        // the "denser" row taller instead of shorter).
        expect(denseRow.querySelector('.text-2xl')).toBeNull();
        expect(denseRow.querySelector('.text-xl.leading-none')).not.toBeNull();
        const denseWins = denseRow.querySelectorAll('.w-8')[1];
        expect(denseWins.className).toContain('text-[13px]');
        expect(denseWins.className).not.toContain('text-[15px]');
    });
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npx vitest run src/features/publicTournament/__tests__/groupBoardCard.test.tsx`
Expected: FAIL — distribution/diff/stacked-name/`justify-center`/`.w-8` assertions all fail against the current component (old columns, joined labels, `justify-evenly`, `.w-11`).

- [ ] **Step 3: Rewrite the component**

Overwrite `src/features/publicTournament/components/GroupBoardCard.tsx` with:

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PairChip } from './PairChip';
import { FitText } from './FitText';
import { groupGlyph, groupHasResults, localizeGroupName, playerFullName } from '../utils';
import type { PublicGroup, PublicPlayer, PublicStanding } from '../types';

type GroupBoardCardProps = { group: PublicGroup; accentClass?: string; qualifyCount?: number };

function standingPlayers(s: PublicStanding): PublicPlayer[] {
    return [s.player_1, s.player_2].filter((p): p is PublicPlayer => Boolean(p));
}

/** One line per player; solo/team entries fall back to a single line. */
function standingNameLines(s: PublicStanding): string[] {
    const players = standingPlayers(s);
    if (players.length > 0) return players.map(playerFullName);
    const label = s.player_name ?? s.team_name ?? '';
    return label ? [label] : [];
}

/** Joined form, used only as a stable React key — display is line-per-player. */
function standingLabel(s: PublicStanding): string {
    return standingNameLines(s).join(' / ');
}

/**
 * One group's standings, filling its whole card.
 *
 * The games moved to the «משחקים» lanes, and the space they used to take is spent on type size:
 * this table is read from across a hall, and the previous version's paged games zone meant a
 * viewer could wait ~40s to see one particular game while the table stayed small.
 */
export function GroupBoardCard({ group, accentClass, qualifyCount }: GroupBoardCardProps): React.ReactElement {
    const { t } = useTranslation();
    const glyph = groupGlyph(group.group_name);
    const standings = group.standings;
    const hasResults = groupHasResults(group);
    const playedCount = group.matches.filter(m => m.sets.length > 0 || m.status === 'walkover').length;
    // Past four pairs, a fifth/sixth row no longer fits this card's fixed share of the 1600×900
    // canvas at full size — there is no scroll on an unattended screen, so an unshrunk row would
    // silently clip off the bottom instead. `cn()`'s conflict resolution (twMerge) means every
    // `dense && '…'` class below only ever overrides its non-dense sibling when dense is true; at
    // four pairs or fewer, `dense` is false and each className resolves to exactly the same string
    // as if the `dense && '…'` clause were never there.
    const dense = standings.length > 4;

    return (
        <div className={cn(
            'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-(--pb-border) border-t-[3px] bg-(--pb-card) [border-top-color:var(--pb-ga,var(--pb-highlight))]',
            accentClass,
        )}>
            <header className="flex shrink-0 items-center gap-2.5 border-b border-(--pb-border) bg-(--pb-card-header) px-4 py-1.5">
                {glyph && (
                    <span aria-hidden className="pb-display text-[26px] leading-none [color:var(--pb-ga,var(--pb-highlight))]">
                        {glyph}
                    </span>
                )}
                <p className="truncate text-[15px] font-extrabold text-(--pb-text)">{localizeGroupName(group.group_name, t)}</p>
                <span className="ms-auto shrink-0 rounded-md bg-(--pb-card-raised) px-2 py-0.5 text-[11px] font-bold text-(--pb-text-muted)">
                    <b className="text-(--pb-text)">{playedCount}/{group.matches.length}</b> {t('public_bracket.group_matches', 'Matches')}
                </span>
            </header>

            {/* Header row only once numbers exist — before that every column would read blank. */}
            {hasResults && (
                <div className="flex shrink-0 items-center gap-2 px-6 pt-1 text-[10px] font-black uppercase tracking-wider text-(--pb-text-faint)">
                    <span className="w-6 shrink-0" />
                    <span className="flex-1" />
                    <span className="w-8 shrink-0 text-center">{t('public_bracket.standings_headers.mp', 'MP')}</span>
                    <span className="w-8 shrink-0 text-center">{t('public_bracket.col_wins', 'W')}</span>
                    <span className="w-14 shrink-0 text-center">{t('public_bracket.standings_headers.games', 'Games')}</span>
                    <span className="w-9 shrink-0 text-center">+/-</span>
                </div>
            )}

            {/* justify-center + a fixed gap, NOT justify-evenly: evenly spread 4 rows across the
                whole card and read as four islands; a tight cluster reads as one table. */}
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 px-3 pb-2">
                {standings.map((s, i) => {
                    const dq = s.is_disqualified === true;
                    const qualifies = hasResults && qualifyCount != null && i < qualifyCount && !dq;
                    const diff = s.games_won - s.games_lost;
                    const played = s.wins + s.losses;
                    const nameLines = standingNameLines(s);
                    return (
                        <React.Fragment key={`${s.position}-${standingLabel(s) || i}`}>
                            <div className={cn(
                                'flex items-center gap-2 rounded-xl px-3 py-1',
                                dense && 'py-0.5',
                                qualifies && 'bg-(--pb-winner-bg)',
                                dq && 'opacity-60',
                            )}>
                                {/* No place numerals before the first result: 1–4 with nothing
                                    played reads as a ranking that no game has earned. */}
                                <span
                                    aria-hidden
                                    className={cn(
                                        'w-6 shrink-0 text-center text-2xl font-black',
                                        dense && 'text-xl',
                                        // `leading-none` must land AFTER the dense size override, not
                                        // before: Tailwind's named text-size utilities (text-xl,
                                        // text-2xl, …) bundle their own default line-height, which
                                        // wins over an EARLIER `leading-none` in the real cascade
                                        // regardless of class-attribute order. twMerge mirrors that —
                                        // putting `leading-none` first here got it silently dropped by
                                        // twMerge whenever `dense` added `text-xl` after it, and the
                                        // real browser would have discarded it the same way.
                                        'leading-none',
                                        qualifies ? 'text-(--pb-highlight)' : 'text-(--pb-text-faint)',
                                    )}
                                >
                                    {hasResults ? (dq ? '—' : i + 1) : ''}
                                </span>
                                <PairChip pair={s} className="h-5 w-5 rounded-md text-[9px]" />
                                <span className="flex min-w-0 flex-1 flex-col justify-center">
                                    {dq && (
                                        <span className="mb-0.5 w-fit shrink-0 rounded px-1 py-px text-[8px] font-black uppercase tracking-widest text-(--pb-text-faint) ring-1 ring-(--pb-border)">
                                            {t('public_bracket.disqualified', 'Disqualified')}
                                        </span>
                                    )}
                                    {/* One player per line, full name always — FitText shrinks a
                                        genuinely long single name instead of ellipsizing it. */}
                                    {nameLines.map(line => (
                                        <FitText
                                            key={line}
                                            text={line}
                                            maxPx={dense ? 13 : 15}
                                            minPx={9}
                                            className={cn(
                                                'font-extrabold leading-tight',
                                                dq ? 'text-(--pb-text-muted) line-through' : 'text-(--pb-text)',
                                            )}
                                        />
                                    ))}
                                </span>
                                {hasResults && (
                                    <>
                                        <span className={cn(
                                            'w-8 shrink-0 text-center text-[15px] font-extrabold tabular-nums text-(--pb-text-muted)',
                                            dense && 'text-[13px]',
                                        )}>
                                            {dq ? '—' : played}
                                        </span>
                                        <span className={cn(
                                            'w-8 shrink-0 text-center text-[15px] font-extrabold tabular-nums text-(--pb-text)',
                                            dense && 'text-[13px]',
                                        )}>
                                            {dq ? '—' : s.wins}
                                        </span>
                                        {/* Won/lost as separate elements inside dir="ltr": a joined
                                            "20-10" would mirror in RTL — the dash is a bidi joiner,
                                            same reason the set scores are never assembled into a
                                            string. Own games always green, opponents' always red. */}
                                        <span
                                            dir="ltr"
                                            className={cn(
                                                'flex w-14 shrink-0 items-center justify-center gap-px text-[15px] font-extrabold tabular-nums',
                                                dense && 'text-[13px]',
                                            )}
                                        >
                                            {dq ? (
                                                <span className="text-(--pb-text-muted)">—</span>
                                            ) : (
                                                <>
                                                    <span className="text-(--pb-won)">{s.games_won}</span>
                                                    <span className="font-normal text-(--pb-text-faint)">–</span>
                                                    <span className="text-(--pb-lost)">{s.games_lost}</span>
                                                </>
                                            )}
                                        </span>
                                        <span
                                            dir="ltr"
                                            className={cn(
                                                'w-9 shrink-0 text-center text-[13px] font-extrabold tabular-nums',
                                                dense && 'text-[11px]',
                                                dq || diff === 0 ? 'text-(--pb-text-muted)'
                                                    : diff > 0 ? 'text-(--pb-won)' : 'text-(--pb-lost)',
                                            )}
                                        >
                                            {dq ? '—' : diff > 0 ? `+${diff}` : diff}
                                        </span>
                                    </>
                                )}
                            </div>
                            {/* The cutoff line belongs AT the cutoff — between the last qualifying
                                row and the first that misses out — not under the whole table. */}
                            {hasResults && qualifyCount != null && i === qualifyCount - 1 && i < standings.length - 1 && (
                                <p className="flex items-center gap-2 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-(--pb-highlight) before:h-px before:flex-1 before:border-t before:border-dashed before:border-(--pb-highlight)/50 before:content-[''] after:h-px after:flex-1 after:border-t after:border-dashed after:border-(--pb-highlight)/50 after:content-['']">
                                    {t('public_bracket.top_qualify', { count: qualifyCount, defaultValue: `Top ${qualifyCount} advance` })}
                                </p>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/publicTournament/__tests__/groupBoardCard.test.tsx`
Expected: PASS (12 tests).

- [ ] **Step 5: Run the whole feature suite to catch collateral breakage**

Run: `npx vitest run src/features/publicTournament`
Expected: PASS. If `lanesView`/`viewTabs` tests fail on group-card markup, fix the assertion the same way as in Step 1 (`.w-11` → new widths, joined label → first player's line) — do not change component behavior to satisfy an old selector.

- [ ] **Step 6: Commit**

```bash
git add src/features/publicTournament/components/GroupBoardCard.tsx src/features/publicTournament/__tests__/groupBoardCard.test.tsx
git commit -m "feat(live): group card — stacked full names, games distribution and signed diff"
```

---

### Task 4: StandingsTable — games-based diff, distribution column, FitText names

**Files:**
- Modify: `src/features/publicTournament/components/StandingsTable.tsx` (full rewrite below)
- Create: `src/features/publicTournament/__tests__/standingsTable.test.tsx`
- Modify: `src/features/publicTournament/__tests__/disqualifiedStanding.test.tsx` (one assertion)

- [ ] **Step 1: Write the new failing tests**

Create `src/features/publicTournament/__tests__/standingsTable.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StandingsTable } from '../components/StandingsTable';
import type { PublicStanding } from '../types';

const row = (over: Partial<PublicStanding> & { position: number }): PublicStanding => ({
    player_name: null,
    team_name: 'Team',
    player_1: null,
    player_2: null,
    matches_played: 0,
    wins: 0,
    losses: 0,
    sets_won: 0,
    sets_lost: 0,
    games_won: 0,
    games_lost: 0,
    points: 0,
    is_disqualified: false,
    ...over,
});

describe('StandingsTable score columns', () => {
    it('derives +/- from games, not sets', () => {
        render(<StandingsTable title="Group A" standings={[
            // Sets say +8; games say -4. Games must win — the TV board already uses games,
            // and the two surfaces may not disagree about a pair's balance.
            row({ position: 1, team_name: 'Team 1', wins: 2, losses: 1, sets_won: 10, sets_lost: 2, games_won: 5, games_lost: 9 }),
        ]} />);
        expect(screen.getByText('-4')).toBeInTheDocument();
        expect(screen.queryByText('+8')).toBeNull();
    });

    it('shows the games distribution with own games green and opponents red', () => {
        render(<StandingsTable title="Group A" standings={[
            row({ position: 1, team_name: 'Team 1', wins: 2, losses: 0, games_won: 12, games_lost: 7 }),
        ]} />);
        expect(screen.getByText('12').className).toContain('text-(--pb-won)');
        expect(screen.getByText('7').className).toContain('text-(--pb-lost)');
        // Separate elements in an ltr container — never a joined string (mirrors in RTL).
        expect(screen.queryByText('12–7')).toBeNull();
        expect(screen.getByText('12').parentElement?.getAttribute('dir')).toBe('ltr');
    });

    it('keeps every player\'s full name without truncation', () => {
        render(<StandingsTable title="Group A" standings={[
            row({
                position: 1,
                team_name: null,
                player_1: { id: 'p1', first_name: 'Alexander', last_name: 'Konstantinov', skill_level: null, is_guest: null },
                player_2: { id: 'p2', first_name: 'Michael', last_name: 'Abramovich', skill_level: null, is_guest: null },
                wins: 1, losses: 0,
            }),
        ]} />);
        const name = screen.getByText('Alexander Konstantinov');
        expect(name.className).not.toContain('truncate');
        expect(name.title).toBe('Alexander Konstantinov');
        expect(screen.getByText('Michael Abramovich')).toBeInTheDocument();
    });
});
```

In `src/features/publicTournament/__tests__/disqualifiedStanding.test.tsx`, the test
`'renders dashes and a reason instead of a rank and stats'` counts dashes. The new games
column adds a fifth dash. Change:

```tsx
        // rank + wins + losses + games distribution + diff, all dashed for that one row
        expect(screen.getAllByText('—')).toHaveLength(5);
```

(was `toHaveLength(4)` with the comment `// rank + wins + losses + diff, all dashed for that one row`).

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run src/features/publicTournament/__tests__/standingsTable.test.tsx src/features/publicTournament/__tests__/disqualifiedStanding.test.tsx`
Expected: `standingsTable.test.tsx` FAILS (sets-based diff `+8` currently renders; no distribution cells; names truncate). `disqualifiedStanding` FAILS on the 5-dash count.

- [ ] **Step 3: Rewrite the component**

Overwrite `src/features/publicTournament/components/StandingsTable.tsx` with:

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { FitText } from './FitText';
import { RatingChip } from './RatingChip';
import { playerFullName } from '../utils';
import type { PublicPlayer, PublicStanding } from '../types';

type StandingsTableProps = { title: string; standings: PublicStanding[]; qualifyCount?: number; large?: boolean };

function rowPlayers(s: PublicStanding): PublicPlayer[] {
    return [s.player_1, s.player_2].filter((p): p is PublicPlayer => Boolean(p));
}

function rowLabel(s: PublicStanding): string {
    return s.player_name ?? s.team_name ?? '';
}

export function StandingsTable({ title, standings, qualifyCount, large }: StandingsTableProps): React.ReactElement {
    const { t } = useTranslation();
    const nameText = large ? 'text-sm' : 'text-xs';
    const namePx = large ? 14 : 12;
    return (
        <div className="overflow-hidden rounded-xl border border-(--pb-border) bg-(--pb-card)">
            <div className="flex items-center justify-between border-b border-(--pb-border) bg-(--pb-card-header) px-3 py-2">
                <span className={cn('font-black uppercase tracking-widest text-(--pb-text-faint)', large ? 'text-[11px]' : 'text-[10px]')}>{title}</span>
                <span className="flex gap-3 text-[9px] font-black uppercase text-(--pb-text-faint)">
                    <span className="w-5 text-center">{t('public_bracket.col_wins', 'W')}</span>
                    <span className="w-5 text-center">{t('public_bracket.col_losses', 'L')}</span>
                    <span className="w-10 text-center">{t('public_bracket.standings_headers.games', 'Games')}</span>
                    <span className="w-7 text-center">+/-</span>
                </span>
            </div>
            {standings.map((s, i) => {
                const players = rowPlayers(s);
                // A disqualified row is numbered last, so in a small enough group
                // its position still falls inside qualifyCount — guard explicitly.
                const dq = s.is_disqualified === true;
                const qualifies = !dq && qualifyCount != null && s.position <= qualifyCount;
                // Games, not sets — the TV board's diff is games-based and the two
                // surfaces may not disagree about a pair's balance.
                const diff = s.games_won - s.games_lost;
                return (
                    <React.Fragment key={`${s.position}-${rowLabel(s)}`}>
                        <div className={cn(
                            'flex items-center gap-2 px-3',
                            large ? 'py-1.5' : 'py-2',
                            i > 0 && 'border-t border-(--pb-border)',
                            qualifies && 'bg-(--pb-winner-bg)',
                            dq && 'opacity-60',
                        )}>
                            <span className={cn('w-4 shrink-0 font-black', nameText, qualifies ? 'text-(--pb-highlight)' : 'text-(--pb-text-faint)')}>
                                {dq ? '—' : s.position}
                            </span>
                            <span className={cn('flex min-w-0 flex-1', large ? 'items-center' : 'flex-col gap-0.5')}>
                                {dq ? (
                                    <span className={cn('flex min-w-0 items-center gap-1.5', nameText)}>
                                        <FitText
                                            text={rowLabel(s) || players.map(playerFullName).join(' / ')}
                                            maxPx={namePx}
                                            minPx={9}
                                            className="min-w-0 font-bold text-(--pb-text-muted) line-through"
                                        />
                                        <span className="shrink-0 rounded px-1 py-0.5 text-[8px] font-black uppercase tracking-widest text-(--pb-text-faint) ring-1 ring-(--pb-border)">
                                            {t('public_bracket.disqualified', 'Disqualified')}
                                        </span>
                                    </span>
                                ) : players.length === 0 ? (
                                    <FitText text={rowLabel(s)} maxPx={namePx} minPx={9} className="font-bold text-(--pb-text)" />
                                ) : large ? (
                                    // TV: one line per team, broadcast-table style — halves the panel height
                                    <span className="flex min-w-0 items-center gap-1.5 font-bold text-(--pb-text)">
                                        {players.map((p, pi) => (
                                            <React.Fragment key={p.id}>
                                                {pi > 0 && <span className="shrink-0 text-(--pb-text-faint)">/</span>}
                                                <FitText text={playerFullName(p)} maxPx={namePx} minPx={9} className="min-w-0" />
                                                <RatingChip rating={p.skill_level} />
                                            </React.Fragment>
                                        ))}
                                    </span>
                                ) : (
                                    players.map(p => (
                                        <span key={p.id} className="flex min-w-0 items-center gap-1.5 font-bold text-(--pb-text)">
                                            <FitText text={playerFullName(p)} maxPx={namePx} minPx={9} className="min-w-0" />
                                            <RatingChip rating={p.skill_level} />
                                        </span>
                                    ))
                                )}
                            </span>
                            <span className={cn('flex shrink-0 items-center gap-3 font-extrabold', nameText)}>
                                <span className="w-5 text-center text-(--pb-text)">{dq ? '—' : s.wins}</span>
                                <span className="w-5 text-center text-(--pb-text-muted)">{dq ? '—' : s.losses}</span>
                                {/* Won/lost as separate elements inside dir="ltr" — a joined "12-7"
                                    would mirror in RTL. Own games green, opponents' red, every row. */}
                                <span dir="ltr" className="flex w-10 items-center justify-center gap-px tabular-nums">
                                    {dq ? (
                                        <span className="text-(--pb-text-muted)">—</span>
                                    ) : (
                                        <>
                                            <span className="text-(--pb-won)">{s.games_won}</span>
                                            <span className="font-normal text-(--pb-text-faint)">–</span>
                                            <span className="text-(--pb-lost)">{s.games_lost}</span>
                                        </>
                                    )}
                                </span>
                                <span dir="ltr" className={cn(
                                    'w-7 text-center tabular-nums',
                                    dq || diff === 0 ? 'text-(--pb-text-faint)' : diff > 0 ? 'text-(--pb-won)' : 'text-(--pb-lost)',
                                )}>
                                    {dq ? '—' : diff > 0 ? `+${diff}` : diff}
                                </span>
                            </span>
                        </div>
                        {!dq && qualifyCount != null && s.position === qualifyCount && i < standings.length - 1 && (
                            <div className="border-t border-dashed border-(--pb-border) px-3 py-1">
                                <span className="text-[8px] font-extrabold uppercase tracking-widest text-(--pb-text-faint)">
                                    {t('public_bracket.top_qualify', { count: qualifyCount, defaultValue: 'Top {{count}} advance' })}
                                </span>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/publicTournament/__tests__/standingsTable.test.tsx src/features/publicTournament/__tests__/disqualifiedStanding.test.tsx`
Expected: PASS (3 + 5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/publicTournament/components/StandingsTable.tsx src/features/publicTournament/__tests__/standingsTable.test.tsx src/features/publicTournament/__tests__/disqualifiedStanding.test.tsx
git commit -m "feat(live): mobile standings — games distribution, games-based diff, full names"
```

---

### Task 5: LaneMatchCard and CourtRail — FitText names

**Files:**
- Modify: `src/features/publicTournament/components/LaneMatchCard.tsx:52-64`
- Modify: `src/features/publicTournament/components/CourtRail.tsx:76-80`
- Modify: `src/features/publicTournament/__tests__/laneMatchCard.test.tsx` (add one test)

- [ ] **Step 1: Add the failing assertion to the lane card test**

Append inside `describe('LaneMatchCard', …)` in `src/features/publicTournament/__tests__/laneMatchCard.test.tsx`:

```tsx
    it('never truncates a team name — the line shrinks instead', () => {
        render(<LaneMatchCard match={base({})} isNext={false} />);
        const name = screen.getByText('Gal T / Noa B');
        expect(name.className).not.toContain('truncate');
        expect(name.title).toBe('Gal T / Noa B');
    });
```

Run: `npx vitest run src/features/publicTournament/__tests__/laneMatchCard.test.tsx`
Expected: the new test FAILS (`className` contains `truncate`); the rest pass.

- [ ] **Step 2: Swap the truncating span for FitText in LaneMatchCard**

In `src/features/publicTournament/components/LaneMatchCard.tsx`:

Add to the imports:

```tsx
import { FitText } from './FitText';
```

Replace the name span inside `line(side)` (currently `<span title={name} className={cn('min-w-0 flex-1 truncate text-[13px] leading-tight', …)}>{name}</span>`) with:

```tsx
                <FitText
                    text={name}
                    maxPx={13}
                    minPx={9}
                    className={cn(
                        'min-w-0 flex-1 leading-tight',
                        isWinner ? 'font-extrabold text-(--pb-text)'
                            : isLoser ? 'font-semibold text-(--pb-text-muted)'
                            : 'font-bold text-(--pb-text)',
                    )}
                />
```

(FitText sets `title` itself — the explicit `title={name}` prop disappears with the span.)

- [ ] **Step 3: Swap the truncating spans in CourtRail**

In `src/features/publicTournament/components/CourtRail.tsx`:

Add to the imports:

```tsx
import { FitText } from './FitText';
```

Replace the two-line name block (currently two `<span className="block truncate">{teamLabel(…)}</span>` children inside `<span className="min-w-0 flex-1 text-[12px] font-extrabold leading-tight text-(--pb-text)">`) with:

```tsx
                                <span className="min-w-0 flex-1 font-extrabold leading-tight text-(--pb-text)">
                                    <FitText text={teamLabel(match.team_a)} maxPx={12} minPx={9} />
                                    <FitText text={teamLabel(match.team_b)} maxPx={12} minPx={9} className="text-(--pb-text-muted)" />
                                </span>
```

(The wrapper loses its `text-[12px]` — FitText carries the size now.)

- [ ] **Step 4: Run both test files**

Run: `npx vitest run src/features/publicTournament/__tests__/laneMatchCard.test.tsx src/features/publicTournament/__tests__/courtRail.test.tsx src/features/publicTournament/__tests__/lanesView.test.tsx`
Expected: PASS — the courtRail tests find names via `getByText`, which is markup-agnostic.

- [ ] **Step 5: Commit**

```bash
git add src/features/publicTournament/components/LaneMatchCard.tsx src/features/publicTournament/components/CourtRail.tsx src/features/publicTournament/__tests__/laneMatchCard.test.tsx
git commit -m "feat(live): lane cards and court rail shrink names instead of truncating"
```

---

### Task 6: MatchCard — FitText player names

**Files:**
- Modify: `src/features/publicTournament/components/MatchCard.tsx:14-39` (TeamNames) and `:62` (call site)

The TBD placeholder and the header label keep their `truncate` — they are translated labels, not player names; the spec's full-name rule covers names only.

- [ ] **Step 1: Rework TeamNames to take a size and use FitText**

In `src/features/publicTournament/components/MatchCard.tsx`, add to the imports:

```tsx
import { FitText } from './FitText';
```

Replace the whole `TeamNames` function with:

```tsx
function TeamNames({ team, maxPx }: { team: PublicTeam; maxPx: number }): React.ReactElement {
    const { t } = useTranslation();
    const players = [team.player_1, team.player_2].filter((p): p is PublicPlayer => Boolean(p));
    if (players.length === 0) {
        return <FitText text={team.team_name ? localizeTeamPlaceholder(team.team_name, t) : ''} maxPx={maxPx} minPx={9} className="min-w-0" />;
    }
    return (
        <span className="flex min-w-0 flex-col gap-0.5">
            {players.map(p => (
                <span key={p.id} className="flex min-w-0 items-center gap-1.5">
                    <FitText text={playerFullName(p)} maxPx={maxPx} minPx={9} className="min-w-0" />
                    <RatingChip rating={p.skill_level} />
                </span>
            ))}
            {/* Reached the knockout on best-loser ranking rather than by qualifying.
                Promotion still runs on every group-then-knockout tournament, so with
                nothing marking it the public bracket shows a pair that finished 3rd
                exactly like a group winner. */}
            {team.is_lucky_loser ? (
                <span className="w-fit rounded bg-(--pb-accent-bg) px-1 text-[8px] font-black uppercase tracking-wider text-(--pb-accent)" title={t('public_bracket.lucky_loser', 'Lucky loser')}>
                    LL
                </span>
            ) : null}
        </span>
    );
}
```

Update the call site inside `TeamRow` (currently `<TeamNames team={team} />`):

```tsx
                    <TeamNames team={team} maxPx={small ? 12 : large ? 15 : 13} />
```

- [ ] **Step 2: Run the feature suite**

Run: `npx vitest run src/features/publicTournament`
Expected: PASS — no existing test asserts MatchCard's name markup directly, but `videoView`/`viewTabs`/page-level tests render it.

- [ ] **Step 3: Commit**

```bash
git add src/features/publicTournament/components/MatchCard.tsx
git commit -m "feat(live): match cards shrink player names instead of truncating"
```

---

### Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite, lint, build**

```bash
npm run test
npm run lint
npm run build
```

Expected: all pass. `npm run build` runs `tsc -b` — it catches any type drift (e.g. the `TeamNames` prop change).

- [ ] **Step 2: Visual check on the real screen (the spec's dense-fit checkpoint)**

The spec requires verifying that a 6-pair group with two-line rows fits the card on the
1600×900 canvas without clipping.

1. Ensure `.env` has real `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, then `npm run dev`.
2. Open `http://localhost:5174/live/<token>` — the token is a live-tournament share token
   (get one from the CRM or from whoever runs test tournaments; there is no fixture route).
3. Check at a ~1920×1080 window, in all three themes (theme switcher on the page):
   - rows form one tight cluster (no stretched gaps);
   - both players of every pair readable, full names, no `…` anywhere;
   - games column shows green won / red lost on every row; `+/-` green/red/muted-zero;
   - numbers don't mirror in Hebrew (e.g. `20–10` never renders `10–20`);
   - a 5–6 pair group fits its card without clipping the bottom row — **if it clips, reduce
     the dense name `maxPx` from 13 to 12 and the row `py` before touching anything else.**
4. If no live tournament with a 5–6 pair group exists right now, say so in the summary
   instead of skipping silently — the 4-pair case can be checked on any live tournament,
   the dense case gets flagged for the next real one.

- [ ] **Step 3: Update the wiki**

Run the `/wiki-ingest` skill (per the monorepo's CLAUDE.md) so the live-screen pages record
the new columns, FitText, and the games-based diff alignment.

---

## Self-review (done at plan-writing time)

- **Spec coverage:** tight rows (Task 3), distribution column green/red (Tasks 1, 3, 4), `+/-` kept with sign colors (Tasks 3, 4), stacked names (Task 3), FitText everywhere names truncated (Tasks 2, 3, 4, 5, 6), games-vs-sets alignment (Task 4), theme tokens (Task 1), i18n keys (Task 1), tests including jsdom caveat (Tasks 2–5), dense-fit checkpoint (Task 7). No gaps found.
- **Placeholders:** none — every code step carries the full code.
- **Type consistency:** `FitText` props (`text`, `maxPx`, `minPx`, `className`) used identically in Tasks 3–6; `TeamNames` gains `maxPx` and its only call site is updated in the same task.
