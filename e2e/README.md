# rally-web e2e

Browser-driven checks for the PUBLIC ranking pages, following the pattern proven by
`rally-api/.claude/skills/crm-e2e-harness`. These pages need no login, so a flow is:
navigate → assert against API ground truth → screenshot.

**Dev only.** The site must point at the dev API. Never run against production.

**Run from a dedicated git worktree, never from the shared `rally-web` checkout.** A Vite
dev server serves whatever is on disk, so if someone switches the shared checkout to
another branch mid-run, the still-running server silently starts serving that branch — the
routes under test render the app's "Coming Soon" placeholder and the navbar loses its
entries, with no error anywhere. This happened on 2026-09-08; see the "Second run" section
of `ranking-verification.md` for the setup commands and for the matching `CORS_ORIGINS`
trap that comes with serving on a non-standard port.

Flows live beside this file, one Markdown file each, executed by an agent with the
Claude-in-Chrome tools. Screenshots are evidence for review, never assertions — the
pass/fail comes from comparing the DOM against the API response, not from eyeballing a
picture.

## The `VITE_API_BASE_URL` trap (read this before running anything)

`rally-web/.env` and `.env.example` can drift, and when they do, the failure is silent:

- `.env.example` documents `VITE_API_BASE_URL=http://localhost:8080` (the real API).
- A checked-out `.env` was found pointing at `http://127.0.0.1:8081` instead — **8081 is
  Metro**, the React Native/Expo bundler, not the API.
- Metro returns **HTTP 200 with Expo's app HTML for every path**, including API routes
  that don't exist on it. A web page calling the "API" through port 8081 gets a 200 back
  and silently renders garbage (or nothing), and nothing in the network tab's status
  column tells you anything is wrong.

Before running a flow:

1. Check what `rally-web/.env` actually has: `grep VITE_API_BASE_URL .env`.
2. If it's not the API you intend to test against, **do not edit `.env`** — it's the
   developer's own config. Override it for the dev server process instead:
   `VITE_API_BASE_URL=http://127.0.0.1:8080 npm run dev`.
3. In every assertion, verify response **content** (a real JSON payload shaped like the
   endpoint's schema), never just the HTTP status code. A 200 proves nothing on this
   stack.

## Practical browser-driving lesson

A `find`/query tool call issued immediately after `navigate` can hallucinate — it may
report elements that match the pre-navigation page, or miss ones that haven't painted
yet. Always `scroll_to` (or otherwise wait for) the target element first, and only then
`find`/query it.

## Layout

- `ranking-verification.md` — flow: verification seal on `/ranking`,
  `/ranking/player/:id`, `/ranking/how` and the signed-in personal card.
- `player-network-verification.md` — flow: verification seal on the globe's level chip
  (`/network`). Needs a signed-in viewer; the ranking flow does not.
- `artifacts/` — screenshots captured while executing a flow, named
  `<flow>-<step>-<slug>.{png,jpg}`. Kept as review evidence, not regenerated on every
  run.
