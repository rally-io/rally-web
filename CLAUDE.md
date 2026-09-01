# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Stale docs — trust the code first.** `README.md` describes an earlier vanilla-HTML version of this site; the current codebase is a React + Vite SPA. `HANDOFF.md` is a pre-launch checklist whose §1 ("the mock toggle") is **already done** — `src/mocks/` and `VITE_USE_MOCK` no longer exist. Its §4 product decisions are still authoritative and are restated at the bottom of this file. `docs/PAYMENT_WEB_GAP_SPEC.md` describes a web payment flow that has since been removed.

## Skill discovery — do this first, every task

Before starting any non-trivial task, scan the available skills list (provided in the `<system-reminder>` at session start) and invoke any that match — even if the user did **not** ask for a skill by name. Treat skill matches as default behavior, not an opt-in.

### How to match

Map the user's request to skill triggers, in this order:

1. **Slash command in the message** — if the user types `/<name>`, invoke that skill via the `Skill` tool. (Built-in CLI commands like `/help`, `/clear` are excluded.)
2. **Keyword/intent match against the skill descriptions** — read each skill's description and trigger keywords. Examples:
   - Building a UI page / component / artifact / poster → `frontend-design`.
   - Writing/reviewing/refactoring React or Next.js → `vercel-react-best-practices`.
   - Writing or reviewing Python style → `python-code-style`. Profiling slow Python → `python-performance-optimization`.
   - Working in `anthropic` / `@anthropic-ai/sdk` code, or anything Claude API / prompt-caching / model migration → `claude-api`.
   - Postgres queries, schema, or perf (the project uses Supabase Postgres) → `supabase-postgres-best-practices`.
   - User asks "how do I do X in Claude Code / hooks / slash commands / settings" → `claude-code-guide` agent.
   - Reviewing a PR / current diff → `code-review` (or `code-review:code-review`).
   - Security review of pending changes → `security-review`.
   - Verifying a fix actually works in the running app → `verify` (and `run` to launch the app).
   - Multi-step task with a spec/requirements → `writing-plans` before touching code.
   - Creating a *feature* with cross-cutting changes → `feature-dev:feature-dev`.
   - Creative work (new feature, new component, behavior change) → `brainstorming` **before** implementation.
   - Recurring task on an interval → `loop`. Cron-style scheduled remote agent → `schedule`.
   - Configuring `~/.claude/settings.json` / hooks / permissions / env vars → `update-config`. Keybindings → `keybindings-help`. Status line → `statusline-setup`.
   - Initializing/updating this very file → `init`.
   - User explicitly wants brevity / "less tokens" / "be brief" → `caveman`.
3. **No obvious match** — invoke `find-skills` to discover whether a less-obvious skill applies before falling back to plain tool use.

### Rules

- Invoke the matched skill **before** generating any other response about the task (blocking requirement of the `Skill` tool).
- Never mention a skill in chat without actually calling it.
- Only invoke skills that appear in the current session's available-skills list (or that the user typed as `/<name>`). Don't guess names.
- If a `<command-name>` tag is already in the conversation, the skill has already been loaded — follow its instructions directly, don't re-invoke.
- Don't invoke a skill that's already running.

## Commands

```bash
npm run dev          # Vite dev server on http://localhost:5174
npm run build        # tsc -b && vite build (typecheck then bundle)
npm run lint         # eslint .
npm run test         # vitest run (one-shot, used in CI)
npm run test:watch   # vitest watch mode
```

Run a single test file: `npx vitest run src/path/to/file.test.tsx`

### Visual harness for the live tournament board

`http://localhost:5174/preview.html` (dev only — `src/preview.tsx`, not routed, not emitted into
`dist`) renders the public live board's real components in the real TV shell at the real 1600×900
canvas, driven by fixture data. Query params, also togglable from the on-page controls:
`?theme=dark|light|gradient&groups=N&pairs=N&dq=1&long=0&lang=he|en&cols=N&played=0&phone=1`

`played=0` is the pre-start board (draw made, nothing scored) and `phone=1` swaps the TV canvas
for the phone layout — which renders a *different* component (`StandingsTable`, not
`GroupBoardCard`) for the same group, so a change to "the standings" usually needs both..

Use it for **any** change to `src/features/publicTournament` layout. Two things make it necessary
rather than convenient: the test suite runs in jsdom, which does no layout (`scrollWidth` and
`clientWidth` are always 0), so clipping and overflow cannot fail a test; and `/live/:token` needs
the rally-api backend plus a real share token, while no tournament in the database has more than
four pairs in a group — so the dense five/six-pair case is unreachable with real data.

Check a layout change by measuring, not eyeballing — on an unattended screen there is no scrollbar,
so overflow just silently eats a row:

```js
document.querySelectorAll('[data-testid="standings-list"]')
  .forEach(l => console.log(l.scrollHeight - l.clientHeight))   // 0 = fits
```

The shape to test is the worst one: `?groups=5&pairs=6&dq=1` (a disqualified row is the tallest
row, and a 3-across grid halves the card height).
Run a single test by name: `npx vitest run -t "test name pattern"`

