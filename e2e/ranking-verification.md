# Flow: verification on the public ranking

Covers spec stages 1, 3 and 5.

This flow was executed against the live dev stack on 2026-09-08 (see "What was actually
run" below for the real numbers). It uses the dev DB's existing data as ground truth
rather than seeding synthetic fixtures — read the note at the bottom before assuming you
need to seed anything.

## Stack

- **rally-api** on `:8080`, dev Supabase, `NOTIFICATIONS_SINK=capture`. It must be running
  from the branch/worktree that carries `level_verified`/`level_reliability` on the
  standings response (this feature's branch, `feat/level-and-ranking`, or a worktree
  checked out from it — e.g. `rally-api-rating/` in the run recorded below). A plain dev
  checkout without that branch does **not** error — `/ranking` just silently renders **0
  seals**, indistinguishable by seal count alone from "no verified players yet." Check
  which build you're on **before** touching the browser (requires `jq` — `brew install jq`
  if it's missing):

  ```bash
  curl -s http://127.0.0.1:8080/public/league/standings | jq '(.data.rows[0] // {}) | has("level_verified")'
  ```

  (The endpoint wraps everything in the standard `{success, data, ...}` envelope; rows
  live at `data.rows`, not at the top level.) `true` → right build, continue to Step 0.
  `false` → wrong branch/worktree (or an empty standings table) — switch before
  continuing. A connection error or empty body (e.g. `curl: (7) Failed to connect`, or a
  `jq` parse error on nothing) means rally-api isn't running or has crashed — this curl's
  URL is hardcoded to `:8080`, so unlike the browser it cannot land on Metro's `:8081`
  instead (that failure mode is real, but it belongs to the browser's `.env`-templated
  base URL — see the rally-web bullet below). This is what distinguishes "wrong build"
  from "no verified players yet," which a seal count of zero cannot.

- **rally-web** dev server on `:5173`: `npm run dev -- --port 5173 --strictPort` from the
  repo root. **`vite.config.ts` pins the default dev port to `5174`, not Vite's usual
  `5173`** — bare `npm run dev` lands on `5174`, not the `:5173` used throughout this doc,
  so the flag is required to match every URL below. `--strictPort` makes the server fail
  loudly if `5173` is already taken (e.g. by rally-crm's dev server, which runs on Vite's
  unmodified default) instead of silently drifting to `5174` and 404ing every step. This
  stack's `rally-web/.env` is known to drift to Metro's port (`:8081`), which returns HTTP
  200 with Expo's app HTML for every path and never errors — **read the full
  `VITE_API_BASE_URL` trap in `e2e/README.md` before starting it.** If `rally-web/.env`
  isn't already pointed at the rally-api instance above, don't edit the file — override it
  for the dev server process instead:
  `VITE_API_BASE_URL=http://127.0.0.1:8080 npm run dev -- --port 5173 --strictPort`.

## Step 0: establish ground truth from the API first

`GET {api}/public/league/standings` and parse `level_verified` per row. Record:

- total row count,
- the count of rows with `level_verified === true`,
- and the identity (name or id) of each one.

Do this **before** touching the browser — the browser assertions in the following steps
are checked against this recorded set, not the other way around.

Assert on the response **body** — confirm the envelope's `data.rows` array (the response
is wrapped in the standard `{success, data, ...}` envelope, not a bare top-level array)
holds standings rows that actually carry `level_verified`/`level_reliability` fields —
never on the HTTP status alone. On this stack, port `:8081` is Metro (the Expo bundler)
and returns `200` with Expo's app HTML for *every* path, including a wrong/misconfigured
API base URL, so a `200` proves nothing here. See `e2e/README.md` for the full trap.

## Steps

1. `tabs_context_mcp`, then `tabs_create_mcp` to `http://localhost:5173/ranking`.
2. `scroll_to` the standings table, THEN `find`/read the page — a `find` issued
   immediately after `navigate` can hallucinate (report stale or not-yet-painted
   content). Screenshot: `ranking-01-mixed-board-he`.
3. Count the seals rendered in the DOM — `role="img"` with `aria-label` = the
   `level.sealLabel` i18n string (`"רמה מאומתת"` / "verified level" in Hebrew), or
   `[data-testid="verified-seal"]` — and compare both the **count** and the **identities**
   against the `level_verified === true` set recorded in Step 0. They must match exactly,
   in both directions: no seal in the DOM without a matching `level_verified: true` row,
   and no `level_verified: true` row without a seal.
4. **Mixed-board proof.** Find a run of adjacent rows that all render the identical band
   pill (same letter, same rank tier styling) so the pill itself can't be mistaken for a
   verification signal. Confirm that among those visually-identical rows, only the ones
   whose API row has `level_verified: true` carry the seal. This is the evidence that the
   seal is additive (spec §8) rather than baked into the band/tier styling. Screenshot:
   `ranking-02-seal-zoom-he`.
5. Open `/ranking/player/<a verified id from Step 0>`. Assert the seal survives into the
   season header, positioned at the RTL reading end of the name when the page is in
   Hebrew. Screenshot: `ranking-03-season-verified-he`.
6. Open `/ranking/player/<an unverified id from Step 0>`. Assert there is **neither** a
   seal **nor** a "not verified" ghost mark next to the name — the additive rule (spec §8)
   means the unverified case renders a plain, unmarked name, not a visible negative
   assertion. Screenshot: `ranking-04-season-unverified-he`.

