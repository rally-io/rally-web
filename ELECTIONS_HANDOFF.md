# /elections ("בחירות 2026") handoff

Campaign landing page: vote for Israel's best padel **club** (one location) and best **chain**. Each user gets one vote. Every voter enters a raffle for a Bullpadel racket, and the winner is announced on 15.11 in the Rally WhatsApp community.

The front end is complete. **The only missing piece is the backend vote API.** Until it exists, the page runs on a localStorage mock behind `VITE_ELECTIONS_MOCK=1`.

## Flow (vote first, sign in last)

1. `/elections`: the hero, an animated "live poll" teaser (decorative, no numbers, labelled as illustration), the prize, a countdown and the CTA.
2. `?step=club`: search box, region chips and 61 club ballots.
3. `?step=chain`: 10 chains (the 9 multi-branch brands plus Padel Center). This ballot can be skipped (`chain_id: null`).
4. `?step=review`: "שלשלו לקלפי". If the user is signed out, it calls `requireSignIn()`.
5. The ballot drops into the ball, then the thank-you screen with the WhatsApp community CTA and share.

Sign-in happens only at the moment of casting. The ballot is parked in `localStorage` (`rally.elections.pendingVote`, 3-day TTL, ids validated against the ballot list) so it survives each sign-in path:

| Sign-in path | What happens |
|---|---|
| Email inside the modal | The session appears, then `my-vote` loads and returns null, then the parked ballot is cast automatically. |
| Google (full-page redirect) | `rally:auth-return` brings the user back to `/elections`, then the same auto-cast runs. |
| Email sign-up with verification (opens in a new tab) | `AuthCallbackPage` falls back to `/elections` when a parked ballot exists, then the same auto-cast runs. |
| User closes the modal | The parked ballot is cleared. |

A signed-in user who already voted sees the thank-you screen with their recorded vote. A `409` on submit is treated the same way.

## Backend to build (rally-api)

The page only talks to `src/services/api/elections.ts`, so wiring the real endpoints happens there and nowhere else.

```
GET  /rally/v1/elections/:electionId/my-vote
     -> 200 { success: true, data: { club_id, chain_id } | null }

POST /rally/v1/elections/:electionId/vote
     body { club_id: string, chain_id: string | null, attribution: { utm_*, fbclid, gclid, ... } }
     -> 201 { success: true, data: { club_id, chain_id } }
     -> 409 { success: false, error: { code: 'ALREADY_VOTED' } }
     -> 400 { success: false, error: { code: 'INVALID_CHOICE' } }   // id not on the ballot
     -> 403 { success: false, error: { code: 'VOTING_CLOSED' } }    // after 14.11 23:59 IL
```

- `electionId` is `'2026'`.
- The user comes from the bearer token. Please **don't require a complete player profile** to vote: a 403 `PROFILE_FIELDS_REQUIRED` redirects the user to `/profile/edit`, which drops the voter in the middle of the funnel.

Suggested table:

```sql
create table election_votes (
  election_id text        not null,
  user_id     uuid        not null references auth.users(id),
  club_id     text        not null,
  chain_id    text,
  attribution jsonb,
  created_at  timestamptz not null default now(),
  primary key (election_id, user_id)          -- one vote per user
);
```

- The allowed ids are the `id` fields in `src/features/elections/ballotData.ts` (61 clubs, 29 brands). Chains are `CHAINS` in `config.ts`: brands with `branches > 1` plus `CHAIN_OVERRIDES` (Padel Center). Copy the lists to the server, or check against a static JSON. **Never rename an id once voting is open.**
- Raffle export on 15.11: voters joined to their name and phone. Draw from that pool only. The racket-raffle legal checklist from October still applies: free entry, record the draw, give the winner 48h before a redraw, publish only the first name and last initial.

## Before going live

- [ ] Endpoints deployed, `VITE_ELECTIONS_MOCK` unset in Vercel production.
- [ ] Confirm the WhatsApp community link (`WHATSAPP_COMMUNITY_URL` in `src/features/elections/config.ts`).
- [ ] Confirm the close date (`ELECTION_CLOSES_AT`, currently 14.11.2026 23:59 IL). After it passes, the page shows a "הקלפי נסגרה" screen.
- [ ] Club list: 4 venues are still unverified and left out (Tacti Padel, Top Padel Nahariya, Rananim rooftop, Givat HaShlosha). Also confirm whether Herzliya Ramat Yam belongs to Top Padel or Steele's. Source: `Social/studio-brief-2026-09/clubs-vote/clubs.csv`.
- [ ] Logos: `public/elections/logos/<brand-id>.webp`, listed in the `LOGOS` set in `config.ts`. A brand without a file shows a lettermark tile.
- [ ] Raffle terms link, if legal wants one on the page.

## Analytics

Events go through `trackElections(step)` in `src/lib/analytics.ts`: Meta custom event `Elections2026 {step}` plus GA4 `elections_<step>`. The steps are:

- `start`
- `pick_club`
- `pick_chain`
- `signin_prompt`
- `vote`
- `whatsapp_click`
- `share`

A successful vote also fires `trackLead('elections', { segment: 'vote' })` (pixel + CAPI). Use it as the optimisation event for the campaign ads.

## Share preview

`/elections` is rewritten to `api/elections-og.ts`, which injects the title, description and `public/og-elections.jpg` (cropped from the campaign post).

## Optional follow-up

The sign-in modal subtitle is generic ("register, book courts…"). A vote-specific line such as "התחברו כדי שהקול שלכם ייספר" would likely lift conversion. That needs `requireSignIn({ reason })` threaded through `AuthGateContext` into `AuthGateModal`. I left it out to keep this PR off the shared auth code.

## Files

- `src/pages/ElectionsPage.tsx`: the step machine (bare route, no navbar).
- `src/features/elections/`: ballot data, config, components, `pendingVote`/`draftVote` storage, `useElectionVote`, CSS.
- `src/services/api/elections.ts`: the API seam and the mock.
- `api/elections-og.ts` and `vercel.json`: link preview.
- `src/pages/auth/AuthCallbackPage.tsx`: return to `/elections` after email verification.

Tests: `src/pages/ElectionsPage.test.tsx`. On Node 26+, run vitest with `NODE_OPTIONS=--no-experimental-webstorage`. Node's built-in `localStorage` otherwise shadows jsdom's, and every localStorage test in the repo fails. This is not specific to this page.
