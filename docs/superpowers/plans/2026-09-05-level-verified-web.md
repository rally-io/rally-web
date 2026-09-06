# Verified Level — Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show every player's level with its verified seal / dashed "not verified" mark, and show the owner their reliability ring, across the rally-web SPA — so the number players see carries how much Rally trusts it.

**Architecture:** One kit directory `src/components/players/level/` owns every visual: `describeLevel()` turns the three API fields into a `LevelDescriptor` and the four components (`VerifiedSeal`, `LevelChip`, `ReliabilityRing`, `LevelStatusLine`) plus `LevelExplainerSheet` render only that descriptor. Surfaces (Navbar, `/network` card, tournament participants, partner search, globe, `EditProfilePage`, `/level`) call the kit and never draw a seal, a dashed pill or a ring themselves. Data arrives on the existing payloads as two additive fields (`level_verified`, `level_reliability`) shipped by the backend plan; a payload without them renders the `unknown` state (plain number), never a false "not verified".

**Tech Stack:** React 18 + Vite + TypeScript, Tailwind v4 tokens (`rally-*` in `src/App.css`), Radix `Sheet`/`Dialog` from `src/components/ui/`, react-hook-form, React Query, react-i18next (nested JSON, `he` default / `en`), vitest + jsdom + Testing Library, zod for the globe payload.

**Spec:** `../rally-api-rating/docs/superpowers/specs/2026-09-05-rating-reliability-ui-design.md` (§5 kit, §6 owner card, §7 web surfaces, §9.4 declaration flow, §10 explainer, §11 copy, §12 edge cases, §14 tests). Backend counterpart: `../rally-api-rating/docs/superpowers/plans/2026-09-05-rating-reliability-ui-api.md` (adds the two fields to `PlayerMe`-shaped payloads and the search dicts; ships first).

---

## Global constraints

- **Repo:** `/Users/shahafpariente/Desktop/SideKicks/Rally/rally-web`, branch `feat/player-globe` (clean at start). Work on a new branch off it: `git checkout -b feat/level-verified`.
- **Commands:** `npx vitest run <file>` for one file, `npm test` for all, `npm run lint`, `npm run build` (= `tsc -b && vite build`; **test files are typechecked too** — `tsconfig.json` includes all of `src`). Every task ends green on its own file(s); Task 14 runs the full trio.
- **Shell quirks:** the RTK hook rewrites `grep`/`find`/`cat` — use `rtk proxy grep …`, `sed -n 'a,bp' file` to read; never an unquoted `*` glob in zsh.
- **i18n:** all copy goes through `t('level.*')`; the exact EN/HE strings are in Task 1 and are the spec §11 table verbatim. Engine numbers (86, 15, 3, 3) come from `constants.ts` and are interpolated — never typed into a translation. Always `toFixed(2)`; the number is one LTR token (`<span dir="ltr" className="tabular-nums">`); percentages are one token isolated with `ltrIsolate('72%')` **before** interpolation (`src/lib/bidi.ts`, created in Task 1).
- **Colours:** use tokens in className (`text-rally-accent` = `#ccff00`, `text-rally-text-2` = `#a1a1aa`, `border-rally-text-muted` = `#71717a`, `bg-rally-surface-2` = `#2e2e33`). Inside SVG attributes use the literal hex from spec Appendix A (SVG attributes cannot take Tailwind classes; tests assert the hex).
- **Tests forced to English** by `src/test-setup.ts` (imports `@/i18n`, `changeLanguage('en')`) — test files need no i18n import. `useAppSession()` throws outside its provider, so any component test that renders a `useAppSession` consumer mocks `@/hooks/useAppSession`.
- **Radix in jsdom:** `Dialog`/`Sheet` render fine (see `src/pages/TournamentDetailPage.test.tsx` for `getByRole('dialog')` precedent).
- **`docs/` is gitignored** — commit the plan with `git add -f docs/superpowers/plans/2026-09-05-level-verified-web.md`.
- **Spec notes recorded here (not deviations, but decisions the spec left to implementation):**
  - The ghost seal (`VerifiedSeal ghost`) is `aria-hidden`: it always sits beside the words "Not verified yet", so labelling it "Verified level" would tell a screen reader the opposite of the truth. Only the real seal carries `level.sealLabel`.
  - §9.4 says the reveal dialog's button reads "Got it"; §11 defines no such key. The button uses the existing `level.revealDone` ("Done") — no new copy.
  - §12 "light sections on web (`/level` legend)": `/level` has no light section (every block is `bg-rally-surface`), so the legend renders on dark and the kit has no on-light variant. YAGNI until a light surface exists.
  - `GlobeNode.levelVerified` / `levelReliability` are optional so the nine existing node fixtures in `src/features/playerGlobe/__tests__/` keep compiling; the mapper always sets `levelReliability` (null when absent).

## File map

| File | Responsibility |
|---|---|
| `src/lib/bidi.ts` (new) | `ltrIsolate(s)` — U+2066…U+2069 wrapper for tokens interpolated into Hebrew sentences |
| `src/components/players/level/constants.ts` (new) | the four engine mirrors (§5.7) |
| `src/components/players/level/describeLevel.ts` (new) | `describeLevel()` + `LevelDescriptor` — the only place that decides a level's state |
| `src/components/players/level/VerifiedSeal.tsx` (new) | the eight-lobe seal SVG, real and ghost |
| `src/components/players/level/LevelChip.tsx` (new) | number + seal / dashed pill / plain / em dash, three sizes |
| `src/components/players/level/ReliabilityRing.tsx` (new) | owner's 96×96 gauge with the 86 % notch |
| `src/components/players/level/LevelStatusLine.tsx` (new) | `[seal] Verified` / `[ghost] Not verified yet` + `72% level reliability` |
| `src/components/players/level/LevelExplainerSheet.tsx` (new) | six-block explainer in a Radix `Sheet`, Close + Read more → `/level` |
| `src/components/players/level/index.ts` (new) | barrel |
| `src/components/players/level/*.test.tsx` (new) | kit tests |
| `src/i18n/locales/{en,he}.json` | new `level` namespace; drop `network.levelChip` and four `level_page` table keys |
| `src/types/api.ts` | `PlayerMe`, `TournamentParticipantPlayer`, `PlayerSearchResult` gain the two fields |
| `src/services/api/profile.ts` | `updateProfile` typed to return `ApiResponse<PlayerMe>` (the PATCH already returns the profile) |
| `src/components/layout/Navbar.tsx` | tier pill + `LevelChip sm` |
| `src/features/playerGlobe/components/PlayerStatsTab.tsx` (+ test) | self → ring + status + explainer; others → `LevelChip lg` + status |
| `src/components/tournaments/ParticipantsSection.tsx` (+ test) | `LevelChip sm` per non-guest player |
| `src/features/playerGlobe/{types.ts, api/network.ts, lib/avatarTexture.ts, scene/GlobeScene.ts, components/PlayerGlobe.tsx}` (+ tests) | node fields, dashed rim, tooltip chip |
| `src/components/tournaments/PartnerSection.tsx` (+ test) | trailing `LevelChip sm` on search rows |
| `src/pages/EditProfilePage.tsx` (+ test) | current level above the slider, warning under it, confirm dialog, reveal dialog |
| `src/pages/LevelPage.tsx` (+ new test) | "Verified level" block replaces the games→influence table |

---

### Task 1: Foundations — `ltrIsolate`, constants, the `level` copy

**Files:**
- Create: `src/lib/bidi.ts`
- Create: `src/lib/bidi.test.ts`
- Create: `src/components/players/level/constants.ts`
- Modify: `src/i18n/locales/en.json` (append namespace after `league`, the last one — file currently ends `    }\n  }\n}`)
- Modify: `src/i18n/locales/he.json` (same; note this file has no trailing newline)

- [ ] **Step 1: Write the failing test for `ltrIsolate`**

```ts
// src/lib/bidi.test.ts
import { describe, expect, it } from 'vitest'
import { ltrIsolate } from './bidi'

describe('ltrIsolate', () => {
  it('wraps the token in LRI … PDI so it survives inside a Hebrew sentence', () => {
    expect(ltrIsolate('72%')).toBe('⁦72%⁩')
    expect(ltrIsolate('4.25')).toBe('⁦4.25⁩')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/bidi.test.ts`
Expected: FAIL — `Failed to resolve import "./bidi"`.

- [ ] **Step 3: Create `src/lib/bidi.ts`**

```ts
/** Wraps a token in LTR isolates (U+2066 LRI … U+2069 PDI) so a number or a percentage
    interpolated into a Hebrew sentence stays one left-to-right run — "72%" never becomes
    "%72". Apply it to the value *before* `t()` interpolation, never by concatenating around
    the translated string. See wiki/gotchas/web-rtl-score-string-mirroring. */
export const ltrIsolate = (s: string): string => `⁦${s}⁩`
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/bidi.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Create `src/components/players/level/constants.ts`**

```ts
/* Mirrors of backend engine values (rally-api `app/services/rating_math.py`). They are
   interpolated into the explainer copy and never typed into a translation file. All four are
   round-two candidates for a server-exposed thresholds endpoint (spec §15) — until then, a
   backend change to any of them must be mirrored here by hand. */