## Pass criteria

**Every rendered seal matches `level_verified` in the payload, in both directions.** A
seal that is merely *present* proves nothing — the check is that the DOM seal count and
identities equal the API's verified set exactly, and that every unverified player renders
with no mark of any kind (not even a "not verified" indicator).

---

## What was actually run (2026-09-08)

- **Stack:** rally-api on `:8080`, served from the `rally-api-rating` worktree (the branch
  carrying `level_verified`/`level_reliability`), dev Supabase,
  `NOTIFICATIONS_SINK=capture`. rally-web dev server on `:5173`, started with
  `VITE_API_BASE_URL=http://127.0.0.1:8080 npm run dev -- --port 5173 --strictPort` — the
  port flag is not optional here, since `vite.config.ts` pins the plain-`npm run dev`
  default to `:5174` — `rally-web/.env` itself was
  left pointed at `:8081` (Metro), which is the trap documented in `e2e/README.md`.
- **Step 0 (API ground truth):** `GET /public/league/standings` returned **37 rows**,
  every row carrying `level_verified` / `level_reliability`. Exactly **2** had
  `level_verified: true`: **`E2E Tester`** and **`LoadTest Player00008`**.
- **Steps 1–3 (board):** `/ranking` rendered **exactly 2 seals**, on exactly those 2
  players. The other 35 rows rendered a plain tier with no mark. The seal's accessible
  label read as `"רמה מאומתת"` ("verified level"). DOM count and identities matched the
  API set exactly, in both directions.
- **Step 4 (mixed-board proof):** four adjacent rows all displayed band **D**, rank
  **27** — identical pill styling across all four — and only `LoadTest Player00008`'s row
  carried the seal. The other three, visually indistinguishable band-wise, carried none.
  This is the demonstration that the seal is additive: nothing about the band pill's
  rendering changes based on verification.
- **Step 5 (verified season page):**
  `/ranking/player/b9607589-7dd6-4d5f-8f17-3d1428cdea79` (verified) rendered the seal
  beside the name, at the RTL reading end.
- **Step 6 (unverified season page):**
  `/ranking/player/13622bbd-5f47-4d8b-82f9-07f77ce5157d` (unverified) rendered **no seal
  and no "not verified" mark** — a plain, unmarked name.
- **Result:** PASS — the pass criterion held in both directions on every surface
  exercised.
- **Artifacts** (`e2e/artifacts/`): `ranking-01-mixed-board-he.jpg`,
  `ranking-02-seal-zoom-he.png`, `ranking-03-season-verified-he.jpg`,
  `ranking-04-season-unverified-he.jpg`, `ranking-05-board-en-ltr.jpg`.
- **English/LTR follow-up (board only) — done:** the board was re-run with the navbar
  language switcher set to English. `/ranking` rendered as "Rally Rankings" / "2026 · 37
  PLAYERS", and `E2E Tester`'s seal appeared to the **right** of the name — the LTR
  reading end, mirroring the Hebrew capture's left-side placement. This confirms the seal
  follows reading direction rather than a fixed physical side. Mechanism, read from
  source rather than assumed: the captured row is the rank-1 featured row, rendered by
  `TopRanks.tsx`, which puts the name span then, conditionally, `<VerifiedSeal>` right
  after it in DOM order — no left/right branching (the rest of the board, rendered by
  `StandingsTable.tsx` via its `PlayerIdentity.tsx` sub-component, follows the identical
  name-then-seal order). `useDocumentLanguage.ts` sets `dir` on `<html>` per active
  language, and the `noPhysicalDirection` test
  (`src/features/leagueRanking/__tests__/noPhysicalDirection.test.ts`) guards this
  feature against physical (`ml-`/`mr-`/`text-left`/`text-right`) utilities in favor of
  logical ones — so it's the browser's native `dir`-aware mirroring of that fixed DOM
  order and those logical utilities that relocates the seal, not a per-direction toggle.
  Screenshot: `ranking-05-board-en-ltr.jpg`.
- **Coverage gap remaining:** the two season pages (Steps 5 and 6) were only exercised in
  Hebrew — they have **not** been re-run in English/LTR, so the RTL-reading-end claim for
  the season header is confirmed only for Hebrew. Re-run steps 5 and 6 with the language
  switcher set to English before treating LTR seal placement on the season page as
  verified. (Only the board, Step 2, has an LTR confirmation so far.)

**Note on fixtures:** this run used the dev DB's existing real data rather than seeding
synthetic players — 2 of the 37 real players already carried `level_verified: true`,
which was sufficient to exercise the verified path, the unverified path, and the
mixed-board additive proof in a single pass. A seeding script exists for the case where
dev data drifts to 0 or all 37 verified:
`scripts/seed_level_league_fixtures.py` in the rally-api repo (confirmed present on the
`feat/level-and-ranking` branch, e.g. checked out at `rally-api-rating/` — it is tracked
in git, not gitignored, as of this run). Seed one player past the verification threshold
and one short of it, then re-run Step 0 to pick up their real ids.

---

## Second run (2026-09-09) — closes the English/LTR season-page gap

### Stack differences from the first run (read this before reproducing)

