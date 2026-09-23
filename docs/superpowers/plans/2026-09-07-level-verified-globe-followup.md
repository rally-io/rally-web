# Level-verified: the globe follow-up (deferred from the web plan)

> **Split out 2026-09-07.** These three blocks were written as Tasks 8, 10 and 14 Step 1 of
> `2026-09-05-level-verified-web.md`, then deferred there because `src/features/playerGlobe/`
> does not exist on `main` — it lives on `feat/player-globe`, a different feature. The level
> branch no longer references them, so it can ship on its own.
>
> **Run this file on the globe branch**, after `feat/player-globe` and `feat/level-verified`
> have both landed. Line numbers below are from the 2026-09-05 tree; re-locate before editing.
>
> Section numbers (§) refer to
> `rally-api-rating/docs/superpowers/specs/2026-09-05-rating-reliability-ui-design.md`.

**One change since the split:** the level branch mounts `LevelExplainerSheet` on
`EditProfilePage` behind `level.howCalculated`, so the sheet is live before this file runs.
Task 8's `PlayerStatsTab` becomes its *second* consumer, not its first. The owner-card copy
Task 8 needs — `level.yourLevel`, `level.hintNone`, `level.hintUnverified`,
`level.hintVerified`, `level.hintVerifiedFading` — was **removed from both locales** when the
branch shed its unmounted code (5 keys, `en.json` / `he.json`). Re-add them here; the Hebrew and
English strings are in spec §11 and in git history at `feat/level-verified`'s pre-split tip,
`b0c740b` (rally-web was never rebased, so that commit stays reachable).

---

### Task 8: `/network` PlayerStatsTab — self vs others

> **DEFERRED — not executable on `main`.** `src/features/playerGlobe/` exists only on `feat/player-globe`, which has not merged. Run this task in a follow-up branch once the globe lands, together with Task 10 and Task 14 Step 1. Pre-flight finding to apply then: the new `describe('PlayerStatsTab — level', …)` block needs its **own** `beforeEach` that resets `session.playerProfile = null` — Vitest does not run a sibling describe's `beforeEach`, so test 4 otherwise inherits test 3's `skill_level: 3.75` profile and fails.

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


---

### Task 10: Globe — payload fields, dashed rim, tooltip chip

> **DEFERRED — not executable on `main`** (see Task 8). Runs in the globe follow-up.

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


---

### Task 14 Step 1 (deferred): retire `network.levelChip`

- [ ] **Step 1: Confirm the key has no callers, then remove it** — **SKIP on `main` (deferred to the globe follow-up)**

```bash
rtk proxy grep -rn "network.levelChip\|levelChip" src --exclude-dir=locales
```

Expected: no output (Task 8 removed the only use; `level-chip` with a hyphen is the test id, not this key — the pattern above does not match it). Then:

```bash
sed -i '' '/^    "levelChip": /d' src/i18n/locales/en.json src/i18n/locales/he.json
node -e 'for (const f of ["en","he"]) { const j = require("./src/i18n/locales/"+f+".json"); if ("levelChip" in j.network) throw new Error(f) } console.log("ok")'
```

Expected: `ok`. The key sits between `"close"` and `"tier"` in both files, so the delete leaves valid JSON.