The app crashes at module load if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing (`src/lib/supabase.ts` throws) — copy `.env.example` → `.env` (or `.env.local`) and fill in real values before `npm run dev`. `VITE_API_BASE_URL` is optional and defaults to `http://localhost:8080`.

Deployment is Vercel; `vercel.json` rewrites every path to `/index.html` so SPA deep links work. The `/clubs/:id` route is server-rendered for share previews by `api/club-og.ts`, which needs `API_BASE_URL` (falls back to `VITE_API_BASE_URL`) set in the Vercel project.

## Path alias

`@/*` resolves to `src/*` (configured in `tsconfig.json` and `vite.config.ts`/`vitest.config.ts`). Always import via `@/…` not relative paths across directories.

## Architecture

### Provider stack (`src/main.tsx`)

```
QueryClientProvider → BrowserRouter → AuthProvider → AppSessionProvider → AuthGateProvider → <App/>
```

The order matters. `AppSessionProvider` reads from `AuthProvider`; `AuthGateProvider` reads from `AuthProvider`; both must sit inside `BrowserRouter` because they call `useNavigate`.

### Three-context session model

- **`AuthContext`** (`src/contexts/AuthContext.tsx`) — Thin wrapper around Supabase auth. Owns `session`/`user`, exposes `signIn*`, `signUp*`, `signOut`, `requestPasswordReset`, `updatePassword`. Uses Supabase `flowType: 'implicit'` to match the mobile app's token shape; storage key is `rally-web.supabase.auth`. `signOut` uses `flushSync` so React 18 doesn't defer the `session=null` update and render a stale navbar.
- **`AppSessionContext`** (`src/contexts/AppSessionContext.tsx`) — Composite "is the user ready to use the app?" state. Fetches `onboarding-status` and `player-profile-me` via React Query, derives a single `status` enum (`loading | signed_out | profile_error | profile_incomplete | ready`). Also exposes `ensurePlayerProfile()` (resolves once a `players` row exists, rejects if the user cancels), `clearSession()` (drop cached profile queries *before* `signOut` to avoid a stale-data flash), and `__setBlockingHandlers` (how `ProfileCompletionModal` registers its imperative opener). **Also wires the axios bridge** (see below) so the API client can create a profile / sign out from outside React.
- **`AuthGateContext`** (`src/contexts/AuthGateContext.tsx`) — Imperative `requireSignIn()` returning a `Promise<void>`. Any page can `await requireSignIn()` before a guarded action; the `<AuthGateModal/>` mounted in `App.tsx` resolves the promise when the user signs in, rejects with `USER_CANCELLED` on dismiss.

### API layer (`src/services/api/`)

- **`client.ts`** — Axios instance with two interceptors:
  - **Request:** attaches the Supabase access token, unless the caller sets an `X-Skip-Auth` header (used by unauthenticated endpoints like `check-email`); the header is stripped before the request goes out.
  - **Response:** unwraps `response.data` on 2xx. On non-2xx it **rejects** with a plain object — `{status, code, message, details}`, plus `isUnauthorized` on 401 and `isNotFound` on 404. On 401 with a recognizable auth-error message it calls `_bridge.forceSignOut()`. On 403 with `PROFILE_FIELDS_REQUIRED` / `PLAYER_NOT_FOUND` it calls `_bridge.ensurePlayerProfile()` (which opens the blocking profile modal) and then **retries the original request once**, tagged via a `__retried` flag. The `_bridge` is set by `AppSessionContext` via `__setApiBridge()` — this keeps axios free of React imports.
- **Per-resource modules** (`auth.ts`, `bookings.ts`, `clubs.ts`, `profile.ts`, `tournaments.ts`) — thin wrappers typed as `ApiResponse<T>` (`{success: true, data} | {success: false, error: {code, message, details}}`).

  **They do _not_ try/catch.** A non-2xx response rejects the promise, so `if (!r.success)` only covers a 2xx body that reports failure — it will never run on an HTTP error. Every current caller is a React Query `queryFn`/`mutationFn`, which catches the throw and surfaces it as `error`. If you call one of these outside React Query, handle the rejection yourself.

  Gotcha: `registerTournament` lives in `profile.ts`, not `tournaments.ts`.

### Routing (`src/App.tsx`)

Two route groups:
- **Bare auth screens** (no `Layout`): `/login`, `/auth/callback`, `/auth/verify-email`, `/auth/forgot-password`, `/set-password`.
- **App shell** (wrapped in `<Layout/>`): marketing (`/`, `/crm`, `/level`, `/pricing`, `/contact`, `/coaches`, `/privacy`, `/terms`), store redirects (`/download`, `/app` — both `DownloadRedirectPage`), clubs (`/clubs`, `/clubs/:id`), tournaments (`/tournaments`, `/tournaments/summary`, `/tournaments/:id`), `/my-activity`, and a `*` catch-all.