The first run drove `:5173` from the **main `rally-web` checkout**. That is not safe: the
main checkout is a shared working tree and can be switched to another branch under a
running dev server. It was — at `21:21` on 2026-09-08 it moved from `feat/level-and-ranking`
to `feat/corporate-tournament-registration`, and from that moment the still-running Vite
server on `:5173` served the *other* branch's code. The symptom is not an error: `/ranking`
and `/ranking/how` rendered the app's **"This page is on its way" Coming Soon placeholder**
and the navbar silently lost its "Ranking" and "Player network" entries. Nothing in the
browser distinguishes that from a feature flag or a cache.

**Run the web e2e from a dedicated worktree, never from the shared checkout:**

```bash
git worktree add ../.worktrees/rally-web-lr feat/level-and-ranking
ln -s "$(git rev-parse --show-toplevel)/node_modules" ../.worktrees/rally-web-lr/node_modules
cp .env ../.worktrees/rally-web-lr/.env      # .env is gitignored; a fresh worktree has none
# then point the COPY at the API — this is not the developer's config, so editing it is fine
node node_modules/.bin/vite --port 5175 --strictPort
```

**`CORS_ORIGINS` gates the port you may serve on.** rally-api's `.env` allows only
`localhost:5173` and `localhost:5174`. On `:5175` the preflight `OPTIONS` returns **400**,
the browser blocks the standings fetch, and the board renders the empty state
("אף שחקן עדיין לא מדורג" / "no player is ranked yet") — again with no error anywhere.
`curl` does not reproduce it, because curl sends no `Origin`. Reproduce the real check
with one:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X OPTIONS \
  -H 'Origin: http://localhost:5175' -H 'Access-Control-Request-Method: GET' \
  http://127.0.0.1:8080/public/league/standings     # 400 = blocked, 200 = allowed
```

Do not edit rally-api's `.env`. Override it for the API process instead:

```bash
NOTIFICATIONS_SINK=capture \
CORS_ORIGINS='["http://localhost:5173","http://localhost:5174","http://localhost:5175"]' \
  .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8080
