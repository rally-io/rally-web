# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note:** The root `README.md` is stale — it describes an earlier vanilla-HTML version of this site. The current codebase is a React + Vite SPA. Trust the code, `package.json`, `HANDOFF.md`, and `docs/` over that README.

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
Run a single test by name: `npx vitest run -t "test name pattern"`

The app crashes at module load if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing — copy `.env.example` → `.env` (or `.env.local`) and fill in real values before `npm run dev`.

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
- **`AppSessionContext`** (`src/contexts/AppSessionContext.tsx`) — Composite "is the user ready to use the app?" state. Fetches `onboarding-status` and `player-profile-me` via React Query, derives a single `status` enum (`loading | signed_out | profile_error | profile_incomplete | ready`). **Also wires the axios bridge** (see below) so the API client can navigate/sign-out from outside React.
- **`AuthGateContext`** (`src/contexts/AuthGateContext.tsx`) — Imperative `requireSignIn()` returning a `Promise<void>`. Any page can `await requireSignIn()` before a guarded action; the `<AuthGateModal/>` mounted in `App.tsx` resolves the promise when the user signs in, rejects with `USER_CANCELLED` on dismiss.

### API layer (`src/services/api/`)

- **`client.ts`** — Axios instance with two interceptors:
  - **Request:** stamps `X-Rally-Client: web` on every call (the backend reads this to redirect Grow payment callbacks to the web return URL instead of the mobile `app.rallypadel://` deep link — see `docs/PAYMENT_BACKEND_DELTA.md` §1). Attaches Supabase access token unless `X-Skip-Auth` header is set.
  - **Response:** rejects on non-2xx. On 401 with a recognizable auth-error message, calls `_bridge.forceSignOut()`. On 403 with `PROFILE_FIELDS_REQUIRED`/`PLAYER_NOT_FOUND`, calls `_bridge.redirectToProfileEdit()`. The `_bridge` is set by `AppSessionContext` via `__setApiBridge()` — this keeps axios free of React imports.
- **Per-resource modules** (`auth.ts`, `bookings.ts`, `tournaments.ts`, `payments.ts`, `clubs.ts`, `events.ts`, `profile.ts`) — All exported functions return `ApiResponse<T>` (`{success: true, data} | {success: false, error: {code, message, details}}`). They wrap the axios call in try/catch and **normalize thrown rejections into the failure shape**, so UI callers can use `if (!r.success)` uniformly without try/catch.

### Routing (`src/App.tsx`)

Two route groups:
- **Bare auth screens** (no `Layout`): `/login`, `/auth/callback`, `/auth/verify-email`, `/auth/welcome`, `/auth/forgot-password`, `/set-password`.
- **App shell** (wrapped in `<Layout/>`): everything else, including marketing pages, tournaments, clubs, profile, and payment routes.

`AuthGateModal` is mounted once at the top of `App` so any page can trigger it.

### Payments

Grow (Meshulam) hosted checkout. Authoritative source is the server webhook, never the browser.

- API wrappers in `src/services/api/payments.ts` cover §3 of `docs/PAYMENT_SPEC.md`. Notable details:
  - `save_card` is forwarded only on `booking` initiate; silently dropped for other entities.
  - `use_credits` is forwarded only for `tournament_registration`.
  - 402 declines from `chargeSavedCard` are normalized to `{code: 'PAYMENT_DECLINED', details: {status: 402}}`.
- Pages (`src/pages/payment/`): `PaymentMethodPage`, `PaymentReturnPage`, `PaymentConfirmingPage`, `PaymentFailedPage`.
- `useEntityPolling` (`src/hooks/useEntityPolling.ts`) polls the entity status every 3s for up to 10 attempts on the confirming screen; falls back to "confirmed" if the entity disappears after first being seen (handles transient backend errors).
- `docs/PAYMENT_SPEC.md` (full flow) and `docs/PAYMENT_BACKEND_DELTA.md` (rally-api side contract) are the source of truth — read these before touching payments.

### i18n

- `react-i18next`, two locales: `src/i18n/locales/he.json` (default) and `en.json`. Selection persisted in `localStorage` under key `rallyLang`.
- `<App/>` flips `dir="rtl"` when `i18n.language === 'he'`. All visible UI text must go through `t('key.path')` — no hardcoded HE/EN in JSX. RTL layouts must be mirrored correctly.
- Test setup forces English (`src/test-setup.ts` calls `i18n.changeLanguage('en')` in `beforeAll`).

### UI

- Tailwind v4 via the `@tailwindcss/vite` plugin (no `tailwind.config.js`).
- Component primitives in `src/components/ui/` — Radix-based building blocks (button, dialog, sheet, tabs, toast, etc.).
- Toast system: `useToast` + `<Toaster/>` (already mounted in `Layout`).

### Testing

- Vitest + jsdom + Testing Library. Setup file: `src/test-setup.ts`.
- Mocking axios responses: tests under `src/services/api/*.test.ts` mock the `./client` default export. Tests under `src/pages/**/*.test.tsx` mock the per-resource API modules.

## Product rules baked into the UI (do not undo)

From `HANDOFF.md` §4 — these were explicit product decisions:

1. **No scarcity signals** — never show available-seats counts, "X spots left", or fillness bars on tournaments. Goal is max registrations for data collection.
2. **No feature reveals on `/crm`** — competitor-sensitive. Screens are intentionally blurred; copy is intentionally vague.
3. **Phone numbers** display in international format (country code on the left, then digits); placeholder is RTL-aware.
4. **Hebrew terminology** — "מחבט" (not "רקטה") for racket; "נוקאאוט" (not "הדחה") for knockout-style brackets.
5. **Partner flow on tournament detail is invite-first** — invitation form expanded by default; existing-player search collapsed behind a `+` button.
6. **Sticky CTA on tournament detail** must be action-first, never blocking — when partner is missing, button says "מלאו את הפרטים" and scrolls to the partner section instead of disabling.