Two modals are mounted once at the top of `App` so any page can trigger them: `<AuthGateModal/>` (sign-in gate) and `<ProfileCompletionGate/>` (blocking onboarding, used by both proactive guards and the 403 retry path above).

### Payments — removed from the web

There is no web checkout. Payment pages, `services/api/payments.ts`, `events.ts`, and `useEntityPolling` were deleted; tournament money flows happen in the mobile app. Web tournament registration is view-and-register only, and store links / deep links push users to the app.

- `src/constants/appLinks.ts` holds the App Store and Google Play URLs.
- `useDevicePlatform()` (`src/hooks/useDevicePlatform.ts`) returns `ios | android | desktop` so download CTAs target the right store (desktop shows both).
- `confirmZeroPayment` still exists in `tournaments.ts` for free tournaments — it carries a `BACKEND-CONFIRM` comment because mobile and the unification doc disagree on the endpoint. Keep it isolated so a swap stays one line.
- `docs/PAYMENT_WEB_GAP_SPEC.md` is historical context for what the web used to do; it does not describe current behavior.

### i18n

- `react-i18next`, two locales: `src/i18n/locales/he.json` (default) and `en.json`. Selection persisted in `localStorage` under key `rallyLang`.
- `<App/>` flips `dir="rtl"` when `i18n.language === 'he'`. All visible UI text must go through `t('key.path')` — no hardcoded HE/EN in JSX. RTL layouts must be mirrored correctly.
- Test setup forces English (`src/test-setup.ts` calls `i18n.changeLanguage('en')` in `beforeAll`).

### UI and the design system

- Tailwind v4 via the `@tailwindcss/vite` plugin. There is **no `tailwind.config.js`** — design tokens live in the `@theme` block at the top of `src/App.css`, which is where you add or change them.
- The site is **dark by default**. Use the `rally-*` tokens rather than raw Tailwind palette colors so pages stay consistent:
  - Surfaces `rally-bg` / `rally-surface` / `rally-surface-2`; text `rally-text` / `rally-text-2` / `rally-text-muted` (`rally-text-on-light` on light backgrounds).
  - Accents: electric lime `rally-accent` (`#ccff00`, primary CTA) and brand blue `rally-blue` (`#0055ff`), each with `-hover` and `-dim` variants.
  - Borders `rally-border-subtle` / `rally-border` / `rally-border-strong`; functional `rally-success|warning|error|info`; `shadow-glow-electric` / `shadow-glow-blue` for accent glows.
  - `electric-green` is a **legacy alias** mapped to the lime so older components still render — prefer `rally-accent` in new code.
- Fonts: `font-display` (Rubik) for headings, `font-body`/`font-sans` (Heebo) for body — both chosen for Hebrew support.
- Component primitives in `src/components/ui/` — Radix-based building blocks (button, card, dialog, sheet, tabs, toast, badge, skeleton, etc.).
- Toast system: `useToast` + `<Toaster/>` (already mounted in `Layout`).

### Testing

- Vitest + jsdom + Testing Library. Setup file: `src/test-setup.ts` (forces English).
- Coverage is currently partial and lives next to the code it tests: `src/components/{auth,tournaments}/*.test.tsx`, `src/contexts/AuthGateContext.test.tsx`, and `src/lib/*.test.ts`. There are no API-layer or page-level test suites yet.
- When adding tests: mock the per-resource module (`@/services/api/tournaments`) for component/page tests, or the `./client` default export when testing an API module directly.

## Product rules baked into the UI (do not undo)

From `HANDOFF.md` §4 — these were explicit product decisions:

1. **No scarcity numbers** — never render `available_seats`, "X spots left", or a fillness bar. Goal is max registrations for data collection. **Amended 2026-09-01** (product call, this rule was previously absolute): a tournament card shows **registered / capacity** — "12/16 זוגות רשומים" — always, on finished tournaments too (muted there), because a player sizing up a card needs the size of the draw, not just how many are in (`registrationSummary` in `src/lib/tournamentHelpers.ts`). An earlier iteration gated it on "at least half full" to avoid "0 registered"; that was dropped because it hid the draw size in exactly the cases players most need it. The "last spots" badge, which used to fire on every tournament with open registration, now fires only under 3 free seats (`isLastSpots`). The **seat count itself is still never printed**. Counts are **pairs**, not players, in a doubles draw — the API caps registrations, not people. The number pair is bidi-isolated: see `wiki/gotchas/web-rtl-score-string-mirroring`.
2. **No feature reveals on `/crm`** — competitor-sensitive. Screens are intentionally blurred; copy is intentionally vague.
3. **Phone numbers** display in international format (country code on the left, then digits); placeholder is RTL-aware.
4. **Hebrew terminology** — "מחבט" (not "רקטה") for racket; "נוקאאוט" (not "הדחה") for knockout-style brackets.
5. **Partner flow on tournament detail is invite-first** — invitation form expanded by default; existing-player search collapsed behind a `+` button.
6. **Sticky CTA on tournament detail** must be action-first, never blocking — when partner is missing, button says "מלאו את הפרטים" and scrolls to the partner section instead of disabling.