```

### Signing in without typing a password

Steps 5/6 need no session, but the personal card (below) and the player-network flow do.
Mint one through the API and inject it — never type credentials into the app's login form:

```bash
# creds live in rally-mobile/e2e/.env.e2e; never inline them in a flow file
set -a; . ../rally-mobile/e2e/.env.e2e; set +a
curl -s -X POST http://127.0.0.1:8080/v1/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$E2E_EMAIL\",\"password\":\"$E2E_PASSWORD\"}" > /tmp/e2e-session.json
```

Reshape it into a supabase-js v2 session (`access_token`, `token_type: "bearer"`,
`expires_at` from the JWT's `exp`, `refresh_token`, `user`), write it to a **gitignored**
path inside the worktree (`.superpowers/e2e-session.json`), then have the page itself read
it — this keeps the token out of the agent transcript entirely:

```js
const s = await fetch('/@fs/<abs path>/.superpowers/e2e-session.json').then(r => r.json())
localStorage.setItem('rally-web.supabase.auth', JSON.stringify(s))
```

`rally-web.supabase.auth` is the storage key — `src/lib/supabase.ts` overrides
supabase-js's default `sb-<ref>-auth-token`, so the CRM harness's key does **not** work here.

### What was actually run (2026-09-09)

- **Step 0 (API ground truth):** `GET /public/league/standings?frame=global&offset=0`
  returned **37 rows**, all carrying the pair. Exactly **2** with `level_verified: true`:
  `LoadTest Player00007` (`577fc06d…`, band **B**, reliability **91**) and
  `LoadTest Player00008` (`b9607589…`, band **D**, reliability **86**).
  This set differs from the 2026-09-08 run, which recorded `E2E Tester` and
  `LoadTest Player00008`. `E2E Tester` (`ad1070ab…`) now reads `level_verified: false`,
  reliability **40**. The cause was not established in this run — either the seeder was
  re-run between the two, or reliability decayed with time since the last rated match
  (`reliability_snapshot` takes `now`). Do not treat the identities in either run as
  fixtures; always re-derive them in Step 0.
- **Steps 1–4 (board):** `/ranking` rendered **exactly 2** `[data-testid="verified-seal"]`
  nodes for exactly those 2 rows out of 37 — count and identities matched the API set in
  both directions. Mixed-board proof, stronger than the first run's: the **top three rows
  are all rank 1, all 8 points, all band B** — `E2E Tester`, `LoadTest Player00007`,
  `LoadTest Player00009` — visually identical in every ranking respect, and only
  `LoadTest Player00007` carried the seal.
- **Step 5 (verified season page, ENGLISH/LTR — the gap the first run left open):**
  `/ranking/player/577fc06d-b33e-4118-ba11-610baeddac0c` rendered
  "LoadTest Player00007 ✓" with the seal at the **LTR reading end** (right of the name),
  mirroring the Hebrew capture. Header read "Level B · of 3 players", rank 1, 8 points.
- **Step 6 (unverified season page, ENGLISH/LTR):**
  `/ranking/player/ad1070ab-0a60-464a-bc55-a56ee2e7cc0c` (`E2E Tester`) rendered a plain,
  unmarked name — no seal, no ghost/dashed variant, no "not verified" text. It is the
  ideal control for Step 5: **identical** band ("Level B · of 3 players"), identical rank
  (1), identical points (8), identical tournament count (1) — the only difference on the
  whole page is the presence of the seal.
- **`/ranking/how` (not covered by the first run):** the reworded rule renders in both
  locales, and neither locale contains a conflation phrase. Hebrew: heading **"דירוג זמני"**,
  body *"עד שתשחקו 4 משחקים מדורגים, הדירוג שלכם זמני ואתם מופיעים בתחתית הרמה שלכם."*
  English: heading **"Provisional rank"**, body *"Until you have played 4 rated matches,
  your rank is provisional and you appear at the bottom of your level."* Both name the two
  signals separately in one sentence. Asserted against the same regexes the unit test pins
  (`leagueKeys.test.ts` `CONFLATION_PHRASES`): `/רמה זמנית/`, `/הרמה של(ך|כם) זמנית/`,
  `/provisional level/i`, `/level is provisional/i` — **all four absent from the live DOM**.
- **Personal card, signed in (`PersonalCard`, not covered by the first run):** as
  `E2E Tester` the board rendered "YOUR POSITION IN THE GLOBAL RANKING", rank 1,
  "#1 in level B", and the level-status line **"Your level is still firming up"** — with
  **no seal**, matching `level_verified: false` / reliability 40. Note the two signals use
  distinct copy on the same card: the level-status line is about the **level**'s
  reliability, and is worded nothing like the provisional-**rank** rule on `/ranking/how`.
- **Result:** PASS. The pass criterion held in both directions on every surface, and the
  English/LTR season-page gap recorded by the first run is now closed.
- **Artifacts:** none saved for this run. The pass/fail here is the DOM-vs-API comparison
  recorded above, which is the criterion this flow actually defines; the first run's five
  screenshots remain in `artifacts/` as visual evidence.

---

## Third run (2026-09-10) — three-way split (task-9-brief.md) + live Hebrew rendering

**Important finding first: this doc's own Step 6 and Pass Criteria text are now stale.**
`web-plan/task-9-brief.md` (the current plan's regenerated requirements for this task) defines
the assertion as counting `[data-verified="true"]` **and** `[data-verified="false"]` DOM nodes
against the API's true/false counts, with `null` rows rendering neither. That is a three-state
rule. This doc's Step 6 ("assert there is **neither** a seal **nor** a 'not verified' ghost
mark") and its Pass Criteria ("every unverified player renders with no mark of any kind, not
even a 'not verified' indicator") describe the retired two-state/additive-only design (spec §8).
The current build implements the three-state design instead —
`src/components/players/level/VerificationMark.tsx`'s own docstring cites "spec §4" and states
plainly that `false` renders a dashed **ghost** seal plus a "Not verified" label, `true` renders
the solid seal, and only `null` renders nothing. Confirmed against source, not assumed. Below,
results are reported against **both** rules: PASS under the current plan's three-way check,
FAIL under this doc's own literal Step 6/Pass Criteria wording. This is flagged for the plan
owner to reconcile (rewrite this doc's Step 6 and Pass Criteria to the three-state rule) — not
silently rewritten here, per the instruction not to weaken an assertion to make it pass.

### Stack

Per the coordinator: rally-api on `:8080`, serving from the `rally-api-rating` worktree, dev
Supabase, `NOTIFICATIONS_SINK=capture`. rally-web served from this dedicated worktree
(`.worktrees/rally-web-lr`) on `:5175` via `node node_modules/.bin/vite --port 5175 --strictPort`.
`CORS_ORIGINS` on the API override includes `:5175`. Verified independently before touching the
browser: `GET /health` → 200; `OPTIONS /public/league/standings` with
`Origin: http://localhost:5175` → 200; `GET /public/league/standings | jq '.data.rows[0] |
has("level_verified")'` → `true` (right build).

### Step 0 (API ground truth, re-derived independently)

`GET /public/league/standings?frame=global&offset=0` → **37 rows**, **3** with
`level_verified: true`, **34** `false`, **0** `null`:

- `ad1070ab-0a60-464a-bc55-a56ee2e7cc0c` — **E2E Tester**, band B, rank 1, reliability **91**
  (this account has drifted from the second run: it was `false`/40 on 2026-09-09, now `true`/91
  — reliability decays/recovers with time and match activity, exactly the trap the earlier runs
  warned about; identities were re-derived fresh, not reused).
- `577fc06d-b33e-4118-ba11-610baeddac0c` — **LoadTest Player00007**, band B, rank 1, reliability 91.
- `b9607589-7dd6-4d5f-8f17-3d1428cdea79` — **LoadTest Player00008**, band D, rank 27, reliability 86.

### Steps 1–4 (board)

DOM (`/ranking`, Hebrew, signed out): `[data-verified="true"]` → **3**, `[data-verified="false"]`
→ **34**, total `[data-verified]` → **37** (= row count, consistent with 0 null rows).
Identities of the 3 `true` nodes matched the API set exactly in both directions: **E2E Tester**,
**LoadTest Player00007**, **LoadTest Player00008** — same three ids, no extra, none missing.
**PASS** on the three-way count+identity check (task-9-brief.md Step 3).