/** σ_on = 0.40 → reliability 86 %: the notch on the ring; the seal is granted at or above it */
export const VERIFIED_RELIABILITY_THRESHOLD = 86
/** engine simulation median — re-check against the replay report before trusting it in copy */
export const TYPICAL_MATCHES_TO_VERIFY = 15
export const TYPICAL_TOURNAMENTS_TO_VERIFY = 3
/** months without a rated match before reliability starts to decay */
export const INACTIVITY_GRACE_MONTHS = 3
```

- [ ] **Step 6: Append the `level` namespace to `src/i18n/locales/en.json`**

The file ends with the `league` block. Replace the final two lines

```
  }
}
```

with

```json
  },
  "level": {
    "yourLevel": "Your level",
    "verified": "Verified",
    "notVerified": "Not verified",
    "notVerifiedYet": "Not verified yet",
    "reliability": "{{pct}} level reliability",
    "none": "No level yet",
    "hintNone": "Set your level to get started",
    "hintUnverified": "Every rated match sharpens your level. Reach the notch to get verified.",
    "hintVerified": "Keep playing — level reliability fades after {{months}} months without rated matches.",
    "hintVerifiedFading": "Your level reliability is slipping — play a rated match soon to keep the seal.",
    "howCalculated": "How is my level calculated?",
    "sealLabel": "Verified level",
    "warnVerified": "This replaces your current level and removes your verified seal until you've played rated matches again.",
    "warnUnverified": "This replaces your current level and resets its reliability. You rebuild it through rated matches.",
    "confirmTitle": "Give up your verified seal?",
    "confirmBody": "Your level {{level}} is verified at {{pct}} level reliability. A new declaration starts at {{startPct}} and the seal returns only after enough rated matches.",
    "confirmKeep": "Keep my verified level",
    "confirmProceed": "Reassess anyway",
    "revealNew": "Your new level",
    "revealStarting": "Your starting level",
    "revealBody": "This is your declared level. Every rated match in a Rally tournament sharpens it — reach the notch and it becomes verified.",
    "revealDone": "Done",
    "explainer": {
      "title": "How your level works",
      "level": {
        "title": "Your level",
        "body": "A number from 1.00 to 7.00. You start by declaring it; from then on only your results move it."
      },
      "reliability": {
        "title": "Level reliability",
        "body": "How sure Rally is about that number. It grows with every rated match — faster when you play new partners and opponents, because repeat pairings tell us less."
      },
      "verified": {
        "title": "Verified",
        "body": "When reliability reaches the notch — {{threshold}}% — your level earns the seal. Most players get there after about {{matches}} rated matches, roughly {{tournaments}} tournaments."
      },
      "counts": {
        "title": "What counts",
        "body": "Only matches recorded in Rally tournaments are rated. Friendly bookings and practice don't move your level."
      },
      "keeping": {
        "title": "Keeping it",
        "body": "{{months}} months without a rated match and reliability starts to fade, slowly. Declaring a new level replaces the number and resets reliability — the seal returns once you've played again."
      },
      "tier": {
        "title": "Tier",
        "body": "Bronze, Silver and Gold are just your level in bands: under 3.00, 3.00–3.99, 4.00 and up. Your tier never depends on verification."
      },
      "close": "Close",
      "readMore": "Read more"
    }
  }
}
```

- [ ] **Step 7: Append the `level` namespace to `src/i18n/locales/he.json`**

Same edit (the file ends `  }\n}` with no trailing newline). Replace the final two lines with:

```json
  },
  "level": {
    "yourLevel": "הרמה שלך",
    "verified": "מאומת",
    "notVerified": "לא מאומת",
    "notVerifiedYet": "עוד לא מאומת",
    "reliability": "אמינות הרמה {{pct}}",
    "none": "עוד אין רמה",
    "hintNone": "הגדירו את הרמה שלכם כדי להתחיל",
    "hintUnverified": "כל משחק מדורג מחדד את הרמה שלכם. הגיעו לסימון כדי לקבל אימות.",
    "hintVerified": "המשיכו לשחק — אמינות הרמה דוהה אחרי {{months}} חודשים בלי משחקים מדורגים.",
    "hintVerifiedFading": "אמינות הרמה שלכם יורדת — שחקו משחק מדורג בקרוב כדי לשמור על החותמת.",
    "howCalculated": "איך הרמה שלי מחושבת?",
    "sealLabel": "רמה מאומתת",
    "warnVerified": "זה מחליף את הרמה הנוכחית שלכם ומסיר את חותמת האימות עד שתשחקו שוב משחקים מדורגים.",
    "warnUnverified": "זה מחליף את הרמה הנוכחית ומאפס את אמינות הרמה. בונים אותה מחדש דרך משחקים מדורגים.",
    "confirmTitle": "לוותר על חותמת האימות?",
    "confirmBody": "הרמה שלכם {{level}} מאומתת עם אמינות רמה של {{pct}}. הצהרה חדשה מתחילה מ-{{startPct}} והחותמת חוזרת רק אחרי מספיק משחקים מדורגים.",
    "confirmKeep": "להשאיר את הרמה המאומתת",
    "confirmProceed": "להעריך מחדש בכל זאת",
    "revealNew": "הרמה החדשה שלך",
    "revealStarting": "רמת הפתיחה שלך",
    "revealBody": "זו הרמה שהצהרתם עליה. כל משחק מדורג בטורניר Rally מחדד אותה — הגיעו לסימון והיא תהפוך למאומתת.",
    "revealDone": "סיום",
    "explainer": {
      "title": "איך הרמה שלכם עובדת",
      "level": {
        "title": "הרמה שלכם",
        "body": "מספר בין 1.00 ל-7.00. מתחילים בהצהרה; מכאן והלאה רק התוצאות שלכם מזיזות אותו."
      },
      "reliability": {
        "title": "אמינות הרמה",
        "body": "עד כמה Rally בטוחה במספר הזה. היא עולה עם כל משחק מדורג — מהר יותר כשמשחקים עם שותפים ויריבים חדשים, כי זוגות חוזרים מלמדים אותנו פחות."
      },
      "verified": {
        "title": "מאומת",
        "body": "כשאמינות הרמה מגיעה לסימון — {{threshold}}% — הרמה שלכם מקבלת את החותמת. רוב השחקנים מגיעים לשם אחרי כ-{{matches}} משחקים מדורגים, בערך {{tournaments}} טורנירים."
      },
      "counts": {
        "title": "מה נספר",
        "body": "רק משחקים שנרשמו בטורנירי Rally מדורגים. הזמנות חבריות ואימונים לא מזיזים את הרמה."
      },
      "keeping": {
        "title": "לשמור עליה",
        "body": "{{months}} חודשים בלי משחק מדורג ואמינות הרמה מתחילה לדהות, לאט. הצהרה על רמה חדשה מחליפה את המספר ומאפסת את האמינות — החותמת חוזרת אחרי שתשחקו שוב."
      },
      "tier": {
        "title": "דרגה",
        "body": "ברונזה, כסף וזהב הם פשוט הרמה שלכם בטווחים: מתחת ל-3.00, 3.00–3.99, 4.00 ומעלה. הדרגה לא תלויה באימות."
      },
      "close": "סגירה",
      "readMore": "לקריאה נוספת"
    }
  }
}
```

- [ ] **Step 8: Validate both JSON files parse and carry the same key set**

Run:
```bash
node -e '
const en = require("./src/i18n/locales/en.json"), he = require("./src/i18n/locales/he.json");
const keys = (o, p = "") => Object.entries(o).flatMap(([k, v]) => typeof v === "object" ? keys(v, p + k + ".") : [p + k]);
const a = keys(en.level).sort(), b = keys(he.level).sort();
console.log(a.length, JSON.stringify(a) === JSON.stringify(b) ? "same keys" : "KEY MISMATCH");
'
```
Expected: `38 same keys` (23 top-level + `explainer.title` + 6×2 block keys + `explainer.close` + `explainer.readMore`).

- [ ] **Step 9: Run the whole suite once — the locale files are imported by every test**

Run: `npm test`
Expected: all green (no test reads `level.*` yet; this catches a JSON syntax slip).

- [ ] **Step 10: Commit**

```bash
git add src/lib/bidi.ts src/lib/bidi.test.ts src/components/players/level/constants.ts src/i18n/locales/en.json src/i18n/locales/he.json
git commit -m "feat(level): ltrIsolate helper, engine constants, level.* copy in both locales"
```

---

### Task 2: `describeLevel`

**Files:**
- Create: `src/components/players/level/describeLevel.ts`
- Create: `src/components/players/level/describeLevel.test.ts`

- [ ] **Step 1: Write the failing truth-table test**

```ts
// src/components/players/level/describeLevel.test.ts
import { describe, expect, it } from 'vitest'
import { describeLevel, type LevelDescriptor } from './describeLevel'

// spec §12: describeLevel decides every edge case; surfaces only render its output
const cases: Array<[number | null | undefined, boolean | undefined, number | null | undefined, LevelDescriptor]> = [
  [null, undefined, null, { state: 'none', value: null, reliability: null }],
  [undefined, true, 90, { state: 'none', value: null, reliability: null }],
  [null, true, 90, { state: 'none', value: null, reliability: null }],
  // older backend: no flag → plain number, and no reliability either
  [3.5, undefined, undefined, { state: 'unknown', value: '3.50', reliability: null }],
  [3.5, undefined, 72, { state: 'unknown', value: '3.50', reliability: null }],
  [3.5, false, null, { state: 'unverified', value: '3.50', reliability: null }],
  // fresh slider declaration: 0 % is a real reliability, not "missing"
  [3.5, false, 0, { state: 'unverified', value: '3.50', reliability: 0 }],
  [4, true, 91, { state: 'verified', value: '4.00', reliability: 91 }],
  // hysteresis band: the flag wins, not the threshold
  [4, true, 80, { state: 'verified', value: '4.00', reliability: 80 }],
  [4, true, null, { state: 'verified', value: '4.00', reliability: null }],
  [4, true, 100, { state: 'verified', value: '4.00', reliability: 100 }],
]

