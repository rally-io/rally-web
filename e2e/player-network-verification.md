# Flow: verification seal on the player network (globe)

Covers the tenth web surface the level/ranking alignment touched: the level chip inside
the globe's player card (`PlayerStatsTab.tsx`). Unlike the ranking flow, this one **needs
a signed-in viewer** — `PlayerNetworkPage.tsx` renders the card only when `myId` is set:

```jsx
{selected && index && myId && <PlayerCard … />}
```

Signed out, clicking a node focuses the ball and opens nothing. That is not a bug; it is
the sign-in gate. Use the session-injection recipe in `ranking-verification.md` ("Signing
in without typing a password") before starting.

## Stack

Identical to `ranking-verification.md` — same API build, same worktree/port/CORS rules.

## Step 0: ground truth from the API

```
GET {api}/public/players/network
```

Parse `data.nodes[]` and record the node count, the count with `level_verified === true`,
and each verified node's `name`, `skill_level` and `level_reliability`.

The globe's payload is **Redis-cached**, so a stale cache is the failure mode to rule out
first: the route returns the cached dict raw, which means Pydantic defaults never run on a
cache hit and a pre-alignment cache entry would come back with **no `level_verified` key at
all**. The cache key was bumped to `public:player_network:v2` for exactly this reason. If
`level_verified` is missing from `data.nodes[0]`, you are reading a v1 entry — do not
proceed, and do not conclude the API is wrong.

## Steps

1. Sign in (session injection), then open `/network`. The navbar avatar turning from
   "Sign in" into initials is the confirmation that `myId` is set.
2. Click any node on the ball. Assert the card opens with a **Stats** tab and a
   `Level <n.n>` chip.
3. Open the card for a node whose API row has `level_verified: false`. Assert the chip
   reads `Level <n.n>` with **no** mark of any kind.
4. Open the card for a node whose API row has `level_verified: true`. Assert the chip
   reads `Level <n.n>` **followed by the seal**, and that the seal is the **only** one in
   the card — in particular the avatar's tier ring must stay unsealed (the documented
   exclusion in `PlayerCard.tsx`, pinned by `PlayerCard.levelFields.test.tsx`).

### Selecting a specific node

The ball is a single WebGL `<canvas>`; nodes are not DOM elements, so a node cannot be
addressed by selector, and the search box's pick only **focuses** the camera
(`onPick={openPlayer}` → `focus(id)`) — it does not select. Selection comes from a click on
the node itself, and after a focus the node can land clipped behind the navbar, where the
click silently misses.

In a dev build the scene is exposed for exactly this:

```js
const s = window.__playerGlobe                       // set in usePlayerGlobe.ts under import.meta.env.DEV
const n = s.graph.nodes.find(x => x.name === 'LoadTest Player00007')
s.focusPlayer(n.id); s.select(n.id)                  // select() fires the same onSelect the click does
```

Use it to reach a *named* node deterministically. Do not use it to skip Step 2 — a real
mouse click must be shown to open a card at least once per run, or the flow is only
testing the debug handle.

## Pass criteria

The seal appears on the level chip **iff** the node's `level_verified` is true, and the
card contains exactly one seal (never on the tier ring).

---

## What was actually run (2026-09-09)

- **Step 0:** `GET /public/players/network` returned **119 nodes**, every node carrying
  `level_verified` / `level_reliability` (so: a v2 cache entry, not a stale v1 one).
  Exactly **2** verified: `LoadTest Player00007` (skill_level **4**, reliability **91**)
  and `LoadTest Player00008` (skill_level **2.46**, reliability **86**).
- **Steps 1–2:** signed in as `E2E Tester`; a real click on a ball node opened the card
  for `אסף כהן` with the Stats tab active.
- **Step 3 (unverified):** that same card's chip read **`Level 2.6`** — plain, no seal, no
  negative mark.