**Mixed-board proof:** the top three rows are all rank 1, 8 points, band B — **E2E Tester**,
**LoadTest Player00007**, **LoadTest Player00009** — visually identical band/rank/points. Only
the first two carried the solid green seal (`data-testid="verified-seal"`); **LoadTest
Player00009** carried a dim dashed-circle **ghost** mark instead
(`data-testid="verified-seal-ghost"`, `title="הרמה עוד לא מאומתת"`, `data-verified="false"`) —
visible but easy to miss at a glance (screenshot `ranking-06-mixed-board-2026-09-10-he.png`
zooms on exactly this). The ghost is present but no text label accompanies it here (board call
sites pass `showLabel={false}`), unlike the season page (Step 6 below). This is still additive
in the sense that the *seal* only ever appears for `true` — but the *absence of any mark* claim
in this doc's Pass Criteria is what the ghost circle contradicts.

### Step 5 — verified season page (Hebrew)

`/ranking/player/577fc06d-b33e-4118-ba11-610baeddac0c` (LoadTest Player00007) rendered the solid
seal at the RTL reading end of the name (visually to the name's left), `title="מאומת על ידי
Rally"`, `data-verified="true"`. **PASS.**

### Step 6 — unverified season page (Hebrew)

`/ranking/player/13622bbd-5f47-4d8b-82f9-07f77ce5157d` (LoadTest Player00009 — same band/rank/
points as Player00007, the ideal control) rendered a dashed **ghost** circle
(`data-testid="verified-seal-ghost"`) **plus the visible Hebrew text "לא מאומת"** ("not
verified") next to the name, wrapped in a `data-verified="false"` span with
`title="הרמה עוד לא מאומתת"`. `document.body.innerText` confirms the string is genuinely
rendered (not merely present as an `aria-hidden` decoration): `"…LoadTest Player00009\nלא
מאומת\n…"`.

- **Under this doc's literal Step 6 instruction** ("neither a seal nor a 'not verified' ghost
  mark") — **FAIL**. A ghost mark, with an explicit "not verified" label, is exactly what
  rendered.
- **Under task-9-brief.md's three-way rule** (a `false` row must render the false-state DOM
  marker, matching the API's false count) — **PASS**: `data-verified="false"` is present, as
  required, and it renders the documented ghost design from `VerifiedSeal.tsx`/
  `VerificationMark.tsx`, not an ad-hoc or accidental element.

No null-verified rows existed in this run's ground truth (0 of 37), so the "a `null` row renders
neither mark" leg of the three-way rule was **not exercised** on this data — noted as a gap, not
assumed to hold.

### Personal card, signed in (Hebrew, three-way + live rendering)

Session minted via `POST /v1/auth/login` with the `E2E_EMAIL`/`E2E_PASSWORD` from
`rally-mobile/e2e/.env.e2e` (never typed into the app), reshaped into a supabase-js v2 session,
written to the gitignored `.superpowers/e2e-session.json`, and injected by having the page fetch
it via `/@fs/<abs path>/...` and `localStorage.setItem('rally-web.supabase.auth', ...)` — per
this doc's existing recipe. Navbar avatar changed from "Sign in" to "ET" initials, confirming
`myId` is set.

As `E2E Tester` (now verified, reliability 91 — see Step 0 note above; this differs from the
2026-09-09 run, where the same account was unverified at reliability 40), the personal card
rendered: "המקום שלך בדירוג הכללי" (your position in the global ranking), rank 1, "מקום 1 ברמה
B", "8 נקודות מטורניר אחד", the level note **"הרמה שלך מאומתת"** ("your level is verified") with
the solid seal (`showLabel={false}` here — the seal plus this sentence, no separate "Verified"
word), and the reliability line **"אמינות הרמה 91%"** — exactly one `%`, matching
`level_reliability: 91` exactly. `data-verified="true"` on the mark, 1 seal / 0 ghosts on the
card. **PASS**, and consistent three-way behavior on a fourth surface.

**Not exercised:** `PersonalCard.tsx`'s *combined* reliability+target line (rendered only when
the viewer's **own** `level_verified === false`: `"אמינות הרמה {{pct}}% · מאומת ב-{{pct}}%"`,
two percentages in one sentence — the highest-risk spot for a double `%` or RTL mirroring bug)
could not be reached live: the only e2e credential available (`e2e-tester@rallypadel.app`) is
currently verified, and no unverified test account's credentials are available. Not seeded or
faked — recorded as a genuine gap, inferred-but-unobserved for this specific composite string.
The single-percentage half of the same mechanism (`level.reliability` alone) **was** observed
live above ("אמינות הרמה 91%"), via the identical `t(key, { pct: ltrIsolate(...) })` call path.

### Hebrew rendering, confirmed live (not just template inspection)

The task specifically asked to stop trusting template inspection for Hebrew and check the real
DOM. Found the reachable instance of the `{{threshold}}`-style interpolation at the public
`/level` page (`LevelPage.tsx`, uses the same `EXPLAINER_BLOCKS`/`explainerBlocks.ts` as the
sign-in-gated `LevelExplainerSheet`) — no sign-in required, not covered by any earlier run.
Live `document.body`text (Hebrew active) for the "מאומת" (Verified) explainer card:

> כשאמינות הרמה מגיעה לסימון — 86% — הרמה שלכם מקבלת את החותמת. רוב השחקנים מגיעים לשם אחרי
> כ-15 משחקים מדורגים, בערך 3 טורנירים.

Checked programmatically, not just visually:
- Exactly **one** `%` character in the sentence.
- The threshold renders as the literal number **86** — no leftover `{{threshold}}` template tag.
- The `"86%"` substring is wrapped in real bidi isolate control characters — `U+2066` (LEFT-TO-
  RIGHT ISOLATE) immediately before it and `U+2069` (POP DIRECTIONAL ISOLATE) immediately after,
  confirmed via `[...text].map(c => c.codePointAt(0))`. This is `ltrIsolate()` doing its job for
  real, not merely present in source — the number reads "86%" left-to-right inside the RTL
  sentence rather than being reordered by the browser's bidi algorithm. Screenshot taken
  in-session confirms the same visually ("86%" reads correctly, not "%68" or similar).

`/ranking/how` (Hebrew, `HowScoringPage.tsx`) was not re-checked this run — it was already
confirmed against the `CONFLATION_PHRASES` regexes on 2026-09-09 and nothing under `src/` changed
that copy since (re-verified via `grep -rn "בהובלת" src` → no hits, see below).

### `web-plan` "Done when" spot-checks (informational, not fixed — out of this task's scope)

- `grep -rn "level_verified ?" src --include="*.tsx" | grep -v test` → **2 hits**, both in
  `PersonalCard.tsx` (lines 191, 202), both inside a `card.level_verified != null` guard (not
  bare truthiness — `true`/`false` are branched explicitly, `null` is excluded upstream). The
  plan's "Done when" wants this grep empty; it isn't. Flagging for the plan owner — not a
  regression introduced by this run, and not something this e2e-only task modifies.
- `grep -rn "בהובלת" src` → no hits. Clean.

### Result

**PASS** under `task-9-brief.md`'s three-way DOM-vs-API split, on every surface exercised (board,
verified season page, unverified season page, personal card): counts and identities matched the
API exactly, in both directions, everywhere the three-state rule applies. **FAIL** under this
doc's own Step 6 wording and Pass Criteria prose, which still describe the two-state/additive-
only design the codebase has since moved on from (spec §8 → §4, per `VerificationMark.tsx`). Not
weakened to force a pass — recorded as a documentation-staleness finding for the plan owner to
resolve by rewriting Step 6/Pass Criteria, not by re-testing.