describe('describeLevel', () => {
  it.each(cases)('describeLevel(%s, %s, %s)', (level, verified, reliability, expected) => {
    expect(describeLevel(level, verified, reliability)).toEqual(expected)
  })

  it('always prints exactly two decimals, never locale-formatted', () => {
    expect(describeLevel(4.2, false, 10).value).toBe('4.20')
    expect(describeLevel(4.256, false, 10).value).toBe('4.26')
    expect(describeLevel(7, true, 100).value).toBe('7.00')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/players/level/describeLevel.test.ts`
Expected: FAIL — `Failed to resolve import "./describeLevel"`.

- [ ] **Step 3: Create `describeLevel.ts`**

```ts
// src/components/players/level/describeLevel.ts
export type LevelState = 'none' | 'unknown' | 'unverified' | 'verified'

export interface LevelDescriptor {
  state: LevelState
  /** `skill_level.toFixed(2)`, or null in `none`. Never locale-formatted. */
  value: string | null
  /** 0–100, or null when the backend sent none — or sent nothing at all (`unknown`) */
  reliability: number | null
}

/** The one place that decides how a level renders (spec §5.1, §12). Positional so snake_case
    API types and camelCase mappers call it alike:
    `describeLevel(p.skill_level, p.level_verified, p.level_reliability)`.

    `verified === undefined` means the payload predates the field (an older backend behind a
    newer build). That is `unknown` — a plain number — and never `unverified`: a dashed pill
    would claim something the server did not say. Tier is never derived here; it comes from the
    server. */
export function describeLevel(
  level: number | null | undefined,
  verified: boolean | undefined,
  reliability: number | null | undefined,
): LevelDescriptor {
  if (level == null) return { state: 'none', value: null, reliability: null }
  const value = level.toFixed(2)
  if (verified === undefined) return { state: 'unknown', value, reliability: null }
  return { state: verified ? 'verified' : 'unverified', value, reliability: reliability ?? null }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/players/level/describeLevel.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/players/level/describeLevel.ts src/components/players/level/describeLevel.test.ts
git commit -m "feat(level): describeLevel — the single decision point for a level's state"
```

---

### Task 3: `VerifiedSeal` and `LevelChip`

**Files:**
- Create: `src/components/players/level/VerifiedSeal.tsx`
- Create: `src/components/players/level/VerifiedSeal.test.tsx`
- Create: `src/components/players/level/LevelChip.tsx`
- Create: `src/components/players/level/LevelChip.test.tsx`

- [ ] **Step 1: Write the failing seal test**

```tsx
// src/components/players/level/VerifiedSeal.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VerifiedSeal } from './VerifiedSeal'

describe('VerifiedSeal', () => {
  it('is labelled "Verified level" and draws the seams only from 16 px', () => {
    const { container, rerender } = render(<VerifiedSeal size={12} />)
    expect(screen.getByRole('img', { name: 'Verified level' })).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('width', '12')
    expect(container.querySelectorAll('path')).toHaveLength(1) // the check only
    rerender(<VerifiedSeal size={16} />)
    expect(container.querySelectorAll('path')).toHaveLength(2) // seams + check
  })

  it('uses the Appendix A palette: blue shape, lime face', () => {
    const { container } = render(<VerifiedSeal size={22} />)
    expect(container.querySelector('g')).toHaveAttribute('fill', '#0055ff')
    expect(container.querySelector('circle[r="7.7"]')).toHaveAttribute('fill', '#ccff00')
  })

  it('ghost: a dashed grey outline, decorative (the text beside it carries the state)', () => {
    const { container } = render(<VerifiedSeal size={22} ghost />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    const g = container.querySelector('g')!
    expect(g).toHaveAttribute('fill', 'none')
    expect(g).toHaveAttribute('stroke', '#71717a')
    expect(g).toHaveAttribute('stroke-dasharray', '2 1.6')
    expect(container.querySelectorAll('path')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/players/level/VerifiedSeal.test.tsx`
Expected: FAIL — `Failed to resolve import "./VerifiedSeal"`.

- [ ] **Step 3: Create `VerifiedSeal.tsx`**

```tsx
// src/components/players/level/VerifiedSeal.tsx
import { useTranslation } from 'react-i18next'

/* Spec Appendix A, 24-unit viewBox: one r 9.6 disc plus eight r 3.4 discs at radius 8.4,
   every 45°. The same nine circles draw the mobile seal — change both or neither. */
const LOBES: ReadonlyArray<readonly [number, number]> = [
  [20.4, 12],
  [17.94, 17.94],
  [12, 20.4],
  [6.06, 17.94],
  [3.6, 12],
  [6.06, 6.06],
  [12, 3.6],
  [17.94, 6.06],
]

export interface VerifiedSealProps {
  /** rendered size in px; seams appear from 16 */
  size: number
  /** dashed grey outline — "not verified yet", next to the words that say so */
  ghost?: boolean
  className?: string
}

export function VerifiedSeal({ size, ghost = false, className }: VerifiedSealProps) {
  const { t } = useTranslation()
  const shape = (
    <>
      <circle cx="12" cy="12" r="9.6" />
      {LOBES.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" />
      ))}
    </>
  )
  if (ghost) {
    // Decorative: it never appears without "Not verified yet" beside it, and labelling it
    // "Verified level" would tell a screen reader the opposite of the truth.
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <g fill="none" stroke="#71717a" strokeWidth="1.2" strokeDasharray="2 1.6">
          {shape}
        </g>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={t('level.sealLabel')} className={className}>
      <g fill="#0055ff">{shape}</g>
      <circle cx="12" cy="12" r="7.7" fill="#ccff00" />
      {size >= 16 && (
        <path
          d="M6.6 9.3c1.7 1.5 1.7 3.9 0 5.4M17.4 9.3c-1.7 1.5-1.7 3.9 0 5.4"
          fill="none"
          stroke="#0055ff"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      )}
      <path d="M8.2 12.4l2.7 2.7 5.2-5.6" fill="none" stroke="#0055ff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
```

- [ ] **Step 4: Run the seal test to verify it passes**

Run: `npx vitest run src/components/players/level/VerifiedSeal.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing chip test**

```tsx
// src/components/players/level/LevelChip.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { describeLevel } from './describeLevel'
import { LevelChip } from './LevelChip'

describe('LevelChip', () => {
  it('verified: lime number, two decimals as one LTR token, trailing seal with its label', () => {
    render(<LevelChip descriptor={describeLevel(4, true, 91)} size="md" />)
    const chip = screen.getByTestId('level-chip')
    expect(chip).toHaveAttribute('data-state', 'verified')
    expect(chip.className).toMatch(/text-rally-accent/)
    expect(chip.className).not.toMatch(/border-dashed/)
    expect(screen.getByText('4.00')).toHaveAttribute('dir', 'ltr')
    const seal = screen.getByRole('img', { name: 'Verified level' })
    expect(seal).toHaveAttribute('width', '16')
    // trailing: the number comes before the seal in DOM order (flex mirrors it in RTL)
    expect(chip.firstElementChild).toBe(screen.getByText('4.00'))
  })

  it('seal size follows the chip size: 12 / 16 / 22', () => {
    const d = describeLevel(4, true, 91)
    const { rerender } = render(<LevelChip descriptor={d} size="sm" />)
    expect(screen.getByRole('img')).toHaveAttribute('width', '12')
    rerender(<LevelChip descriptor={d} size="lg" />)
    expect(screen.getByRole('img')).toHaveAttribute('width', '22')
  })

  it('unverified: dashed muted pill, no seal; md carries "Not verified", sm does not', () => {
    const d = describeLevel(3.5, false, 40)
    const { rerender } = render(<LevelChip descriptor={d} size="md" />)
    const chip = screen.getByTestId('level-chip')
    expect(chip).toHaveAttribute('data-state', 'unverified')
    expect(chip.className).toMatch(/border-dashed/)
    expect(chip.className).toMatch(/text-rally-text-2/)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('3.50')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('Not verified')).toBeInTheDocument()
    rerender(<LevelChip descriptor={d} size="sm" />)
    expect(screen.queryByText('Not verified')).not.toBeInTheDocument()
    rerender(<LevelChip descriptor={d} size="lg" showLabel={false} />)
    expect(screen.queryByText('Not verified')).not.toBeInTheDocument()
  })

  it('unknown: a plain number — no seal, no dashes, no label', () => {
    render(<LevelChip descriptor={describeLevel(3.5, undefined, null)} size="lg" />)
    const chip = screen.getByTestId('level-chip')
    expect(chip).toHaveAttribute('data-state', 'unknown')
    expect(screen.getByText('3.50')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(chip.className).not.toMatch(/border-dashed/)
    expect(chip.className).not.toMatch(/text-rally-accent/)
    expect(screen.queryByText('Not verified')).not.toBeInTheDocument()
  })

  it('none: a muted em dash and nothing else', () => {
    render(<LevelChip descriptor={describeLevel(null, true, 90)} />)
    const chip = screen.getByTestId('level-chip')
    expect(chip).toHaveAttribute('data-state', 'none')
    expect(chip).toHaveTextContent('—')
    expect(chip.className).toMatch(/text-rally-text-muted/)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/components/players/level/LevelChip.test.tsx`
Expected: FAIL — `Failed to resolve import "./LevelChip"`.

- [ ] **Step 7: Create `LevelChip.tsx`**

```tsx
// src/components/players/level/LevelChip.tsx
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { LevelDescriptor } from './describeLevel'
import { VerifiedSeal } from './VerifiedSeal'

export type LevelChipSize = 'sm' | 'md' | 'lg'

const SEAL_PX: Record<LevelChipSize, number> = { sm: 12, md: 16, lg: 22 }
// lg is a headline number → Rubik; sm/md ride along in the body font of their row
const NUMBER_CLASS: Record<LevelChipSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'font-display text-2xl leading-none',
}
const PILL_PAD: Record<LevelChipSize, string> = {
  sm: 'px-[7px] py-px',
  md: 'px-2 py-0.5',
  lg: 'px-3 py-1',
}

export interface LevelChipProps {
  descriptor: LevelDescriptor
  /** seal 12 / 16 / 22 px */
  size?: LevelChipSize
  /** the "Not verified" word inside the dashed pill; defaults on for md and lg */
  showLabel?: boolean
  className?: string
}

/** A player's level wherever it appears in a row or a header (spec §5.3). Never draws the
    reliability — that is the owner's ring and the status line. The row is a flex container so
    the seal trails the number in reading direction ("⬢ 3.75" in Hebrew). */
export function LevelChip({ descriptor, size = 'sm', showLabel = size !== 'sm', className }: LevelChipProps) {
  const { t } = useTranslation()
  const { state, value } = descriptor

  if (state === 'none') {
    return (
      <span data-testid="level-chip" data-state="none" className={cn('text-rally-text-muted', NUMBER_CLASS[size], className)}>
        —
      </span>
    )
  }

  const number = (
    <span dir="ltr" className="tabular-nums">
      {value}
    </span>
  )

  if (state === 'unverified') {
    return (
      <span
        data-testid="level-chip"
        data-state="unverified"
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-dashed border-rally-text-muted font-semibold text-rally-text-2',
          NUMBER_CLASS[size],
          PILL_PAD[size],
          className,
        )}
      >
        {number}
        {showLabel && <span className="text-[0.7em] font-medium">{t('level.notVerified')}</span>}
      </span>
    )
  }

  return (
    <span
      data-testid="level-chip"
      data-state={state}
      className={cn(
        'inline-flex items-center gap-1 font-semibold',
        state === 'verified' ? 'text-rally-accent' : 'text-rally-text',
        NUMBER_CLASS[size],
        className,
      )}
    >
      {number}
      {state === 'verified' && <VerifiedSeal size={SEAL_PX[size]} className="shrink-0" />}
    </span>
  )
}
```

- [ ] **Step 8: Run the chip test to verify it passes**

Run: `npx vitest run src/components/players/level/LevelChip.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 9: Commit**

```bash
git add src/components/players/level/VerifiedSeal.tsx src/components/players/level/VerifiedSeal.test.tsx src/components/players/level/LevelChip.tsx src/components/players/level/LevelChip.test.tsx
git commit -m "feat(level): VerifiedSeal and LevelChip"
```

---

### Task 4: `ReliabilityRing` and `LevelStatusLine`

**Files:**
- Create: `src/components/players/level/ReliabilityRing.tsx`
- Create: `src/components/players/level/ReliabilityRing.test.tsx`
- Create: `src/components/players/level/LevelStatusLine.tsx`
- Create: `src/components/players/level/LevelStatusLine.test.tsx`

- [ ] **Step 1: Write the failing ring test**

```tsx
// src/components/players/level/ReliabilityRing.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReliabilityRing } from './ReliabilityRing'

const CIRC = 2 * Math.PI * 42 // 263.9

function fillDash(): number | null {
  const fill = screen.queryByTestId('ring-fill')
  if (!fill) return null
  const dash = fill.getAttribute('stroke-dasharray')
  return dash == null ? Infinity : parseFloat(dash.split(' ')[0])
}

describe('ReliabilityRing', () => {
  it('draws the track, the notch and the number; 0 % has no fill arc', () => {
    const { container } = render(<ReliabilityRing value="3.50" reliability={0} verified={false} />)
    expect(container.querySelector('circle[stroke="#2e2e33"]')).toHaveAttribute('stroke-width', '6')
    expect(container.querySelector('line')).toHaveAttribute('x1', '21.5')
    expect(screen.getByText('3.50')).toHaveAttribute('fill', '#ccff00')
    expect(fillDash()).toBeNull()
  })

  it('fill length is reliability × circumference, drawn from 12 o\'clock', () => {
    const { rerender } = render(<ReliabilityRing value="3.50" reliability={50} verified={false} />)
    expect(fillDash()).toBeCloseTo(CIRC * 0.5, 1)
    expect(screen.getByTestId('ring-fill')).toHaveAttribute('transform', 'rotate(-90 48 48)')
    expect(screen.getByTestId('ring-fill')).toHaveAttribute('stroke-linecap', 'round')
    rerender(<ReliabilityRing value="4.00" reliability={86} verified />)
    expect(fillDash()).toBeCloseTo(CIRC * 0.86, 1)
  })

  it('100 % is a full circle, not a dash', () => {
    render(<ReliabilityRing value="4.00" reliability={100} verified />)
    expect(fillDash()).toBe(Infinity)
    expect(screen.getByTestId('ring-fill')).not.toHaveAttribute('stroke-dasharray')
  })

  it('fill colour follows the verified flag, not the threshold', () => {
    const { rerender } = render(<ReliabilityRing value="4.00" reliability={80} verified />)
    expect(screen.getByTestId('ring-fill')).toHaveAttribute('stroke', '#ccff00')
    rerender(<ReliabilityRing value="4.00" reliability={90} verified={false} />)
    expect(screen.getByTestId('ring-fill')).toHaveAttribute('stroke', '#8fa800')
  })

  it('null reliability: track only; null value: em dash', () => {
    const { rerender } = render(<ReliabilityRing value="4.00" reliability={null} verified />)
    expect(fillDash()).toBeNull()
    expect(screen.getByText('4.00')).toBeInTheDocument()
    rerender(<ReliabilityRing value={null} reliability={null} verified={false} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAccessibleName('No level yet')
  })

  it('never mirrors: dir="ltr" on the svg', () => {
    render(<ReliabilityRing value="4.00" reliability={50} verified />)
    expect(screen.getByRole('img')).toHaveAttribute('dir', 'ltr')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/players/level/ReliabilityRing.test.tsx`
Expected: FAIL — `Failed to resolve import "./ReliabilityRing"`.

- [ ] **Step 3: Create `ReliabilityRing.tsx`**

```tsx
// src/components/players/level/ReliabilityRing.tsx
import { useTranslation } from 'react-i18next'

const R = 42
const CIRCUMFERENCE = 2 * Math.PI * R // ≈ 263.9

export interface ReliabilityRingProps {
  /** the level, two decimals; null draws an em dash (no level yet) */
  value: string | null
  /** 0–100; null draws the track only (backend sent none) */
  reliability: number | null
  /** colours the fill: lime when the seal is held, olive while building up to it */
  verified: boolean
  className?: string
}

/** The owner's gauge (spec §5.4 / Appendix A): a 96×96 SVG with the track, the fill arc from
    12 o'clock, a fixed notch at the 86 % threshold and the number inside. The fill colour follows
    the verified *flag*, so a verified player in the hysteresis band (79–86 %) still sees lime
    stopping short of the notch — which is exactly the story `hintVerifiedFading` tells.
    It is a gauge, not text: `dir="ltr"` keeps it from mirroring in Hebrew. */
export function ReliabilityRing({ value, reliability, verified, className }: ReliabilityRingProps) {
  const { t } = useTranslation()
  const pct = reliability == null ? 0 : Math.min(100, Math.max(0, reliability))
  const fill = verified ? '#ccff00' : '#8fa800'
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      role="img"
      aria-label={value ?? t('level.none')}
      dir="ltr"
      className={className}
      data-testid="reliability-ring"
    >
      <circle cx="48" cy="48" r={R} fill="none" stroke="#2e2e33" strokeWidth="6" />
      {reliability != null && pct >= 100 && (
        // a full circle: round caps on a 100 % dash would overlap at the seam
        <circle cx="48" cy="48" r={R} fill="none" stroke={fill} strokeWidth="6" data-testid="ring-fill" />
      )}
      {reliability != null && pct > 0 && pct < 100 && (
        <circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          stroke={fill}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * CIRCUMFERENCE} 264`}
          transform="rotate(-90 48 48)"
          data-testid="ring-fill"
        />
      )}
      {/* the notch: 86 % × 360° = 309.6° from 12 o'clock, across the track */}
      <line x1="21.5" y1="26.1" x2="13.6" y2="19.5" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />
      <text
        x="48"
        y="57"
        textAnchor="middle"
        fill={value == null ? '#71717a' : '#ccff00'}
        fontFamily="Rubik, Heebo, system-ui, sans-serif"
        fontSize="27"
        fontWeight="700"
      >
        {value ?? '—'}
      </text>
    </svg>
  )
}
```

- [ ] **Step 4: Run the ring test to verify it passes**

Run: `npx vitest run src/components/players/level/ReliabilityRing.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing status-line test**

```tsx
// src/components/players/level/LevelStatusLine.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { describeLevel } from './describeLevel'
import { LevelStatusLine } from './LevelStatusLine'

describe('LevelStatusLine', () => {
  it('verified: the seal, "Verified" in lime, then the reliability line', () => {
    render(<LevelStatusLine descriptor={describeLevel(4, true, 91)} />)
    expect(screen.getByRole('img', { name: 'Verified level' })).toBeInTheDocument()
    const word = screen.getByText('Verified')
    expect(word.className).toMatch(/text-rally-accent/)
    expect(screen.getByText(/level reliability/)).toBeInTheDocument()
  })

  it('unverified: the ghost seal and "Not verified yet", muted', () => {
    render(<LevelStatusLine descriptor={describeLevel(3.5, false, 40)} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(document.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
    const word = screen.getByText('Not verified yet')
    expect(word.className).toMatch(/text-rally-text-2/)
  })

  it('isolates the percentage as one LTR token before interpolation', () => {
    render(<LevelStatusLine descriptor={describeLevel(3.5, false, 72)} />)
    // U+2066 LRI … U+2069 PDI around "72%", inside the sentence — the bidi-bug class
    expect(screen.getByText(/level reliability/).textContent).toBe('⁦72%⁩ level reliability')
  })

  it('drops the reliability line when the backend sent none', () => {
    render(<LevelStatusLine descriptor={describeLevel(3.5, false, null)} />)
    expect(screen.getByText('Not verified yet')).toBeInTheDocument()
    expect(screen.queryByText(/level reliability/)).not.toBeInTheDocument()
  })

  it('renders nothing for none and unknown', () => {
    const { container, rerender } = render(<LevelStatusLine descriptor={describeLevel(null, true, 90)} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<LevelStatusLine descriptor={describeLevel(3.5, undefined, 72)} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/components/players/level/LevelStatusLine.test.tsx`
Expected: FAIL — `Failed to resolve import "./LevelStatusLine"`.

- [ ] **Step 7: Create `LevelStatusLine.tsx`**

```tsx
// src/components/players/level/LevelStatusLine.tsx
import { useTranslation } from 'react-i18next'
import { ltrIsolate } from '@/lib/bidi'
import { cn } from '@/lib/utils'
import type { LevelDescriptor } from './describeLevel'
import { VerifiedSeal } from './VerifiedSeal'

export interface LevelStatusLineProps {
  descriptor: LevelDescriptor
  className?: string
}

/** Two lines under a level (spec §5.5): `[seal] Verified` or `[ghost] Not verified yet`, then
    `72% level reliability` when the backend sent a reliability. Nothing for `none` (the owner
    card shows `hintNone` instead) and `unknown` (an older backend: no claim either way). */
export function LevelStatusLine({ descriptor, className }: LevelStatusLineProps) {
  const { t } = useTranslation()
  const { state, reliability } = descriptor
  if (state === 'none' || state === 'unknown') return null
  const verified = state === 'verified'
  return (
    <div className={cn('flex flex-col gap-0.5 text-sm', className)} data-testid="level-status-line">
      <span className={cn('inline-flex items-center gap-1.5 font-semibold', verified ? 'text-rally-accent' : 'text-rally-text-2')}>
        <VerifiedSeal size={16} ghost={!verified} className="shrink-0" />
        {verified ? t('level.verified') : t('level.notVerifiedYet')}
      </span>
      {reliability != null && (
        // the percent is isolated *before* interpolation so "72%" survives the Hebrew sentence
        <span className="text-rally-text-2">{t('level.reliability', { pct: ltrIsolate(`${reliability}%`) })}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Run the status-line test to verify it passes**

Run: `npx vitest run src/components/players/level/LevelStatusLine.test.tsx`
Expected: PASS (5 tests). If the "Verified" query matches two elements, the word span and the seal share a parent — `getByText('Verified')` matches only the element whose own text is exactly "Verified", which is the outer `<span>`; that is what the test asserts a class on.

- [ ] **Step 9: Commit**

```bash
git add src/components/players/level/ReliabilityRing.tsx src/components/players/level/ReliabilityRing.test.tsx src/components/players/level/LevelStatusLine.tsx src/components/players/level/LevelStatusLine.test.tsx
git commit -m "feat(level): ReliabilityRing and LevelStatusLine"
```

---

### Task 5: `LevelExplainerSheet` and the kit barrel

**Files:**
- Create: `src/components/players/level/LevelExplainerSheet.tsx`
- Create: `src/components/players/level/LevelExplainerSheet.test.tsx`
- Create: `src/components/players/level/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/players/level/LevelExplainerSheet.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LevelExplainerSheet } from './LevelExplainerSheet'

describe('LevelExplainerSheet', () => {
  it('renders the six blocks with the engine numbers interpolated, plus Close and Read more', () => {
    render(
      <MemoryRouter>
        <LevelExplainerSheet open onOpenChange={() => {}} />
      </MemoryRouter>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('How your level works')
    for (const title of ['Your level', 'Level reliability', 'Verified', 'What counts', 'Keeping it', 'Tier']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    expect(dialog).toHaveTextContent('the notch — 86% —')
    expect(dialog).toHaveTextContent('about 15 rated matches, roughly 3 tournaments')
    expect(dialog).toHaveTextContent('3 months without a rated match')
    expect(screen.getByRole('link', { name: 'Read more' })).toHaveAttribute('href', '/level')
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('the Close button closes the sheet', () => {
    const onOpenChange = vi.fn()
    render(
      <MemoryRouter>
        <LevelExplainerSheet open onOpenChange={onOpenChange} />
      </MemoryRouter>,
    )
    screen.getByRole('button', { name: 'Close' }).click()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <LevelExplainerSheet open={false} onOpenChange={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/players/level/LevelExplainerSheet.test.tsx`
Expected: FAIL — `Failed to resolve import "./LevelExplainerSheet"`.

- [ ] **Step 3: Create `LevelExplainerSheet.tsx`**

`SheetContent` renders its own top-corner X (`hideClose` off) with an sr-only "Close" label — check `src/components/ui/sheet.tsx:61-70`; if that sr-only text is also "Close", `getByRole('button', { name: 'Close' })` would find two buttons. Pass `hideClose` so the footer button is the single close control.

```tsx
// src/components/players/level/LevelExplainerSheet.tsx
import type { LucideIcon } from 'lucide-react'
import { Gauge, Hash, ListChecks, Medal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  INACTIVITY_GRACE_MONTHS,
  TYPICAL_MATCHES_TO_VERIFY,
  TYPICAL_TOURNAMENTS_TO_VERIFY,
  VERIFIED_RELIABILITY_THRESHOLD,
} from './constants'
import { VerifiedSeal } from './VerifiedSeal'

type Block = {
  key: 'level' | 'reliability' | 'verified' | 'counts' | 'keeping' | 'tier'
  icon: LucideIcon | 'seal' | 'ghost'
  values?: Record<string, number>
}

/* Spec §10: six blocks, icon + heading + one or two sentences, no formulas. The engine numbers
   interpolate from constants.ts — never from the translation files. */
const BLOCKS: Block[] = [
  { key: 'level', icon: Hash },
  { key: 'reliability', icon: Gauge },
  {
    key: 'verified',
    icon: 'seal',
    values: {
      threshold: VERIFIED_RELIABILITY_THRESHOLD,
      matches: TYPICAL_MATCHES_TO_VERIFY,
      tournaments: TYPICAL_TOURNAMENTS_TO_VERIFY,
    },
  },
  { key: 'counts', icon: ListChecks },
  { key: 'keeping', icon: 'ghost', values: { months: INACTIVITY_GRACE_MONTHS } },
  { key: 'tier', icon: Medal },
]

function BlockIcon({ icon }: { icon: Block['icon'] }) {
  if (icon === 'seal') return <VerifiedSeal size={22} />
  if (icon === 'ghost') return <VerifiedSeal size={22} ghost />
  const Icon = icon
  return <Icon className="h-[22px] w-[22px] text-rally-accent" aria-hidden />
}

export interface LevelExplainerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LevelExplainerSheet({ open, onOpenChange }: LevelExplainerSheetProps) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose className="flex w-full flex-col bg-rally-surface sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-xl font-black text-rally-text">{t('level.explainer.title')}</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex-1 overflow-y-auto">
          <ol className="flex flex-col gap-5">
            {BLOCKS.map((block) => (
              <li key={block.key} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rally-surface-2">
                  <BlockIcon icon={block.icon} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-rally-text">{t(`level.explainer.${block.key}.title`)}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-rally-text-2">{t(`level.explainer.${block.key}.body`, block.values)}</p>
                </div>
              </li>
            ))}
          </ol>
        </SheetBody>
        <SheetFooter className="gap-2 sm:justify-between">
          <Link
            to="/level"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center justify-center rounded-full border border-rally-border px-5 text-sm font-semibold text-rally-text"
          >
            {t('level.explainer.readMore')}
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center justify-center rounded-full bg-rally-accent px-5 text-sm font-bold text-rally-accent-text hover:bg-rally-accent-hover"
          >
            {t('level.explainer.close')}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
```

If `SheetBody`/`SheetFooter` accept `className` differently than assumed, read `src/components/ui/sheet.tsx:74-90` — both are thin `div` wrappers spreading `HTMLAttributes<HTMLDivElement>`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/players/level/LevelExplainerSheet.test.tsx`
Expected: PASS (3 tests). Radix `Sheet` needs no `SheetDescription` for these tests; if the console warns "Missing `Description`", add `<SheetDescription className="sr-only">{t('level.explainer.title')}</SheetDescription>` under the title — a warning, not a failure.

- [ ] **Step 5: Create the barrel**

```ts
// src/components/players/level/index.ts
export { describeLevel } from './describeLevel'
export type { LevelDescriptor, LevelState } from './describeLevel'
export { VerifiedSeal } from './VerifiedSeal'
export { LevelChip } from './LevelChip'
export type { LevelChipSize } from './LevelChip'
export { ReliabilityRing } from './ReliabilityRing'
export { LevelStatusLine } from './LevelStatusLine'
export { LevelExplainerSheet } from './LevelExplainerSheet'
export {
  INACTIVITY_GRACE_MONTHS,
  TYPICAL_MATCHES_TO_VERIFY,
  TYPICAL_TOURNAMENTS_TO_VERIFY,
  VERIFIED_RELIABILITY_THRESHOLD,
} from './constants'
```

- [ ] **Step 6: Run the whole kit directory and lint it**

Run: `npx vitest run src/components/players/level && npx eslint src/components/players/level src/lib/bidi.ts`
Expected: all kit tests PASS; eslint clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/players/level/LevelExplainerSheet.tsx src/components/players/level/LevelExplainerSheet.test.tsx src/components/players/level/index.ts
git commit -m "feat(level): LevelExplainerSheet and the kit barrel"
```

---

### Task 6: API types

**Files:**
- Modify: `src/types/api.ts:216-224` (`TournamentParticipantPlayer`), `:322-327` (`PlayerSearchResult`), `:387-396` (`PlayerMe`)
- Modify: `src/services/api/profile.ts:14` (`updateProfile` return type)

- [ ] **Step 1: Add the two fields to the three player shapes**

`TournamentParticipantPlayer` becomes:

```ts
export interface TournamentParticipantPlayer {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  skill_level: number | null
  skill_tier?: string | null
  /** absent on a backend that predates the verified-level fields → describeLevel → `unknown` */
  level_verified?: boolean
  level_reliability?: number | null
  is_guest: boolean
}
```

`PlayerSearchResult` becomes (the legacy `/players/search` dict already sends `skill_level`; the type just never declared it):

```ts
export interface PlayerSearchResult {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  skill_level?: number | null
  level_verified?: boolean
  level_reliability?: number | null
}
```

`PlayerMe` becomes:

```ts
export interface PlayerMe {
  player_id: string
  first_name: string | null
  last_name: string | null
  contact_number: string | null
  email?: string | null
  skill_level: number | null
  skill_tier?: 'bronze' | 'silver' | 'gold' | null
  avatar_url?: string | null
  /** absent on a backend that predates the verified-level fields → describeLevel → `unknown` */
  level_verified?: boolean
  level_reliability?: number | null
}
```

- [ ] **Step 2: Type the PATCH response**

`PATCH /rally/v1/players/` returns the updated profile (the same shape as `GET /players/me`). In `src/services/api/profile.ts` change

```ts
export async function updateProfile(data: ProfileUpdateRequest): Promise<ApiResponse<unknown>> {
```

to

```ts
/** Returns the updated profile — the reveal dialog on EditProfilePage reads the engine's
    fresh `level_verified` / `level_reliability` from it instead of guessing. */
export async function updateProfile(data: ProfileUpdateRequest): Promise<ApiResponse<PlayerMe>> {
```

and make sure `PlayerMe` is in the file's `import type { … } from '@/types/api'` line (it already imports `PlayerMe` for `getMyPlayerProfile`; if not, add it).

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: clean. (Optional fields break nothing; `EditProfilePage` still treats the result as opaque until Task 12.)

- [ ] **Step 4: Commit**

```bash
git add src/types/api.ts src/services/api/profile.ts
git commit -m "feat(level): level_verified / level_reliability on PlayerMe, participants, search; type the PATCH response"
```

---

### Task 7: Navbar pill

**Files:**
- Modify: `src/components/layout/Navbar.tsx` (imports near `:28-30`; the pill at `:254-263`)
- Test: `src/components/layout/Navbar.test.tsx` (existing; its mock has `skill_tier: null`, so the pill is hidden and nothing changes — the test only needs to keep passing)

- [ ] **Step 1: Import the kit**

After `import { cn } from '@/lib/utils'` add:

```ts
import { describeLevel, LevelChip } from '@/components/players/level'
```

- [ ] **Step 2: Replace the pill**

The current block (`:254-263`):

```tsx
                          {skillTier && (
                            <span
                              className={cn(
                                'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-slate-900',
                                TIER_COLOR_CLASS[skillTier],
                              )}
                            >
                              <Medal size={11} />
                              {`${skillTier.toUpperCase()}${skillLevel != null ? ` · ${skillLevel}` : ''}`}
                            </span>
                          )}
```

becomes — the tier pill stays the tier channel (medal + word on the tier colour); the level moves out of it into a `LevelChip sm` beside it, so the lime number and the seal never sit on a yellow/silver disc:

```tsx
                          {skillTier && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-slate-900',
                                  TIER_COLOR_CLASS[skillTier],
                                )}
                              >
                                <Medal size={11} />
                                {skillTier.toUpperCase()}
                              </span>
                              <LevelChip
                                descriptor={describeLevel(skillLevel, playerProfile?.level_verified, playerProfile?.level_reliability)}
                                size="sm"
                              />
                            </div>
                          )}
```

`skillLevel` (`:131`) stays as is — it is `playerProfile?.skill_level ?? null`.

- [ ] **Step 3: Run the Navbar test and lint the file**

Run: `npx vitest run src/components/layout/Navbar.test.tsx && npx eslint src/components/layout/Navbar.tsx`
Expected: PASS; eslint clean (if `skillLevel` is now flagged unused anywhere, it is not — it feeds `describeLevel`).

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat(level): navbar pill shows the tier word and a LevelChip beside it"
```

---

### Task 8: `/network` PlayerStatsTab — self vs others

**Files:**
- Modify: `src/features/playerGlobe/components/PlayerStatsTab.tsx:1-32`
- Modify: `src/features/playerGlobe/__tests__/PlayerStatsTab.test.tsx`
- Depends on: Task 10's `GlobeNode.levelVerified` / `levelReliability` fields? **No** — this task reads them as optional; Task 10 adds them to the type. To keep this task compiling on its own, Step 2 adds the two optional fields to `GlobeNode` now, and Task 10 wires the payload.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/playerGlobe/__tests__/PlayerStatsTab.test.tsx`. At the top, after the existing imports, add a mutable session mock (the tab now reads the viewer's own profile for the self card; without the mock `useAppSession()` throws):

```tsx
import type { PlayerMe } from '@/types/api'

const session: { playerProfile: PlayerMe | null } = { playerProfile: null }
vi.mock('@/hooks/useAppSession', () => ({
  useAppSession: () => ({ status: 'ready', playerProfile: session.playerProfile }),
}))
```

(`vi.mock` is hoisted; the factory reads `session` lazily at call time, which is fine because the object exists before any render.)

Change the node fixture to carry the new fields:

```tsx
const node: GlobeNode = {
  id: 'p1', name: 'Dana Levi', avatarUrl: null, skillLevel: 3.5, skillTier: 'silver',
  levelVerified: false, levelReliability: 40,
  club: { id: 'c', name: 'Rally TLV', city: 'Tel Aviv' }, matches: 12, winRate: 58, since: 2024,
}
```

In `beforeEach`, add `session.playerProfile = null`. Then append a new `describe`:

```tsx
describe('PlayerStatsTab — level', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fetchPublicPlayerStats').mockResolvedValue(career)
    vi.spyOn(api, 'fetchFullPlayerStats').mockRejectedValue({ status: 404, isNotFound: true })
  })

  it("another player: a large LevelChip and the status line, no ring, no explainer link", async () => {
    renderTab('me')
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    const chip = screen.getByTestId('level-chip')
    expect(chip).toHaveAttribute('data-state', 'unverified')
    expect(screen.getByText('3.50')).toBeInTheDocument()
    expect(screen.getByText('Not verified yet')).toBeInTheDocument()
    expect(screen.getByText(/level reliability/).textContent).toBe('⁦40%⁩ level reliability')
    expect(screen.queryByTestId('reliability-ring')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /how is my level calculated/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Level 3\.5$/)).not.toBeInTheDocument()
  })

  it('the viewer themself: the ring from their own profile, the status line, and the explainer', async () => {
    session.playerProfile = {
      player_id: 'p1', first_name: 'Dana', last_name: 'Levi', contact_number: null,
      skill_level: 3.75, skill_tier: 'silver', level_verified: true, level_reliability: 91,
    }
    renderTab('p1')
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    const ring = screen.getByTestId('reliability-ring')
    expect(ring).toHaveAccessibleName('3.75') // the profile, not the (staler) node
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByText(/level reliability/).textContent).toBe('⁦91%⁩ level reliability')
    expect(screen.getByText(/Keep playing — level reliability fades after 3 months/)).toBeInTheDocument()
    expect(screen.queryByTestId('level-chip')).not.toBeInTheDocument()
    screen.getByRole('button', { name: /how is my level calculated/i }).click()
    expect(await screen.findByRole('dialog')).toHaveTextContent('How your level works')
  })

  it('the viewer themself in the hysteresis band: still Verified, but the fading hint', async () => {
    session.playerProfile = {
      player_id: 'p1', first_name: 'Dana', last_name: 'Levi', contact_number: null,
      skill_level: 3.75, skill_tier: 'silver', level_verified: true, level_reliability: 80,
    }
    renderTab('p1')
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByText(/slipping/)).toBeInTheDocument()
    expect(screen.getByTestId('ring-fill')).toHaveAttribute('stroke', '#ccff00')
  })

  it('the viewer themself with no profile loaded yet falls back to the node', async () => {
    renderTab('p1')
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(screen.getByTestId('reliability-ring')).toHaveAccessibleName('3.50')
    expect(screen.getByText(/Every rated match sharpens your level/)).toBeInTheDocument()
  })

  it('a node without the fields (older backend) shows a plain number and no status line', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <PlayerStatsTab node={{ ...node, levelVerified: undefined, levelReliability: null }} viewerId="me" />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(screen.getByTestId('level-chip')).toHaveAttribute('data-state', 'unknown')
    expect(screen.queryByTestId('level-status-line')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Add the optional fields to `GlobeNode`**

In `src/features/playerGlobe/types.ts`, after `skillTier: SkillTier | null` (`:22`) add:

```ts
  /** verified-level fields (spec §12). Optional: a payload from an older backend must still
      parse and render — a missing flag is the `unknown` state, never "not verified". */
  levelVerified?: boolean
  levelReliability?: number | null
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/features/playerGlobe/__tests__/PlayerStatsTab.test.tsx`
Expected: the five new tests FAIL (no `level-chip` / `reliability-ring` test ids; "Level 3.5" is still rendered); the four existing tests still PASS.

- [ ] **Step 4: Rewrite the top of `PlayerStatsTab.tsx`**

Replace lines 1–32 (imports through the closing of the `node.skillLevel != null && (…)` chip block) with:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useAppSession } from '@/hooks/useAppSession'
import { Avatar } from '@/components/tournaments/Avatar'
import { PlayerCareerStats } from '@/components/players/PlayerCareerStats'
import { SkillHistoryChart } from '@/components/players/SkillHistoryChart'
import {
  describeLevel,
  INACTIVITY_GRACE_MONTHS,
  LevelChip,
  LevelExplainerSheet,
  LevelStatusLine,
  ReliabilityRing,
  VERIFIED_RELIABILITY_THRESHOLD,
  type LevelDescriptor,
} from '@/components/players/level'
import { usePlayerFullStats, usePublicPlayerStats } from '../hooks/usePlayerStats'
import type { GlobeNode } from '../types'

/** Spec §6: the one-line hint under the owner's status, by state. `verified` below the notch is
    the hysteresis band — the seal is still held but fading, and that is the one message worth
    a sentence. `unknown` gets none: an older backend made no claim, so neither do we. */
function hintKey(level: LevelDescriptor): string | null {
  switch (level.state) {
    case 'none':
      return 'level.hintNone'
    case 'unverified':
      return 'level.hintUnverified'
    case 'verified':
      return level.reliability != null && level.reliability < VERIFIED_RELIABILITY_THRESHOLD
        ? 'level.hintVerifiedFading'
        : 'level.hintVerified'
    default:
      return null
  }
}

export interface PlayerStatsTabProps {
  node: GlobeNode
  /** the signed-in viewer's id, only once their own player profile is ready; the full
      stats are only requested for a viewer in that state (see usePlayerFullStats) */
  viewerId: string | null
}

/** The card's Stats tab: the level block, the public career block, then — for players in the
    viewer's network — the level chart, top partners and top clubs; the full-page link last.

    The level block is the owner's card when the viewer opens themself (spec §6): the
    reliability ring, the status line and the explainer, fed by their own profile — fresher
    than the network payload, which is cached for everyone. Anyone else gets the large chip
    and the status line; the percentage is allowed there (spec decision 2). */
export function PlayerStatsTab({ node, viewerId }: PlayerStatsTabProps) {
  const { t } = useTranslation()
  const career = usePublicPlayerStats(node.id)
  const full = usePlayerFullStats(node.id, viewerId)
  const { playerProfile } = useAppSession()
  const [explainerOpen, setExplainerOpen] = useState(false)

  const isSelf = viewerId != null && viewerId === node.id
  const level =
    isSelf && playerProfile
      ? describeLevel(playerProfile.skill_level, playerProfile.level_verified, playerProfile.level_reliability)
      : describeLevel(node.skillLevel, node.levelVerified, node.levelReliability ?? null)
  const hint = hintKey(level)

  return (
    <div className="flex flex-col gap-4">
      {isSelf ? (
        <section className="flex items-center gap-4" aria-label={t('level.yourLevel')}>
          <ReliabilityRing value={level.value} reliability={level.reliability} verified={level.state === 'verified'} className="shrink-0" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <LevelStatusLine descriptor={level} />
            {hint && <p className="text-sm text-rally-text-2">{t(hint, { months: INACTIVITY_GRACE_MONTHS })}</p>}
            <button
              type="button"
              onClick={() => setExplainerOpen(true)}
              className="self-start text-sm font-bold text-rally-accent hover:text-rally-accent-hover"
            >
              {t('level.howCalculated')}
            </button>
          </div>
          <LevelExplainerSheet open={explainerOpen} onOpenChange={setExplainerOpen} />
        </section>
      ) : (
        level.state !== 'none' && (
          <div className="flex flex-col gap-1.5">
            <LevelChip descriptor={level} size="lg" />
            <LevelStatusLine descriptor={level} />
          </div>
        )
      )}
```

Everything from `{career.isPending && (` onward is unchanged.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/features/playerGlobe/__tests__/PlayerStatsTab.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 6: Run the rest of the globe suite — `PlayerCard` and `PlayerNetworkPage` render this tab**

Run: `npx vitest run src/features/playerGlobe`
Expected: PASS. If `PlayerCard.test.tsx` or `PlayerNetworkPage.test.tsx` now fail with `useAppSession must be used inside <AppSessionProvider>`, add the same `vi.mock('@/hooks/useAppSession', …)` block to that file (`PlayerNetworkPage.test.tsx` already mocks it — check with `rtk proxy grep -n useAppSession src/features/playerGlobe/__tests__/PlayerCard.test.tsx`).

- [ ] **Step 7: Commit**

```bash
git add src/features/playerGlobe/components/PlayerStatsTab.tsx src/features/playerGlobe/__tests__/PlayerStatsTab.test.tsx src/features/playerGlobe/types.ts
git commit -m "feat(network): owner ring + status on the viewer's own card, LevelChip lg for others; drop network.levelChip usage"
```

---

### Task 9: `ParticipantsSection` — `LevelChip sm`

**Files:**
- Modify: `src/components/tournaments/ParticipantsSection.tsx:1-30`
- Modify: `src/components/tournaments/ParticipantsSection.test.tsx:153-158`

- [ ] **Step 1: Update the existing assertion and add a seal test**

In `ParticipantsSection.test.tsx`, the test at `:153` becomes:

```tsx
  it('guest gets no skill numeral, even when skill_level is set', () => {
    mockData.current = data(1)
    renderSection()
    expect(screen.getByText('3.50')).toBeInTheDocument() // player_1's chip
    expect(screen.queryByText('4.00')).not.toBeInTheDocument() // guest player_2's, suppressed
    expect(screen.queryByText('4.0')).not.toBeInTheDocument()
  })

  it('a verified participant gets the seal; an unverified one the dashed pill; an old payload a plain number', () => {
    const d = data(3)
    d.items[0].player_1 = { ...d.items[0].player_1, level_verified: true, level_reliability: 90 }
    d.items[1].player_1 = { ...d.items[1].player_1, level_verified: false, level_reliability: 30 }
    // items[2].player_1 has neither field → unknown
    mockData.current = d
    renderSection()
    const chips = screen.getAllByTestId('level-chip')
    expect(chips.map((c) => c.getAttribute('data-state'))).toEqual(['verified', 'unverified', 'unknown'])
    expect(screen.getAllByRole('img', { name: 'Verified level' })).toHaveLength(1)
    // sm chips never print the "Not verified" word — the row is too narrow (spec §5.3)
    expect(screen.queryByText('Not verified')).not.toBeInTheDocument()
  })
```

`data(3)` renders three pairs; `INITIAL_VISIBLE` is 3, so all three are visible without expanding.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/tournaments/ParticipantsSection.test.tsx`
Expected: the two tests FAIL (`3.5` is rendered, not `3.50`; no `level-chip` test id).

- [ ] **Step 3: Swap the numeral for the chip**

In `ParticipantsSection.tsx`, after `import { Avatar } from './Avatar'` add:

```ts
import { describeLevel, LevelChip } from '@/components/players/level'
```

and replace the numeral block (`:24-28`):

```tsx
      {!player.is_guest && player.skill_level != null && (
        <span dir="ltr" className="shrink-0 text-xs font-semibold text-rally-accent tabular-nums">
          {player.skill_level.toFixed(1)}
        </span>
      )}
```

with

```tsx
      {/* Guests have no rating; a member without a level gets nothing rather than an em dash
          in a list. The chip itself decides seal / dashed pill / plain (spec §5.3, §7). */}
      {!player.is_guest && player.skill_level != null && (
        <LevelChip
          descriptor={describeLevel(player.skill_level, player.level_verified, player.level_reliability)}
          size="sm"
          className="shrink-0"
        />
      )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/tournaments/ParticipantsSection.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/tournaments/ParticipantsSection.tsx src/components/tournaments/ParticipantsSection.test.tsx
git commit -m "feat(tournaments): participants list shows LevelChip sm instead of the bare numeral"
```

---

### Task 10: Globe — payload fields, dashed rim, tooltip chip

**Files:**
- Modify: `src/features/playerGlobe/api/network.ts:8-18` (nodeSchema), `:39-49` (mapper)
- Modify: `src/features/playerGlobe/__tests__/network.test.ts`
- Modify: `src/features/playerGlobe/lib/avatarTexture.ts`
- Create: `src/features/playerGlobe/__tests__/avatarTexture.test.ts`
- Modify: `src/features/playerGlobe/scene/GlobeScene.ts:17`, `:241-246`
- Modify: `src/features/playerGlobe/components/PlayerGlobe.tsx:1-7`, `:88-97`

(`GlobeNode` already has the optional fields from Task 8 Step 2.)

- [ ] **Step 1: Extend the network schema test**

In `network.test.ts`, change the first expectation (`:23-26`) to include the mapped null:

```ts
    expect(graph.nodes[0]).toEqual({
      id: 'a', name: 'Ada Lovelace', avatarUrl: null, skillLevel: 4, skillTier: 'gold',
      levelReliability: null,
      club: { id: 'c1', name: 'Rally Tel Aviv', city: 'Tel Aviv' }, matches: 3, winRate: 67, since: 2025,
    })
```

(`toEqual` ignores an `undefined` `levelVerified`, so the fixture without the fields still matches.) Then add inside the same `describe`:

```ts
  it('carries level_verified / level_reliability when the backend sends them, and tolerates their absence', () => {
    const withFields = {
      ...payload,
      nodes: [{ ...payload.nodes[0], level_verified: true, level_reliability: 91 }, payload.nodes[1]],
    }
    const graph = toGlobeGraph(networkPayloadSchema.parse(withFields))
    expect(graph.nodes[0].levelVerified).toBe(true)
    expect(graph.nodes[0].levelReliability).toBe(91)
    expect(graph.nodes[1].levelVerified).toBeUndefined()
    expect(graph.nodes[1].levelReliability).toBeNull()
  })

  it('rejects a reliability outside 0–100', () => {
    const bad = { ...payload, nodes: [{ ...payload.nodes[0], level_reliability: 101 }] }
    expect(() => networkPayloadSchema.parse(bad)).toThrow()
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/features/playerGlobe/__tests__/network.test.ts`
Expected: FAIL — `levelReliability` missing from the mapped node; `level_reliability: 101` is not rejected (zod strips unknown keys and the field isn't declared yet).

- [ ] **Step 3: Schema and mapper**

In `network.ts` add to `nodeSchema` after `skill_tier`:

```ts
  // Verified-level fields (rally-api plan Task 4). Optional so a payload from an older
  // backend still parses; the mapper turns an absent flag into `undefined` = `unknown`.
  level_verified: z.boolean().optional(),
  level_reliability: z.number().int().min(0).max(100).nullable().optional(),
```

and in `toGlobeGraph` after `skillTier: n.skill_tier,`:

```ts
      levelVerified: n.level_verified,
      levelReliability: n.level_reliability ?? null,
```

- [ ] **Step 4: Run the schema test to verify it passes**

Run: `npx vitest run src/features/playerGlobe/__tests__/network.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing texture test**

`avatarTexture` draws on a real canvas; jsdom has no 2D context (`getContext` returns null → the function throws). The test stubs `getContext` with a recording fake and mocks `three` so no WebGL is touched.

```ts
// src/features/playerGlobe/__tests__/avatarTexture.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('three', () => ({
  CanvasTexture: class {
    minFilter = 0
    constructor(public canvas: unknown) {}
  },
  LinearFilter: 1006,
}))

import { avatarTexture } from '../lib/avatarTexture'

type Call = [string, unknown[]]

function fakeContext() {
  const calls: Call[] = []
  const record = (name: string) => (...args: unknown[]) => { calls.push([name, args]) }
  const ctx = {
    calls,
    createRadialGradient: () => ({ addColorStop: () => {} }),
    fillRect: record('fillRect'),
    save: record('save'),
    beginPath: record('beginPath'),
    arc: record('arc'),
    closePath: record('closePath'),
    clip: record('clip'),
    drawImage: record('drawImage'),
    fillText: record('fillText'),
    restore: record('restore'),
    stroke: record('stroke'),
    setLineDash: record('setLineDash'),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    filter: '',
    font: '',
    textAlign: '',
    textBaseline: '',
  }
  return ctx
}

afterEach(() => vi.restoreAllMocks())

describe('avatarTexture', () => {
  it('solid rim by default: no dash pattern is set', () => {
    const ctx = fakeContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    avatarTexture(null, '#ccff00', 'DL', false)
    expect(ctx.calls.some(([name]) => name === 'setLineDash')).toBe(false)
    expect(ctx.calls.filter(([name]) => name === 'stroke')).toHaveLength(1)
  })

  it('dashed rim for an unverified level: 18 dashes around the rim circumference', () => {
    const ctx = fakeContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    avatarTexture(null, '#ccff00', 'DL', true)
    const dash = ctx.calls.find(([name]) => name === 'setLineDash')
    expect(dash).toBeDefined()
    const [on, off] = (dash![1][0] as number[])
    const circumference = 2 * Math.PI * (224 * 0.29 + 3)
    expect(on + off).toBeCloseTo(circumference / 18, 5)
    expect(on).toBeGreaterThan(off) // more rim than gap: it still reads as a rim
    // the dash is set before the rim stroke, not after
    const dashIdx = ctx.calls.findIndex(([name]) => name === 'setLineDash')
    const strokeIdx = ctx.calls.findIndex(([name]) => name === 'stroke')
    expect(dashIdx).toBeLessThan(strokeIdx)
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/features/playerGlobe/__tests__/avatarTexture.test.ts`
Expected: FAIL — TypeScript/`tsc` is not involved at vitest time, so the first test may pass by accident (the 4th argument is ignored); the second FAILS: `setLineDash` never called.

- [ ] **Step 7: Add the `dashed` parameter**

In `avatarTexture.ts`, change the signature and doc comment:

```ts
/** A player's node texture: a circular portrait — or their initials on a tinted disc when
    there is no photo — with a rim in the tier colour and a baked glow falloff. The portrait
    fills NODE_PORTRAIT_FRACTION of the canvas. `dashed` breaks the rim into 18 dashes: the
    globe's "not verified yet" mark (spec §7) — the same dashed-outline idea as the ghost seal,
    at a size where a seal itself would be a smudge. */
export function avatarTexture(img: HTMLImageElement | null, ringColor: string, initials: string, dashed: boolean): CanvasTexture {
```

and replace the rim block at the end:

```ts
  ctx.beginPath()
  ctx.arc(c, c, r + 3, 0, Math.PI * 2)
  ctx.lineWidth = 6
  ctx.strokeStyle = ringColor
  ctx.stroke()
```

with

```ts
  ctx.beginPath()
  ctx.arc(c, c, r + 3, 0, Math.PI * 2)
  ctx.lineWidth = 6
  ctx.strokeStyle = ringColor
  if (dashed) {
    // 18 periods around the rim; 62 % on so it still reads as a rim from far away
    const period = (2 * Math.PI * (r + 3)) / 18
    ctx.setLineDash([period * 0.62, period * 0.38])
  }
  ctx.stroke()
```

- [ ] **Step 8: Run the texture test to verify it passes**

Run: `npx vitest run src/features/playerGlobe/__tests__/avatarTexture.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Pass the flag from the scene**

In `GlobeScene.ts`, after `import { avatarTexture } from '../lib/avatarTexture'` (`:17`) add:

```ts
import { describeLevel } from '@/components/players/level/describeLevel'
```

(the deep import, not the barrel — the barrel pulls React components into a non-React module; `describeLevel.ts` is pure.)

Replace `:246`:

```ts
      material.map = avatarTexture(img, color, initialsOf(node.name))
```

with

```ts
      const unverified = describeLevel(node.skillLevel, node.levelVerified, node.levelReliability ?? null).state === 'unverified'
      material.map = avatarTexture(img, color, initialsOf(node.name), unverified)
```

- [ ] **Step 10: The tooltip chip**

In `PlayerGlobe.tsx` add after `import { cn } from '@/lib/utils'`:

```ts
import { describeLevel, LevelChip } from '@/components/players/level'
```

Replace the `<small …>` block (`:88-97`):

```tsx
          <small className="mt-0.5 block text-[10.5px] text-rally-text-2">
            {hovered.club
              ? t('network.tooltipMeta', {
                  partners: index.partnerCount(hovered.id),
                  rivals: index.rivalsOf.get(hovered.id)?.length ?? 0,
                  city: hovered.club.city,
                })
              : t('network.tooltipMetaNoCity', {
                  partners: index.partnerCount(hovered.id),
                  rivals: index.rivalsOf.get(hovered.id)?.length ?? 0,
                })}
          </small>
```

with

```tsx
          <small className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-rally-text-2">
            {hovered.skillLevel != null && (
              <LevelChip descriptor={describeLevel(hovered.skillLevel, hovered.levelVerified, hovered.levelReliability ?? null)} size="sm" />
            )}
            <span>
              {hovered.club
                ? t('network.tooltipMeta', {
                    partners: index.partnerCount(hovered.id),
                    rivals: index.rivalsOf.get(hovered.id)?.length ?? 0,
                    city: hovered.club.city,
                  })
                : t('network.tooltipMetaNoCity', {
                    partners: index.partnerCount(hovered.id),
                    rivals: index.rivalsOf.get(hovered.id)?.length ?? 0,
                  })}
            </span>
          </small>
```

- [ ] **Step 11: Typecheck, run the globe suite, lint**

Run: `npx tsc -b && npx vitest run src/features/playerGlobe && npx eslint src/features/playerGlobe`
Expected: clean; all PASS. `tsc` is the check that every `avatarTexture(...)` call now passes four arguments — the only caller is `GlobeScene.ts:246`.

- [ ] **Step 12: Look at it**

Run `npm run dev`, open `http://localhost:5174/network` against a rally-api that serves the new fields. Hover a node: the tooltip's meta line starts with the chip. Nodes whose level is unverified have a dashed rim. If the backend isn't up, this step is skipped and noted in the commit body — the tests above cover the logic; only the visual weight of the dashes is unverified.

- [ ] **Step 13: Commit**

```bash
git add src/features/playerGlobe/api/network.ts src/features/playerGlobe/__tests__/network.test.ts src/features/playerGlobe/lib/avatarTexture.ts src/features/playerGlobe/__tests__/avatarTexture.test.ts src/features/playerGlobe/scene/GlobeScene.ts src/features/playerGlobe/components/PlayerGlobe.tsx
git commit -m "feat(network): verified-level fields on the payload, dashed rim for unverified nodes, LevelChip in the tooltip"
```

---

### Task 11: Partner search rows — `LevelChip sm`

**Files:**
- Modify: `src/components/tournaments/PartnerSection.tsx:1-9`, `:158-165`
- Modify: `src/components/tournaments/PartnerSection.test.tsx:27-45`

- [ ] **Step 1: Extend the existing search test and add a chip test**

In `PartnerSection.test.tsx`, the first test's fixture (`:30`) becomes:

```ts
      results: [{ id: 'p-1', first_name: 'Dana', last_name: 'Levi', avatar_url: null, skill_level: 4.5, level_verified: true, level_reliability: 90 }],
```

(the `onPartnerChange` expectation is unchanged — the partner object carries no level.) Add after it:

```tsx
  it('shows a LevelChip on a search row when the result carries a level, nothing when it does not', () => {
    mockUsePlayerSearch.mockReturnValue({
      results: [
        { id: 'p-1', first_name: 'Dana', last_name: 'Levi', avatar_url: null, skill_level: 4.5, level_verified: true, level_reliability: 90 },
        { id: 'p-2', first_name: 'Noa', last_name: 'Cohen', avatar_url: null },
      ],
      isLoading: false,
      isActive: true,
    })
    renderSection({ phase: 'idle' })
    expect(screen.getByText('4.50')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Verified level' })).toBeInTheDocument()
    expect(screen.getAllByTestId('level-chip')).toHaveLength(1)
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/tournaments/PartnerSection.test.tsx`
Expected: the new test FAILS (`4.50` not found); the first still passes.

- [ ] **Step 3: Add the chip to the row**

In `PartnerSection.tsx` after `import { Button } from '@/components/ui/button'` add:

```ts
import { describeLevel, LevelChip } from '@/components/players/level'
```

Replace the row's text column (`:158-165`):

```tsx
                <div className="min-w-0 flex-1">
                  <p className="text-rally-text font-semibold text-sm truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-rally-text-muted">
                    {t('tournament.partnerBadgeRally')}
                  </p>
                </div>
```

with

```tsx
                <div className="min-w-0 flex-1">
                  <p className="text-rally-text font-semibold text-sm truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-rally-text-muted">
                    {t('tournament.partnerBadgeRally')}
                  </p>
                </div>
                {player.skill_level != null && (
                  <LevelChip
                    descriptor={describeLevel(player.skill_level, player.level_verified, player.level_reliability)}
                    size="sm"
                    className="shrink-0"
                  />
                )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/tournaments/PartnerSection.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/tournaments/PartnerSection.tsx src/components/tournaments/PartnerSection.test.tsx
git commit -m "feat(tournaments): partner search rows show the candidate's LevelChip"
```

---

### Task 12: `EditProfilePage` — current level, warning, confirm gate, reveal

**Files:**
- Modify: `src/pages/EditProfilePage.tsx` (imports `:1-23`; state near `:96-106`; mutation `:130-195`; `onSubmit` `:197-212`; the skill Card `:341-355`; dialogs after the closing `</form>`)
- Modify: `src/pages/EditProfilePage.test.tsx` (new `describe` at the end)

Spec §9: the slider stays. Above it, the current level (chip + status line) so the player sees what they are about to replace; under the section title, one sentence saying what a new declaration does. Submitting a changed level on a **verified** profile opens a confirm dialog first. After any save that changed the level (edit mode), a reveal dialog shows the new level with its ring — the same moment mobile's `LevelRevealScreen` owns.

- [ ] **Step 1: Write the failing tests**

Append to `EditProfilePage.test.tsx`:

```tsx
describe('EditProfilePage — verified level: warning, confirm, reveal', () => {
  const VERIFIED_PROFILE: PlayerMe = { ...READY_PROFILE, level_verified: true, level_reliability: 91 }
  const UNVERIFIED_PROFILE: PlayerMe = { ...READY_PROFILE, level_verified: false, level_reliability: 40 }

  function saved(profile: PlayerMe) {
    return vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({
      success: true, data: profile, meta: null, error: null,
    } as any)
  }

  it('shows the current level with its status and the verified warning', () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = VERIFIED_PROFILE
    renderPage()
    expect(screen.getByTestId('level-chip')).toHaveAttribute('data-state', 'verified')
    expect(screen.getByText('4.20')).toBeInTheDocument()
    expect(screen.getByText(/level reliability/).textContent).toBe('⁦91%⁩ level reliability')
    expect(screen.getByText(/removes your verified seal/)).toBeInTheDocument()
  })

  it('shows the unverified warning for an unverified profile, and no level block on create', () => {
    sessionState.status = 'ready'
    sessionState.playerProfile = UNVERIFIED_PROFILE
    const { unmount } = renderPage()
    expect(screen.getByTestId('level-chip')).toHaveAttribute('data-state', 'unverified')
    expect(screen.getByText(/resets its reliability/)).toBeInTheDocument()
    unmount()
    sessionState.status = 'profile_incomplete'
    sessionState.playerProfile = null
    renderPage()
    expect(screen.queryByTestId('level-chip')).not.toBeInTheDocument()
    expect(screen.queryByText(/resets its reliability/)).not.toBeInTheDocument()
  })

  it('a verified profile: moving the slider and saving asks first; "Keep" saves nothing', async () => {
    const user = userEvent.setup()
    sessionState.status = 'ready'
    sessionState.playerProfile = VERIFIED_PROFILE
    const updateSpy = saved({ ...VERIFIED_PROFILE, skill_level: 5.5, level_verified: false, level_reliability: 0 })
    renderPage()
    fireEvent.change(screen.getByLabelText(/skill level slider/i), { target: { value: '5.5' } })
    const save = await screen.findByRole('button', { name: /save changes/i })
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Give up your verified seal?')
    expect(dialog).toHaveTextContent('Your level ⁦4.20⁩ is verified at ⁦91%⁩ level reliability')
    expect(updateSpy).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /keep my verified level/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(updateSpy).not.toHaveBeenCalled()
    updateSpy.mockRestore()
  })

  it('"Reassess anyway" saves, then reveals the new level with its ring', async () => {
    const user = userEvent.setup()
    sessionState.status = 'ready'
    sessionState.playerProfile = VERIFIED_PROFILE
    const updateSpy = saved({ ...VERIFIED_PROFILE, skill_level: 5.5, level_verified: false, level_reliability: 0 })
    renderPage()
    fireEvent.change(screen.getByLabelText(/skill level slider/i), { target: { value: '5.5' } })
    const save = await screen.findByRole('button', { name: /save changes/i })
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)
    await user.click(await screen.findByRole('button', { name: /reassess anyway/i }))
    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith({ skill_level: 5.5 }))
    const reveal = await screen.findByRole('dialog')
    expect(reveal).toHaveTextContent('Your new level')
    expect(screen.getByTestId('reliability-ring')).toHaveAccessibleName('5.50')
    expect(screen.queryByTestId('ring-fill')).not.toBeInTheDocument() // 0 %: track only
    expect(reveal).toHaveTextContent('Not verified yet')
    await user.click(screen.getByRole('button', { name: /^done$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    updateSpy.mockRestore()
  })

  it('an unverified profile saves a new level without asking, and still reveals it', async () => {
    const user = userEvent.setup()
    sessionState.status = 'ready'
    sessionState.playerProfile = UNVERIFIED_PROFILE
    const updateSpy = saved({ ...UNVERIFIED_PROFILE, skill_level: 5.5, level_reliability: 0 })
    renderPage()
    fireEvent.change(screen.getByLabelText(/skill level slider/i), { target: { value: '5.5' } })
    const save = await screen.findByRole('button', { name: /save changes/i })
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)
    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith({ skill_level: 5.5 }))
    expect(screen.queryByText('Give up your verified seal?')).not.toBeInTheDocument()
    expect(await screen.findByRole('dialog')).toHaveTextContent('Your new level')
    updateSpy.mockRestore()
  })

  it('a name-only change on a verified profile neither asks nor reveals', async () => {
    const user = userEvent.setup()
    sessionState.status = 'ready'
    sessionState.playerProfile = VERIFIED_PROFILE
    const updateSpy = saved({ ...VERIFIED_PROFILE, first_name: 'Dani' })
    renderPage()
    const first = screen.getByLabelText(/first name/i)
    await user.clear(first)
    await user.type(first, 'Dani')
    const save = await screen.findByRole('button', { name: /save changes/i })
    await waitFor(() => expect(save).not.toBeDisabled())
    await user.click(save)
    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith({ first_name: 'Dani' }))
    await screen.findByText(/profile updated/i)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    updateSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/pages/EditProfilePage.test.tsx -t "verified level"`
Expected: 6 FAIL (no `level-chip`, no dialogs). Existing tests untouched.

- [ ] **Step 3: Imports**

Add to the import block of `EditProfilePage.tsx`:

```ts
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { describeLevel, LevelChip, LevelStatusLine, ReliabilityRing, type LevelDescriptor } from '@/components/players/level'
import { ltrIsolate } from '@/lib/bidi'
```

- [ ] **Step 4: State and the current descriptor**

Inside `EditProfileForm`, right after `const isCreate = profile === null`, add:

```ts
  /* Spec §9: what the player is about to replace. `none` (a member who never set a level) and
     create mode show no level block — there is nothing to protect yet. */
  const current = describeLevel(profile?.skill_level, profile?.level_verified, profile?.level_reliability)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<EditProfileFormValues | null>(null)
  const [reveal, setReveal] = useState<LevelDescriptor | null>(null)
```

- [ ] **Step 5: The mutation returns what it saved**

The mutation currently returns `values` (create), `undefined` (nothing to save) or `patch`. It now returns `{ patch, saved }` so `onSuccess` can read the engine's fresh fields off the PATCH response instead of guessing them.

Change the three returns in `mutationFn`:

```ts
        return values
```
→
```ts
        return { patch: values as ProfileUpdateRequest, saved: null as PlayerMe | null }
```

```ts
      if (Object.keys(patch).length === 0) return
```
→
```ts
      if (Object.keys(patch).length === 0) return { patch, saved: null as PlayerMe | null }
```

```ts
      return patch
```
→
```ts
      return { patch, saved: result.data ?? null }
```

and `onSuccess` becomes:

```ts
    onSuccess: ({ patch, saved }) => {
      setStatus({ kind: 'success' })
      void queryClient.invalidateQueries({ queryKey: ['onboarding-status'] })
      void queryClient.invalidateQueries({ queryKey: ['player-profile-me'] })
      form.reset({ ...form.getValues(), ...patch } as EditProfileFormValues)
      /* A level change in edit mode gets the reveal (spec §9.4): the new number in the ring,
         reliability as the engine now reports it. The PATCH response carries the fresh fields;
         an older backend that omits them yields `unknown`, and the dialog still shows the
         number. Create mode is the onboarding path — mobile owns that reveal; on the web the
         redirect back to the tournament is the moment. */
      if (!isCreate && patch.skill_level !== undefined) {
        setReveal(describeLevel(saved?.skill_level ?? patch.skill_level, saved?.level_verified, saved?.level_reliability))
        return
      }
      if (returnTo) navigate(returnTo)
    },
```

Note the `returnTo` navigation moves behind the reveal: the "Done" button performs it (Step 8), so a player sent here from a tournament still lands back on it — after seeing their level.

- [ ] **Step 6: Intercept the submit**

In `onSubmit`, replace the final `mutation.mutate(values)` with:

```ts
    if (dirty.skill_level && current.state === 'verified') {
      // Spec §9.2: a verified level is earned; replacing it is a real loss — ask first.
      setPendingValues(values)
      setConfirmOpen(true)
      return
    }
    mutation.mutate(values)
```

- [ ] **Step 7: The skill Card**

Replace the Card (`:341-355`):

```tsx
        <Card className="p-4 bg-rally-surface border-white/10">
          <h2 className="text-base font-semibold mb-3 text-rally-text">
            {t('edit_profile.section_skill')}
          </h2>
          <Controller
            control={form.control}
            name="skill_level"
            render={({ field }) => (
              <SkillLevelSlider
                value={field.value ?? SKILL_DEFAULT}
                onChange={field.onChange}
              />
            )}
          />
        </Card>
```

with

```tsx
        <Card className="p-4 bg-rally-surface border-white/10">
          <h2 className="text-base font-semibold mb-3 text-rally-text">
            {t('edit_profile.section_skill')}
          </h2>
          {!isCreate && current.state !== 'none' && (
            <div className="mb-4 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <LevelChip descriptor={current} size="lg" />
                <LevelStatusLine descriptor={current} />
              </div>
              {current.state !== 'unknown' && (
                <p className="text-sm text-rally-text-2">
                  {current.state === 'verified' ? t('level.warnVerified') : t('level.warnUnverified')}
                </p>
              )}
            </div>
          )}
          <Controller
            control={form.control}
            name="skill_level"
            render={({ field }) => (
              <SkillLevelSlider
                value={field.value ?? SKILL_DEFAULT}
                onChange={field.onChange}
              />
            )}
          />
        </Card>
```

- [ ] **Step 8: The two dialogs**

`EditProfileForm` returns a single `<form>`. Wrap the return in a fragment and add both dialogs after the form:

```tsx
  return (
    <>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
      … (unchanged) …
    </form>

      {/* Spec §9.2 — the confirm gate. Keep is the primary action: the verified level is the
          thing worth protecting, so it gets the lime. */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) setPendingValues(null)
        }}
      >
        <DialogContent className="max-w-sm rounded-3xl bg-rally-surface border-rally-border">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="font-display text-xl font-black text-rally-text">{t('level.confirmTitle')}</DialogTitle>
            <DialogDescription className="text-rally-text-2">
              {t('level.confirmBody', {
                level: ltrIsolate(current.value ?? '—'),
                pct: ltrIsolate(`${current.reliability ?? 0}%`),
                startPct: ltrIsolate('0%'),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false)
                setPendingValues(null)
              }}
              className="h-11 px-5 rounded-full bg-rally-accent text-rally-accent-text font-bold hover:bg-rally-accent-hover"
            >
              {t('level.confirmKeep')}
            </button>
            <button
              type="button"
              onClick={() => {
                const values = pendingValues
                setConfirmOpen(false)
                setPendingValues(null)
                if (values) mutation.mutate(values)
              }}
              className="h-11 px-5 rounded-full border border-rally-border text-rally-text font-semibold"
            >
              {t('level.confirmProceed')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spec §9.4 — the reveal. One dismiss path (Done); it also finishes the returnTo hop. */}
      <Dialog
        open={reveal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReveal(null)
            if (returnTo) navigate(returnTo)
          }
        }}
      >
        {reveal && (
          <DialogContent className="max-w-sm rounded-3xl bg-rally-surface border-rally-border">
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="font-display text-xl font-black text-rally-text">{t('level.revealNew')}</DialogTitle>
              <DialogDescription className="text-rally-text-2">{t('level.revealBody')}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-2">
              <ReliabilityRing value={reveal.value} reliability={reveal.reliability} verified={reveal.state === 'verified'} />
              <LevelStatusLine descriptor={reveal} className="items-center" />
            </div>
            <DialogFooter className="sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  setReveal(null)
                  if (returnTo) navigate(returnTo)
                }}
                className="h-11 px-6 rounded-full bg-rally-accent text-rally-accent-text font-bold hover:bg-rally-accent-hover"
              >
                {t('level.revealDone')}
              </button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
```

(Indent the existing `<form>` one level to sit inside the fragment, or leave it — prettier is not enforced; eslint is.)

- [ ] **Step 9: Run the new tests**

Run: `npx vitest run src/pages/EditProfilePage.test.tsx`
Expected: all PASS, including the pre-existing suite. Two things that can bite:

- The existing test "saves only skill_level when first_name and last_name are empty" (`:273`) uses `READY_PROFILE` with no `level_verified` → `unknown` → no confirm gate, but it **will** now open the reveal dialog after saving (edit mode, level changed). The test asserts only on `updateSpy`, so it still passes; the open dialog is harmless. If a later test in the same file complains about a leftover dialog, RTL's auto-cleanup between tests unmounts it.
- `DialogContent` renders a top-corner close with an sr-only "Close" label; none of the new tests query for "Close", and the reveal's `Done` regex is anchored (`/^done$/i`).

- [ ] **Step 10: Lint and typecheck**

Run: `npx eslint src/pages/EditProfilePage.tsx src/pages/EditProfilePage.test.tsx && npx tsc -b`
Expected: clean. If `tsc` flags `values as ProfileUpdateRequest` (create branch), `EditProfileFormValues` and `ProfileUpdateRequest` share the same optional keys; the cast is sound because `onSuccess` only spreads it back into the form.

- [ ] **Step 11: Commit**

```bash
git add src/pages/EditProfilePage.tsx src/pages/EditProfilePage.test.tsx
git commit -m "feat(profile): show the current level, warn before replacing it, confirm on a verified level, reveal the new one"
```

---

### Task 13: `/level` page — the Verified level section replaces the K-schedule table

**Files:**
- Modify: `src/pages/LevelPage.tsx:1-28`, `:102-140`
- Modify: `src/i18n/locales/en.json` (remove four `level_page` keys), `src/i18n/locales/he.json` (same)
- Create: `src/pages/LevelPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/LevelPage.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import LevelPage from './LevelPage'

describe('LevelPage', () => {
  it('shows the Verified level section: a three-state legend and the six explainer blocks', () => {
    render(
      <MemoryRouter>
        <LevelPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Verified level' })).toBeInTheDocument()
    const chips = screen.getAllByTestId('level-chip')
    expect(chips.map((c) => c.getAttribute('data-state'))).toEqual(['verified', 'unverified', 'none'])
    expect(screen.getByText('4.25')).toBeInTheDocument()
    expect(screen.getByText('3.50')).toBeInTheDocument()
    for (const title of ['Your level', 'Level reliability', 'Verified', 'What counts', 'Keeping it', 'Tier']) {
      expect(screen.getByRole('heading', { level: 3, name: title })).toBeInTheDocument()
    }
    expect(screen.getByText(/the notch — 86% —/)).toBeInTheDocument()
  })

  it('the old games→influence table is gone', () => {
    render(
      <MemoryRouter>
        <LevelPage />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Matches played')).not.toBeInTheDocument()
    expect(screen.queryByText('Influence of match results')).not.toBeInTheDocument()
    expect(screen.queryByText('~71%')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/pages/LevelPage.test.tsx`
Expected: FAIL — no "Verified level" h2; "Matches played" present. (The tiers table has its own `<th>`s — "Range", "What it means" — not asserted here.)

- [ ] **Step 3: Rewrite the top of `LevelPage.tsx`**

Replace lines 1–28 (imports through `tableWrapClass`) with:

```tsx
import type { LucideIcon } from 'lucide-react'
import { Gauge, Hash, ListChecks, Medal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  describeLevel,
  INACTIVITY_GRACE_MONTHS,
  LevelChip,
  TYPICAL_MATCHES_TO_VERIFY,
  TYPICAL_TOURNAMENTS_TO_VERIFY,
  VerifiedSeal,
  VERIFIED_RELIABILITY_THRESHOLD,
} from '@/components/players/level'

/* The same six blocks as LevelExplainerSheet (spec §10) — this page is the "Read more" target,
   so the two must never disagree; both interpolate the engine constants, never copy numbers. */
const EXPLAINER_BLOCKS: { key: string; icon: LucideIcon | 'seal' | 'ghost'; values?: Record<string, number> }[] = [
  { key: 'level', icon: Hash },
  { key: 'reliability', icon: Gauge },
  {
    key: 'verified',
    icon: 'seal',
    values: { threshold: VERIFIED_RELIABILITY_THRESHOLD, matches: TYPICAL_MATCHES_TO_VERIFY, tournaments: TYPICAL_TOURNAMENTS_TO_VERIFY },
  },
  { key: 'counts', icon: ListChecks },
  { key: 'keeping', icon: 'ghost', values: { months: INACTIVITY_GRACE_MONTHS } },
  { key: 'tier', icon: Medal },
]

/* The legend: one chip per state a player can meet, with the same values as the spec's
   Appendix B mockups. Fixed on purpose — this is documentation, not data. */
const LEGEND = [
  { descriptor: describeLevel(4.25, true, 91), captionKey: 'level.sealLabel' },
  { descriptor: describeLevel(3.5, false, 40), captionKey: 'level.notVerified' },
  { descriptor: describeLevel(null, undefined, null), captionKey: 'level.none' },
]

function BlockIcon({ icon }: { icon: LucideIcon | 'seal' | 'ghost' }) {
  if (icon === 'seal') return <VerifiedSeal size={22} />
  if (icon === 'ghost') return <VerifiedSeal size={22} ghost />
  const Icon = icon
  return <Icon className="h-[22px] w-[22px] text-rally-accent" aria-hidden />
}

export default function LevelPage() {
  const { t } = useTranslation()

  const tiers = [
    { label: t('level_page.tier_d2'), range: t('level_page.tier_d2_range'), desc: t('level_page.tier_d2_desc'), emoji: '🟤' },
    { label: t('level_page.tier_d1'), range: t('level_page.tier_d1_range'), desc: t('level_page.tier_d1_desc'), emoji: '🟤' },
    { label: t('level_page.tier_c2'), range: t('level_page.tier_c2_range'), desc: t('level_page.tier_c2_desc'), emoji: '🟤' },
    { label: t('level_page.tier_c1'), range: t('level_page.tier_c1_range'), desc: t('level_page.tier_c1_desc'), emoji: '⚪' },
    { label: t('level_page.tier_b2'), range: t('level_page.tier_b2_range'), desc: t('level_page.tier_b2_desc'), emoji: '⚪' },
    { label: t('level_page.tier_b1'), range: t('level_page.tier_b1_range'), desc: t('level_page.tier_b1_desc'), emoji: '🟡' },
    { label: t('level_page.tier_a2'), range: t('level_page.tier_a2_range'), desc: t('level_page.tier_a2_desc'), emoji: '🟡' },
    { label: t('level_page.tier_a1'), range: t('level_page.tier_a1_range'), desc: t('level_page.tier_a1_desc'), emoji: '🟡' },
  ]

  const thClass = 'px-4 py-3 font-display font-semibold text-start'
  const tableWrapClass =
    'bg-rally-surface rounded-3xl overflow-hidden border border-rally-border max-w-2xl mx-auto'
```

Only `evolution` is gone. `thClass` and `tableWrapClass` stay — the tiers table (`:46-53`) uses them too.

- [ ] **Step 4: Replace the Evolution section's table with the Verified level section**

The Evolution section (`:102-140`) becomes — p1–p3 and the summary stay, p4 (which introduced the table) and the table go:

```tsx
      {/* Evolution */}
      <section className="container mx-auto px-4 max-w-4xl mb-16 sm:mb-24">
        <h2 className="font-display text-3xl font-black mb-6">{t('level_page.evolves_title')}</h2>
        <div className="space-y-6 text-lg text-rally-text-2 leading-relaxed">
          <p>{t('level_page.evolves_p1')}</p>
          <p>{t('level_page.evolves_p2')}</p>
          <p>{t('level_page.evolves_p3')}</p>
        </div>
        <p className="text-center text-rally-text-muted italic max-w-2xl mx-auto mt-8">
          {t('level_page.evolves_summary')}
        </p>
      </section>

      {/* Verified level — spec §10. The legend shows the three marks a player will meet in
          the app; the blocks are the same six as the in-app explainer sheet. */}
      <section className="container mx-auto px-4 max-w-4xl mb-16 sm:mb-24">
        <h2 className="font-display text-3xl font-black mb-6">{t('level.sealLabel')}</h2>
        <ul className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {LEGEND.map(({ descriptor, captionKey }) => (
            <li key={captionKey} className="flex flex-col items-center gap-3 rounded-3xl border border-rally-border bg-rally-surface p-6">
              <LevelChip descriptor={descriptor} size="lg" />
              <span className="text-sm text-rally-text-2">{t(captionKey)}</span>
            </li>
          ))}
        </ul>
        <ol className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {EXPLAINER_BLOCKS.map((block) => (
            <li key={block.key} className="flex gap-4 rounded-3xl border border-rally-border bg-rally-surface p-6">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rally-surface-2">
                <BlockIcon icon={block.icon} />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-rally-text">{t(`level.explainer.${block.key}.title`)}</h3>
                <p className="mt-1 text-rally-text-2 leading-relaxed">{t(`level.explainer.${block.key}.body`, block.values)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
```

- [ ] **Step 5: Remove the four orphaned keys from both locales**

The four keys are mid-block in both files (each followed by another key), so a line delete keeps the JSON valid:

```bash
sed -i '' '/^    "evolves_p4": /d; /^    "table_matches": /d; /^    "table_influence": /d; /^    "table_influence_0": /d' src/i18n/locales/en.json src/i18n/locales/he.json
node -e 'for (const f of ["en","he"]) { const j = require("./src/i18n/locales/"+f+".json"); for (const k of ["evolves_p4","table_matches","table_influence","table_influence_0"]) if (k in j.level_page) throw new Error(f+" still has "+k) } console.log("ok")'
```

Expected: `ok`. (`table_range` / `table_meaning` / `table2_*` stay — the tiers table and other copy use them; confirm with `rtk proxy grep -rn "table2_\|table_range\|table_meaning" src --include` … in zsh, quote it: `rtk proxy grep -rn "level_page.table" src/pages src/components`.)

- [ ] **Step 6: Run the test, then the full suite**

Run: `npx vitest run src/pages/LevelPage.test.tsx && npm test`
Expected: PASS; the key-parity check from Task 1 (`node` script) still reports `38 same keys` for `level`, and the two locales' `level_page` blocks have the same keys.

- [ ] **Step 7: Look at it**

`npm run dev` → `http://localhost:5174/level`, both languages (`localStorage.rallyLang`). Check: the three legend cards read verified / dashed / em dash; on a phone width the six blocks stack; in Hebrew the seal sits after the number (`LevelChip` is `dir="ltr"` inside, the caption follows the page direction).

- [ ] **Step 8: Commit**

```bash
git add src/pages/LevelPage.tsx src/pages/LevelPage.test.tsx src/i18n/locales/en.json src/i18n/locales/he.json
git commit -m "feat(level): /level explains the verified level — legend + six blocks replace the old influence table"
```

---

### Task 14: Retire `network.levelChip`, full verification, plan commit

**Files:**
- Modify: `src/i18n/locales/en.json:1154`, `src/i18n/locales/he.json:1169`
- Commit: `docs/superpowers/plans/2026-09-05-level-verified-web.md` (this file; `docs/` is gitignored → `git add -f`)

- [ ] **Step 1: Confirm the key has no callers, then remove it**

```bash
rtk proxy grep -rn "network.levelChip\|levelChip" src --exclude-dir=locales
```

Expected: no output (Task 8 removed the only use; `level-chip` with a hyphen is the test id, not this key — the pattern above does not match it). Then:

```bash
sed -i '' '/^    "levelChip": /d' src/i18n/locales/en.json src/i18n/locales/he.json
node -e 'for (const f of ["en","he"]) { const j = require("./src/i18n/locales/"+f+".json"); if ("levelChip" in j.network) throw new Error(f) } console.log("ok")'
```

Expected: `ok`. The key sits between `"close"` and `"tier"` in both files, so the delete leaves valid JSON.

- [ ] **Step 2: Full verification**

```bash
npm run lint && npm run build && npm test
```

Expected: eslint clean; `tsc -b` clean and the Vite bundle builds; every test passes. If `npm run build` fails in a `.test.tsx` file, that is expected behaviour (tests are in `tsconfig.json`'s `include`) — fix the type error, do not exclude the file.

- [ ] **Step 3: Commit the copy removal, then the plan's ticked checkboxes**

The plan is already committed on `feat/player-globe`; this second commit only records the
`- [x]` ticks made during execution. Skip it if `git diff --quiet -- docs/superpowers/plans/2026-09-05-level-verified-web.md` says nothing changed.

```bash
git add src/i18n/locales/en.json src/i18n/locales/he.json
git commit -m "chore(i18n): drop network.levelChip — replaced by LevelChip"
git add -f docs/superpowers/plans/2026-09-05-level-verified-web.md
git commit -m "docs(level): web plan — execution checkboxes"
```

---

## Done when

- `npm run lint`, `npm run build`, `npm test` all pass on `feat/level-verified`.
- Every place the web printed a level (`Navbar`, `/network` tab + tooltip, participants, partner search, `EditProfilePage`) now goes through `describeLevel` → `LevelChip` / `ReliabilityRing`; `grep -rn "toFixed(1)" src` returns no level formatting (the remaining hits, if any, are scores or percentages — check each).
- Against a rally-api that serves `level_verified` / `level_reliability` (rally-api plan, Tasks 1–5): the navbar chip shows a seal for a verified account; `/network` shows the ring on the viewer's own card and dashed rims on unverified nodes; `EditProfilePage` asks before replacing a verified level and reveals the new one afterward.
- Against an older rally-api: nothing breaks — every chip falls to the `unknown` state (plain number), the status lines disappear, the ring shows the number in a bare track.
- Then run `/wiki-ingest` (per the monorepo `CLAUDE.md`): the kit's location and the `describeLevel` contract are the two facts worth a wiki page.