- **Step 4 (verified):** `LoadTest Player00007`'s card chip read **`Level 4.0` + seal**.
  DOM check on the card element: `verified-seal` count **1**, and that one seal is
  **inside** the level chip; the avatar tier ring carried none.
- **Result:** PASS, in both directions, on the same chip component 3 minutes apart.
- **Artifacts:** none saved; the assertions above are DOM-vs-API, which is this flow's
  stated criterion.

---

## Second run (2026-09-10) — three-way split (task-9-brief.md)

**Same doc-staleness finding as `ranking-verification.md`'s third run, applies here too.**
This doc's Step 3 ("Assert the chip reads `Level <n.n>` with **no** mark of any kind" for a
`level_verified: false` node) describes the retired two-state/additive-only design. The current
build's `PlayerStatsTab.tsx:37` calls `<VerificationMark verified={node.levelVerified}
className="shrink-0" />` with **no** `showLabel={false}` override, so the default (`true`)
applies — an unverified node's chip shows the dashed ghost mark **and** a "Not verified" text
label, by the same three-state design (`VerificationMark.tsx`, spec §4) documented in the
ranking flow's finding. Results below reported against both rules, same as that doc.

### Stack

Identical to the third run of `ranking-verification.md`: rally-api `:8080`
(`rally-api-rating` worktree, dev Supabase, `NOTIFICATIONS_SINK=capture`); rally-web served from
the dedicated worktree `.worktrees/rally-web-lr` on `:5175`; `CORS_ORIGINS` override includes
`:5175` (confirmed via `OPTIONS` preflight → 200).

### Step 0 (API ground truth, re-derived independently)

`GET /public/players/network` → **119 nodes**, every node carrying `level_verified` /
`level_reliability` (a v2 cache entry — `level_verified` present on `data.nodes[0]`, not a stale
v1 miss). **3** verified, **116** false, **0** null:

- `ad1070ab-0a60-464a-bc55-a56ee2e7cc0c` — **E2E Tester**, skill_level 4.25, reliability 91.
- `577fc06d-b33e-4118-ba11-610baeddac0c` — **LoadTest Player00007**, skill_level 4.0, reliability 91.
- `b9607589-7dd6-4d5f-8f17-3d1428cdea79` — **LoadTest Player00008**, skill_level 2.46, reliability 86.

(Same three ids as this run's league-standings ground truth — expected, since both endpoints
read the same underlying verification state.)

### Steps 1–2

Session injected via the recipe in `ranking-verification.md` (minted via `/v1/auth/login`,
never typed into the app). Navbar avatar changed to "ET" initials. A **real mouse click** on a
ball node opened a card — in this run it landed on the viewer's **own** node, `E2E Tester`
(Stats tab active by default, per the doc's requirement that at least one real click open a card
before falling back to the debug handle).

### Step 3/4 — three-way check, per node

**`E2E Tester` (own node, `level_verified: true`, skill 4.25):** chip read **"רמה [seal] מאומתת
4.3"** (Level [seal] Verified 4.3 — rounded from 4.25). DOM: `[data-testid="verified-seal"]` → 1,
`[data-testid="verified-seal-ghost"]` → 0, `data-verified="true"`. The avatar/tier-ring circle
("ET" initials) carried no seal — the only seal on the whole card was inside the chip.

**`LoadTest Player00009` (`level_verified: false`, skill 3.5)**, reached via the documented debug
handle after the real click above:

```js
const s = window.__playerGlobe
const n = s.graph.nodes.find(x => x.name === 'LoadTest Player00009')
s.focusPlayer(n.id); s.select(n.id)
```

`n.levelVerified` read `false` before selecting, confirming the handle targets the intended
node. Chip read **"רמה [ghost] לא מאומת 3.5"** (Level [ghost] Not verified 3.5). DOM:
`[data-testid="verified-seal"]` → 0, `[data-testid="verified-seal-ghost"]` → 1,
`data-verified="false"`, `title="הרמה עוד לא מאומתת"`. Same as `E2E Tester`'s card: the avatar
("LP" initials) carried no seal/ghost — the only mark was inside the chip.

- **Under this doc's literal Step 3** ("no mark of any kind" for `false`) — **FAIL**: a ghost
  mark plus a "Not verified" label rendered.
- **Under task-9-brief.md's three-way rule** — **PASS**: exactly one `verified-seal-ghost` and
  zero `verified-seal` for the `false` node, exactly one `verified-seal` and zero
  `verified-seal-ghost` for the `true` node; the tier ring carried neither in either case,
  matching this doc's separate (and still valid) exclusion pass criterion — "never on the tier
  ring" held on both cards.

No `null`-verified node existed in this run's 119-node ground truth, so the "a `null` node's
chip renders neither mark" leg of the three-way rule was **not exercised** here either — same
gap as the ranking flow's board/season-page checks.

### Result

**PASS** under `task-9-brief.md`'s three-way DOM-vs-API split: seal/ghost counts and the
`data-verified` value matched the API's `level_verified` for both nodes checked, in both
directions, and the tier-ring exclusion held. **FAIL** under this doc's own Step 3 wording,
which — like `ranking-verification.md`'s Step 6 — still describes the two-state/additive-only
design. Flagged for the plan owner to reconcile; not re-tested into a false pass.

**Gap carried forward:** no `null`-verified node existed in this run's data, so that leg of the
three-way rule is untested on live network data.

**Artifacts:** none saved; the assertions above are DOM-vs-API (plus one live screenshot taken
during the run but not persisted to `e2e/artifacts/`, consistent with this doc's existing
practice of not saving artifacts when the DOM-vs-API comparison is the stated criterion).

---

## Third run (2026-09-10, build `f2fa07d1`) — re-run against the code that actually ships

**Why this run exists.** The second run above was recorded in commit `6effb10`, before `649f88c`
and `f2fa07d1` landed. Neither of those two commits touches `PlayerStatsTab.tsx` or the globe —
`git diff --name-only 6effb10..f2fa07d1` is 5 files, all in `describeLevel`/`types/api.ts`/
`PlayerSeasonContent` — but `f2fa07d1` widens `describeLevel`'s guard and retypes
`level_verified` to `boolean | null` across the API types, so the globe was re-run rather than
assumed unaffected. Same stack, same session, same sitting as the fourth run of
`ranking-verification.md`; see that entry for the build-under-test proof (the new code was
confirmed in the **modules Vite actually serves**, not merely on disk), the dev-project check
(`kilrlotagthshoibzjng`), the `:5175` CORS preflight (200), and the session-minting details.

### Step 0 (API ground truth, re-derived fresh)

`GET /public/players/network` → **119 nodes**, `level_verified` present on `data.nodes[0]` (a v2
cache entry, not a stale v1 miss). **2** `true`, **117** `false`, **0** `null`:

- `577fc06d-b33e-4118-ba11-610baeddac0c` — **LoadTest Player00007**, skill_level 4.0, reliability 91
- `b9607589-7dd6-4d5f-8f17-3d1428cdea79` — **LoadTest Player00008**, skill_level 2.46, reliability 86

Same two ids as this sitting's standings ground truth, as expected. Note this differs from the
second run, which saw **3** verified: `E2E Tester` has drifted back to `false`/40 in the hours
since. Re-derive, never reuse.

The client-side decode was checked against that payload independently, via the dev handle:
`window.__playerGlobe.graph.nodes` → **119** nodes, **2** `levelVerified === true` (by name:
`LoadTest Player00007`, `LoadTest Player00008`), **117** `false`, **0** `null`/`undefined`. The
decoder neither invents nor loses a state on the way from JSON to the scene graph.

### Steps 1–2 — a real mouse click opened a card

Signed in via the injected session (navbar avatar = "ET"). A **real `left_click` at (796, 341)** on
a ball node — not the debug handle — opened the card for **`Shahaf Pariente`** with the Stats tab
("סטטיסטיקה") active.

### Steps 3/4 — three-way check, per node

**`Shahaf Pariente` (`level_verified: false`, skill 2.25), opened by the real click.** Chip read
**"רמה 2.3 לא מאומת"** (Level 2.3 · Not verified — 2.25 rounded). DOM on the card:
`[data-testid="verified-seal"]` → **0**, `[data-testid="verified-seal-ghost"]` → **1**,
`data-verified="false"`, `title="הרמה עוד לא מאומתת"`, and **exactly one** `[data-verified]` node in
the whole card, sitting **inside the level chip** — the avatar's tier ring carried none.

**`LoadTest Player00007` (`level_verified: true`, skill 4.0)**, reached with the documented dev
handle after the real click above:

```js
const s = window.__playerGlobe
const n = s.graph.nodes.find(x => x.name === 'LoadTest Player00007')
s.focusPlayer(n.id); s.select(n.id)
```

`n.levelVerified` read `true` before selecting, confirming the handle targeted the intended node.
Chip read **"רמה 4.0 מאומת"**. DOM: `verified-seal` → **1**, `verified-seal-ghost` → **0**,
`data-verified="true"`, `title="מאומת על ידי Rally"`, again **exactly one** mark in the card — the
"LP" tier ring carried none.

So the tier-ring exclusion (this doc's separate, still-valid pass criterion — "never on the tier
ring") held on both cards, in both states.

### The `null` leg

Still **not exercisable on this surface**: 0 of the 119 network nodes carry `null`. The live source
of `level_verified: null` in dev data is tournament **guests**, who do not appear on the player
network at all (a guest has no player row, so no node). The `null` rule was exercised this sitting
on the tournament-participants surface instead — see the fourth run of `ranking-verification.md`
for the counts, and for the precise limit of what that proves (the observable "renders nothing"
rule holds; `describeLevel`'s widened `verified == null` branch is still reached only by unit
tests, because `is_guest` and a `null` `skill_level` each short-circuit it first).

### Result

**PASS** under the three-way rule in the SUPERSEDED footer below: seal/ghost counts and the
`data-verified` value matched the API's `level_verified` for both nodes checked, in both
directions, and the tier-ring exclusion held on both cards. **FAIL** against this document's own
Step 3 wording ("no mark of any kind" for a `false` node), unchanged from the second run's finding
and left for the plan owner to reconcile — not re-tested into a false pass.

**Gaps carried forward:** (1) the `null` leg remains untestable on the globe for the structural
reason above; (2) this run was Hebrew-only — the globe has never been exercised in English/LTR, in
any run.

**Artifacts:** `network-01-verified-chip-2026-09-10-he.jpg` — `LoadTest Player00007`'s card showing
the solid seal inside the "רמה 4.0 מאומת" chip while the "LP" tier ring above it stays unsealed.

---

## ⚠ SUPERSEDED 2026-09-10 — the "no mark of any kind" rule was REVERSED

Earlier text in this document (Step 6 / Step 3, and the Pass Criteria) says an unverified player
renders **no mark of any kind**. That was design decision D2 of the 2026-09-08 alignment spec, and
the owner reversed it on 2026-09-10: an explicit `false` now renders a dashed **ghost** seal plus a
"not verified" label, because in a draw where nobody is verified the badge was otherwise invisible
and unlearnable.

**The rule this document is now checked against is three-way, not two-way:**

| `level_verified` | renders |
|---|---|
| `true` | seal + verified word — `[data-verified="true"]` |
| `false` | ghost + not-verified word — `[data-verified="false"]` |
| `null` / absent | **nothing at all** — the server did not say, so we claim nothing |

The old "no mark" wording survives above only where it still applies: to the `null` case. Where it
is stated about `false`, it is stale. Read the dated run entries below for what was actually
asserted.