**Gaps carried forward:** (1) no `null`-verified row existed in this run's data, so "a null row
renders neither mark" was not exercised on live data. (2) `PersonalCard`'s two-percentage
combined reliability+target sentence was not reachable live for lack of an unverified test
account.

**Artifacts:** `ranking-06-mixed-board-2026-09-10-he.png` (mixed-board zoom: two solid seals next
to one dashed ghost, all three rows otherwise identical).

---

## Fourth run (2026-09-10, build `f2fa07d1`) — re-run against the code that actually ships

**Why this run exists.** The third run above was recorded in commit `6effb10`, i.e. it exercised
the tree *before* two source commits landed: `649f88c` (the season page shows reliability, for any
player) and `f2fa07d1` (`describeLevel`: an explicit `null` is "unknown", not "unverified"). A gate
that ran against code you are not shipping is not a gate. `git diff --name-only 6effb10..f2fa07d1`
= 5 files (`describeLevel.ts` + its test, `types/api.ts`, `PlayerSeasonContent.tsx` + its test);
**no `src/i18n/` file changed**, which is why `/ranking/how`'s copy was not re-checked here — the
third run's finding on it still stands unaltered.

### Build under test — proven from the served bundle, not from `git log`

A Vite dev server that was already running is not proof it is serving the current commit, so the
two new commits were confirmed by fetching the **transformed modules Vite actually serves**:

```bash
curl -s http://localhost:5175/src/components/players/level/describeLevel.ts
#   → contains `if (verified == null)`      (f2fa07d1's widened guard)   ✓
#   → does NOT contain `verified === undefined` (the pre-f2fa07d1 guard) ✓
curl -s http://localhost:5175/src/features/leagueRanking/components/PlayerSeasonContent.tsx
#   → contains `data-testid="player-season-reliability"` and `ltrIsolate` (649f88c) ✓
#   → does NOT contain `reliabilityTarget` (deliberately omitted on this page)      ✓
```

Worktree `.worktrees/rally-web-lr`, branch `feat/level-and-ranking`, `HEAD = f2fa07d1`, tracked
tree clean (only `?? node_modules`).

### Stack (confirmed, not re-staged)

rally-api on `:8080` from the `rally-api-rating` worktree — process cwd read from `lsof`, not
inferred from the port. Supabase project ref parsed out of that process's `.env`:
**`kilrlotagthshoibzjng` (dev)**, re-confirmed independently by an avatar URL inside a live
participants payload pointing at the same ref. `GET /health` → 200. `OPTIONS
/public/league/standings` with `Origin: http://localhost:5175` → **200** (the `CORS_ORIGINS` trap
from the second run is still handled). rally-web on `:5175`, that process's cwd also verified via
`lsof` to be the worktree above. Worktree `.env` has `VITE_API_BASE_URL=http://127.0.0.1:8080` —
not Metro's `:8081`. Nothing was edited.

### Step 0 (API ground truth, re-derived fresh)

`GET /public/league/standings?frame=global&offset=0` → **37 rows**, **2** `true`, **35** `false`,
**0** `null`:

- `577fc06d-b33e-4118-ba11-610baeddac0c` — **LoadTest Player00007**, band B, rank 1, reliability **91**
- `b9607589-7dd6-4d5f-8f17-3d1428cdea79` — **LoadTest Player00008**, band D, rank 27, reliability **86**

**`E2E Tester` (`ad1070ab…`) has drifted back to `false` / reliability 40** — it read `true`/91
during the third run a few hours earlier. That is the third consecutive run in which this account's
state changed. Identities are not fixtures; re-derive them in Step 0 every time. (It is also what
made the `PersonalCard` gap below closable this run.)

### Steps 1–4 (board, Hebrew, signed out) — PASS

DOM at `/ranking`: `[data-verified]` → **37** (= row count, consistent with 0 `null` rows),
`[data-verified="true"]` → **2**, `[data-verified="false"]` → **35**,
`[data-testid="verified-seal"]` → **2**, `[data-testid="verified-seal-ghost"]` → **35**. The two
`true` nodes were **LoadTest Player00007** and **LoadTest Player00008** — the exact Step 0 set, no
extra, none missing, in both directions. Seal `title="מאומת על ידי Rally"`, ghost
`title="הרמה עוד לא מאומתת"`.

**Mixed-board proof:** the three rank-1 / 8-point / band-B rows — `E2E Tester`,
`LoadTest Player00007`, `LoadTest Player00009` — are identical in every ranking respect. Per-row
DOM: Player00007 → 1 seal / 0 ghosts / `data-verified="true"`; the other two → 0 seals / 1 ghost /
`data-verified="false"`.

### Step 5 — verified season page (Hebrew) — PASS, plus 649f88c's new line

`/ranking/player/577fc06d…` (LoadTest Player00007): `data-verified="true"`, 1 seal, 0 ghosts, the
word **"מאומת"**, `title="מאומת על ידי Rally"`.

**New this build (`649f88c`):** `[data-testid="player-season-reliability"]` renders
**`"אמינות הרמה ⁦91%⁩"`** — asserted programmatically, not by eye:

- exactly **one** `%`;
- the value **91** matches the API's `level_reliability: 91` exactly;
- `[...text].map(c => c.codePointAt(0))` shows `8294` (U+2066 LRI) immediately before `9 1 %` and
  `8297` (U+2069 PDI) immediately after — `ltrIsolate()` working for real in the RTL sentence;
- **no target clause**: `/מאומת ב-/` and `/Verified at/i` both absent from `document.body.innerText`,
  and the line contains no `·` separator. This page is always about somebody else, and 649f88c
  deliberately omits the self-only "you have this far to go" half.

### Step 6 — unverified season page (Hebrew) — PASS, and a boundary the unit tests miss

`/ranking/player/13622bbd…` (LoadTest Player00009 — same band B, same rank 1, same 8 points, same
1 tournament as Player00007, so the only difference on the page is the mark): `data-verified="false"`,
**0** seals, **1** ghost, the visible words **"לא מאומת"**, `title="הרמה עוד לא מאומתת"`.

**Boundary case, live, not covered by `playerSeasonPage.test.tsx`:** this player's
`level_reliability` is **`0`**. The unit tests pin 91, `null` and 40; `0` is exactly the value a
truthiness guard would swallow. `ReliabilityLine` guards on `player.level_reliability == null`, and
the live DOM confirms the correct behaviour — the line renders **`"אמינות הרמה ⁦0%⁩"`**, codepoint
`48` (`'0'`) present and wrapped in the same U+2066/U+2069 isolates. **A real reliability of 0 is
shown, not hidden.**

### English/LTR re-check of the season page (the new line had never been seen in LTR)

The 2026-09-09 run closed the LTR season-page gap, but `649f88c` added a *new string* to that page
afterwards, so its LTR rendering was unconfirmed. Re-run with `rallyLang=en` (switched back to `he`
afterwards): `<html lang="en" dir="ltr">`, header "LoadTest Player00007 | Verified", mark
`data-verified="true"` with `title="Verified by Rally"`, and the mark **follows the name in DOM
order** (`compareDocumentPosition` → FOLLOWING), i.e. the LTR reading end. The reliability line
reads **`"⁦91%⁩ level reliability"`** — byte-identical to the string
`playerSeasonPage.test.tsx` asserts, isolates included, one `%`, no target clause.

### Personal card, signed in (Hebrew) — closes the third run's gap (2)

Session minted via `POST /v1/auth/login` with `E2E_EMAIL`/`E2E_PASSWORD` from
`rally-mobile/e2e/.env.e2e` (never typed into the app, never echoed), reshaped into a supabase-js v2
session, written to the gitignored `.superpowers/e2e-session.json` (`git check-ignore` confirmed
before writing), and injected by having the **page** fetch it over `/@fs/…` and
`localStorage.setItem('rally-web.supabase.auth', …)`. Navbar switched from "התחברות" to the "E"
avatar.

The third run recorded this as unreachable: *"`PersonalCard`'s combined reliability+target line …
could not be reached live: the only e2e credential available is currently verified."* Because
`E2E Tester` has since drifted back to `level_verified: false` / reliability 40, **it is reachable
now, and it rendered**:

> אמינות הרמה ⁦40%⁩ · מאומת ב-⁦86%⁩

Asserted by codepoint, since this is the highest-risk spot in the feature for a doubled `%` or a
bidi-mirroring bug — two numbers in one RTL sentence:

- exactly **two** `%` characters — one per number, not a doubled `%` on either;
- **40** matches the API's `level_reliability: 40`; **86** is the verification threshold;
- **both** numbers are individually isolated: `8294 … 4 0 % … 8297`, then `· `, then
  `8294 … 8 6 % … 8297`. Neither isolate is dropped, and they do not nest or leak.

Card also: `data-verified="false"`, 0 seals, 1 ghost, level-status line **"הרמה שלך עדיין מתגבשת"**
— all three consistent with `level_verified: false`.

### The `null` case — the third run's gap (1). Closed on the *rule*, still open on the *code path*

**First, plainly: a live source of `level_verified: null` does exist in dev data, and the observable
third-row rule ("renders nothing at all") was exercised against it — but f2fa07d1's widened
`describeLevel` guard was still not reached, because two other short-circuits fire first.** Those
are two different claims and this entry keeps them apart on purpose.

**Where the `null`s are.** Neither league surface has any: standings → 0 of 37, player network → 0
of 119. They live on tournament participants. Sweeping
`GET /rally/v1/tournaments/{id}/participants?limit=100` across **all 45** tournaments visible to
the signed-in viewer (`scope=open` + `scope=past`; note the list route needs the trailing slash and
caps `limit` at 50, while the participants route takes 100) gives **295 player rows**:

| `level_verified` | rows |
|---|---|
| `false` | 260 |
| `null` | **35** |
| `true` | 0 |

**Every one of the 35 `null` rows is `is_guest: true`, and every one also has `skill_level: null`
and `level_reliability: null`.** That is the shape f2fa07d1's commit message describes: a guest has
no player row, so the API declines to make a claim rather than asserting a negative.

**Exercised live** on `/tournaments/449b63ad-f844-450a-8464-1f646379aa87`
("טורניר צהריים- רמות c1-c2"), signed in, after clicking "הצג הכל (12)" to render all 12 pairs
(`ParticipantsSection` shows only `INITIAL_VISIBLE = 3` at first — an easy way to under-count):

- **API:** 24 player rows = 21 non-guest (all `level_verified: false`, `skill_level` non-null) + **3
  guests** (`null` / `null`) — `אסף קוניו`, `שי צמח`, `הראל קראנטי`.
- **DOM:** `[data-testid="level-chip"]` → **21**, *all* `data-state="unverified"`. And
  `[data-verified]` → **0**, `verified-seal` → **0**, `verified-seal-ghost` → **0**, chips whose
  text is an em dash (`data-state="none"`) → **0**.
- **Per identity:** each of the three named guests resolves to a row whose full text is just
  initials + name (`"אק אסף קוניו"`, `"שצ שי צמח"`, `"הק הראל קראנטי"`) — 0 chips, 0 marks, 0
  seals, 0 ghosts, no em dash, no "לא מאומת" text. The ideal control sits in the same pair card:
  `"קובי בן סעדון 3.06"`, 1 chip, `data-state="unverified"`.

So the third row of the pass table — **`null` → nothing at all** — now holds on live data, in both
directions, with a same-card control.

**What this still does NOT prove.** The `null` rows never reach `describeLevel`'s widened guard,
for two *independent* reasons, either of which alone would short-circuit it:

1. `ParticipantsSection.tsx:27` renders the chip only `{!player.is_guest && player.skill_level != null && …}` — the guest is excluded before `describeLevel` is called at all;
2. even without that guard, `skill_level: null` makes `describeLevel` return `{state:'none'}` on its
   *first* line, before the `verified` argument is examined.

Enumerating every non-test call site that could feed a `null` `verified` **together with a non-null
level** — the only combination that reaches `if (verified == null) return {state:'unknown'}`:
`Navbar.tsx:267` and `EditProfilePage.tsx:115,221` (the viewer's own profile — this viewer's is
`false`, not `null`) and `PartnerSection.tsx:169` (player-search results, the one call site with no
`is_guest` guard — but search returns players, who have rows). `LevelPage.tsx` passes literals.
**No live dev data reaches that branch on any web surface**, so it remains covered by
`describeLevel.test.ts`'s `[4.2, null, …]` unit cases only. Recorded as still-not-exercised rather
than implied to have passed. Nothing was seeded or edited to manufacture it.

### Result

**PASS** on every surface exercised, under the three-way rule stated in the SUPERSEDED footer
below: board, verified season page, unverified season page (incl. `reliability: 0`), English/LTR
season page, signed-in personal card (incl. the two-percentage combined line), and tournament
participants (the `null`/guest surface). DOM counts and identities equalled the API's in both
directions everywhere the rule applies.

As in the third run, this is a **FAIL against this document's own Step 6 / Pass Criteria prose**,
which still describes the retired two-state "no mark of any kind for `false`" design. Left
deliberately un-rewritten for the plan owner — see the SUPERSEDED footer.

**Gaps carried forward:**

1. `describeLevel(level, null, …)` with a **non-null** level is still unreachable on live dev data
   (see above) — the `unknown` state is unit-tested only.
2. The board and the globe were exercised in Hebrew only this run; the LTR confirmation for those
   two surfaces still rests on the 2026-09-09 run. Only the season page was re-checked in LTR here,
   because only it gained new copy.

**Artifacts:** `ranking-07-guest-null-2026-09-10-he.png` — pair card #2 of tournament `449b63ad…`:
`קובי בן סעדון` with his dashed `3.06` pill directly above the guest `אסף קוניו`, who carries
nothing at all where the pill would be. That single image is the `false`-vs-`null` distinction.

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
