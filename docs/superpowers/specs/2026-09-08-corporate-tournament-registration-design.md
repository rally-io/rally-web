# Corporate tournament registration page — design

**Date:** 2026-09-08 · **Status:** approved in conversation, awaiting written review
**Repos:** rally-api (one flag), rally-web (the page). rally-crm untouched (follow-up).
**Predecessor:** the Samsung / Dani-Shoval `/join/<slug>` lead pages
(`src/pages/CorporateSignupPage.tsx`, `src/constants/corporateEvents.ts`).

## 1. Goal

A branded, unlisted page at `rallypadel.app/join/<slug>` where a client's employees
**sign in or sign up, register a pair for a real tournament, and place the payment
hold** — instead of leaving a row in the leads Google Sheet for staff to hand-insert.

Same look and brief as the Samsung page: no site nav, no app-download gate, the
client's hero, Hebrew copy. Different plumbing: every submission is a
`tournament_registrations` row with a Grow pre-auth on it.

## 2. What already exists (observed on rally-web `main`, 2026-09-08)

All three legs run today on `src/pages/TournamentDetailPage.tsx`:

| Leg | Mechanism | Files |
|---|---|---|
| Sign in / up | `useAuthGate().requireSignIn()` opens `AuthGateModal` (Google OAuth, email sign-up, email sign-in); resolves when a session exists. The modal is mounted at `App.tsx:62`, **outside** `<Layout>`, so it works on `/join/*`. | `contexts/AuthGateContext.tsx`, `components/auth/*` |
| Register | `registerTournament(id, payload)` → `POST /rally/v1/tournaments/{id}/register` | `services/api/tournaments.ts:87` |
| Pay | `/payment-method` → `initiateTournamentRegistrationPayment` → Grow hosted checkout → `/payments/return` → `/payments/confirming` (polls the registration) | `pages/payment/*`, `services/api/payments.ts`, `hooks/usePendingPayment.ts` |
| Partner | `PartnerSection` — search a Rally player (auth-only endpoint) or invite by name + phone | `components/tournaments/PartnerSection.tsx` |
| Terms | `useRegistrationGate` + `ScreenMessageList` for `{scope:'tournament', id}` | `features/screenMessages/*` |
| CTA state | `ctaFor({isOpen,isFull,waitlistEnabled,myWaitlistEntry,myRegistration})` | `lib/tournamentCta.ts` |

Backend facts the design rests on (rally-api `main` @ `8aa7de6e`):

- `register_tournament` requires `status == registration_open`
  (`tournament_service.py:3546`) and a complete profile —
  `REQUIRED_FOR["register_tournament"] = {contact_number, skill_level}`
  (`profile_service.py:11`). A brand-new Supabase account has neither, and no
  `players` row until `POST /rally/v1/players/` or a lazy bootstrap.
- `partner_rules.py:71` rejects `partner_type: none` on `doubles`/`mixed`.
  Invite-by-phone resolves an existing account by phone and links `player_2_id`
  instead of minting a guest (`tournament_service.py` invite branch).
- One registration = one pair = one hold: `amount_to_pay = entry_fee + service_fee`
  (`tournament_service.py:3388`). Tournaments always use Grow `chargeType=2`
  (J4/J5 hold) captured when the manager approves in the CRM.
- Web checkout returns to `CONSUMER_WEB_URL + /payments/return`
  (`utils/payment_redirect.py:37`).
- There is no privacy column. The private-tournament playbook hides a tournament
  by leaving it `approved` — which also blocks self-registration.
- `_base_public_query()` (`tournament_service.py:1263`) is the base of **both**
  public discovery listings (`list_public_tournaments`, the all-tournaments feed)
  and of nothing else: not the detail fetch, not the CRM list, not `type=my`.

## 3. Decisions (made 2026-09-08)

1. **Pairing — real pairs at signup.** Registrant names a partner (search or
   invite). No solo entries; no backend change to partner rules.
2. **Privacy — unlisted but open.** New `tournaments.is_unlisted` flag. The
   tournament is `registration_open` (registers, pays, fills) but appears in no
   discovery surface and triggers no club-wide announcement. Reaching it needs
   the link. No allowlist.
3. **New accounts — collect on the page.** Name, phone and a self-assessed level
   are captured on the corporate page and written to the profile before
   registering; the employee never sees Rally's generic profile page.
4. **Approach — compose the existing pipeline** (not a redirect into
   `/tournaments/:id`, not a bespoke wizard). The detail page's register
   branching is extracted into a shared hook rather than copied.
5. **No waitlist on this page.** Full ⇒ "contact the organiser".
6. **Never overwrite a stored phone or level.** If the profile already holds a
   `contact_number` or a `skill_level`, that field is read-only on the page and
   excluded from the write. Names are prefilled but stay editable — rally-api
   backfills `first_name` from the email prefix on first action, and that junk
   must not be frozen.

## 4. rally-api — `is_unlisted`

### 4.1 Column and migration

- `app/models/tournament.py`:
  `is_unlisted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"), default=False)`
  — same idiom as `has_lucky_losers`.
- `scripts/sql/2026-09-08-tournament-is-unlisted.sql` (hand-applied DDL; `scripts/`
  is gitignored, so `git add -f` it like `2026-08-26-add-tournament-lucky-losers.sql`):
  `ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_unlisted boolean NOT NULL DEFAULT false;`
- `alembic/versions/2026_09_08_<rev>_tournament_is_unlisted.py`: self-contained
  `op.add_column(...)`, docstring per the lucky-losers convention. **Do not** copy
  `b7d2f9a4`'s read-the-.sql pattern — its `.sql` is missing from the checkout.
  Nothing in deploy runs alembic; the file keeps the chain in step with the model.

Default `false` ⇒ deploying changes no existing tournament's visibility.

### 4.2 Guards — six one-line `Tournament.is_unlisted.is_(False)` additions

| Site | Covers |
|---|---|
| `TournamentService._base_public_query()` `:1263` | open / past / all scopes, club pages, organizer public pages, LIVE badge, search — both callers (`:1666`, `:1929`) |
| `list_filter_options` clubs query `:1755` | club chip counts |
| `list_filter_options` organizers query `:1795` | organizer chip counts |
| `get_organizer_profile` `count_stmt` `:2194` | `tournaments_count` on the organizer card |
| `_enqueue_pending_tournament_announcements` `scheduler.py:530` | the `new_tournament` push/WhatsApp broadcast to `all_club_players` |
| `feed_card_service.py:688` (next to the status check) | the "tournament announced" feed card |

### 4.3 Deliberately unchanged

`GET /rally/v1/tournaments/{id}` (the page needs it), `register`, `waitlist`,
`/public/tournaments/{share_token}/*` (unlisted-by-design already), CRM
`list_tournaments` (the manager must see it), `type=my` (a registered employee
sees it in their own list), `get_tournament_details_for_player`.

Accepted leaks, as in the private-tournament playbook: match-result and
milestone feed cards to participants' followers; anyone holding the link can
open the tournament in the app.

### 4.4 Contract

`is_unlisted: bool = False` on CRM `TournamentBase` (create) and
`TournamentUpdate` (`Optional[bool]`); `TournamentResponse(TournamentBase)`
inherits it. `update_tournament` is a `setattr` loop, so no service change.
Not added to the mobile/web `TournamentResponse` — nothing reads it yet.

### 4.5 Tests (pytest)

- Parametrised over listing surfaces: an unlisted + `registration_open`
  tournament is **absent** from open / past / all / `include_live` / search /
  club filter / organizer public page / both filter-option counts / organizer
  count, while a listed twin is **present**.
- Scheduler tick enqueues no broadcast for it; feed hook creates no card.
- CRM create with `is_unlisted=true` round-trips; update flips it.
- `register_tournament` on an unlisted open tournament succeeds; CRM list and
  `type=my` still return it.

### 4.6 Operations

Until a CRM toggle ships, set by SQL:
`UPDATE tournaments SET is_unlisted = true WHERE id = '<id>';`
Opening is unchanged: `registration_start_date` in the past → pg_cron flips
`approved → registration_open` → the scheduler now skips the announcement.
Registration must be open before the link goes out, or the page renders the
not-open state with no button.

## 5. rally-web

### 5.1 Config — `src/constants/corporateEvents.ts`

`CorporateEvent` becomes a discriminated union on `mode`:

```ts
interface CorporateEventBase { slug; company; tournamentName; clubName; clubAddress;
                               heroImage; heroFit?; dateLabel; timeLabel }
type CorporateEvent =
  | (CorporateEventBase & { mode: 'lead'; sheetSource: string })
  | (CorporateEventBase & { mode: 'tournament'; tournamentId: string })
```

`samsung-fold8` and `dani-shoval` gain `mode: 'lead'` and change in no other
way. The display fields stay **copy, not data**: the hero prints the config's
Hebrew labels. From the tournament row the page reads only what must be true:
`entry_fee`, `format`, `status` / `is_full` / `seats_left`,
`registration_deadline`, `my_registration`, `my_waitlist_entry`.

`api/join-og.ts` and the Vercel `/join/:slug` rewrite are unchanged.

### 5.2 Structure

- `App.tsx`: `/join/:slug` → `pages/CorporateEventPage.tsx`, a dispatcher:
  `lead` → today's `CorporateSignupPage`; `tournament` → new
  `pages/CorporateRegistrationPage.tsx`; unknown slug → the existing not-found card.
- Pure move of shared presentational pieces out of `CorporateSignupPage.tsx` into
  `src/components/corporate/`: `EventHero`, `DetailChip`, `Field`, `inputClass`,
  `RallyWordmark`, `AppDownloadFooter`, `normalizeIsraeliLocal`.
  `CorporateSignupPage.test.tsx` must pass unchanged.
- New `hooks/useTournamentRegistration.ts`: the body of
  `TournamentDetailPage.handleRegisterNow` (build payload → `registerTournament`
  → 409 terms-gate handling → zero-pay vs `/payment-method` → error
  translation) moved verbatim; the page keeps only its scroll-to-partner /
  scroll-to-message DOM behaviour. Signature:
  `useTournamentRegistration(tournament, gate, { returnTo? })` →
  `{ register(partnerState), isRegistering, registerError, gateError, clearErrors }`.
  `TournamentDetailPage.test.tsx` must pass unchanged.

### 5.3 Page states — `CorporateRegistrationPage`

Derived with `ctaFor` (waitlist passed as disabled), with `isOpen` and
`isFull` computed exactly as `TournamentDetailPage` computes them today:

| Condition | Render |
|---|---|
| config missing / tournament 404 | existing not-found card |
| `my_registration` present | **registered** card: partner name, status line; if `payment_status` ∉ {`payment_held`, `completed`} → "complete payment" → `/payment-method?registration_id&tournament_id&return_to` |
| not open (`approved`, closed, deadline passed) | facts + "registration opens soon / has closed", no button |
| open but full | facts + "the event is full — contact the organiser" |
| open, seats left, signed out | facts + price + one CTA **להרשמה** → `requireSignIn()` |
| open, seats left, signed in | the form (§5.4) |

The registered card is also what a returning employee sees after payment.

### 5.4 The form (signed in), one card

1. **Your details** — first name, last name, phone (Samsung's `+972` widget,
   8–9 digits, trunk 0 stripped), level as four bands
   מתחיל / בינוני / מתקדם / מקצוען → 2.0 / 3.25 / 4.75 / 6.0 (band midpoints of
   `getSkillLevelName`'s thresholds). Prefilled from `/players/me`. **Phone and
   level are rendered read-only and never sent when the profile already holds
   them**; names are editable and sent when changed.
2. **Partner** — `PartnerSection` unchanged.
3. **Terms** — `ScreenMessageList` with `{scope:'tournament', id}` and the
   `tournament_registration` gate, wired exactly as on the detail page.
4. **Price** — `entry_fee + service_fee` for the pair; one-line note that it is a
   hold captured on approval.
5. **הרשמה ותשלום** → `ensureProfileEssentials()` (§5.5) → hook `register()` →
   free: `confirmTournamentZeroPayment` → `/payments/confirming?type=…&id=…&tournament_id=…&return_to=/join/<slug>`;
   paid: `/payment-method?registration_id&tournament_id&amount&return_to=/join/<slug>`.

Partner required and unset ⇒ submit scrolls to the partner block, as on the
detail page. Unsatisfied terms gate ⇒ scrolls to the first blocking message.

### 5.5 Profile essentials — exact rule

- `useAppSession().status === 'profile_incomplete'` (no `players` row) →
  `createPlayerProfile({ first_name, last_name, email: <auth email>, contact_number, country_code: '+972', skill_level })`.
- `'ready'` → `getMyPlayerProfile()`; PATCH via `updateProfile` with
  `first_name`/`last_name` if changed, and `contact_number` (+`country_code`)
  / `skill_level` **only when the profile's value is null**. A rated/verified
  level or an existing phone is untouched. An empty PATCH is skipped.
- Afterwards `refetchOnboarding()` and invalidate `['tournament', id]`.
- `'loading'` disables the submit; `'profile_error'` shows the inline error.

### 5.6 Return path for sign-up

- Google: `signInWithOAuth` already stashes `rally:auth-return`;
  `AuthCallbackPage` restores it. No change.
- Email, confirmation off: session returns inline. No change.
- Email, confirmation on — two layers:
  1. The page writes `sessionStorage['rally:auth-return'] = /join/<slug>` before
     calling `requireSignIn()` (the gate context does not). Same-browser
     verification links return to the event.
  2. `AuthContext.signUpWithEmail` reads that same stash and, when present,
     sets `emailRedirectTo` to `/auth/callback?next=<encoded path>`;
     `AuthCallbackPage` prefers a same-origin `next` (must start with `/`, not
     `//`) over the stash. Covers a link opened on another device. Nothing is
     threaded through the modal. **Gate:** the Supabase project's redirect
     allowlist must accept the query variant — verify before relying on it;
     layer 1 ships regardless.

### 5.7 Landing after payment

- `PendingPayment` gains `returnTo?: string` (validated same-origin path).
- `PaymentMethodPage` reads `return_to` and stores it in `pendingPayment`.
- `PaymentReturnPage` copies `pendingPayment.returnTo` into
  `/payments/confirming?…&return_to=`.
- `PaymentConfirmingPage`: when a same-origin `return_to` is present, the CTA
  reads "back to the event" and navigates there; otherwise today's
  `/my-activity`. The event page then renders the **registered** card from
  `my_registration`.

### 5.8 The interceptor trap

`services/api/client.ts:63-70` redirects any 422 `PROFILE_FIELDS_REQUIRED` to
`/profile/edit`. The pre-flight in §5.5 makes that unreachable on the happy
path. For the residual case the register call passes a request-config flag
`skipProfileRedirect: true` (stripped before send, like `X-Skip-Auth`); the
interceptor honours it and rejects normally, and the page renders
"we couldn't save your details — check the phone and level" inline.

### 5.9 Errors

- **Register** — `translateRegistrationError` gains
  `"That is your own phone number. Choose a different partner."` and
  `"Missing invite details (first name, phone, or country code)"`.
  `TOURNAMENT_FULL` (matched by code) refetches the tournament and the page
  switches to the full state. `ACKNOWLEDGMENT_REQUIRED` 409 → the hook's gate
  handling; the page scrolls to the terms.
- **Profile save** — inline under the details block with retry.
- **Payment** — initiate failure: `PaymentMethodPage`'s own message; Grow cancel
  → `/payments/failed` → "try again" returns to the method page; a closed Grow
  tab: reopening the link shows the registered card with "complete payment".
- **Network** — inline error + retry. No client-side copy of the submission (it
  is a DB row, not a lead).

### 5.10 i18n

New `corporate.*` keys in **both** `he.json` and `en.json` (the `defaultValue`
gotcha: a key missing from `he.json` renders English silently). No `t(key, {defaultValue})` in the new page.

## 6. Cross-repo contract and ship order

1. Apply `scripts/sql/2026-09-08-tournament-is-unlisted.sql` on prod by hand.
2. Deploy rally-api (`main`). Run `rally-contract-check` on CRM
   `TournamentResponse` first — the new field has a default, so old CRM/mobile
   builds are unaffected.
3. Deploy rally-web.
4. Create the tournament (`doubles`/`mixed`, `entry_fee`, `max_participants`,
   `registration_deadline` — NOT NULL in the DB), `UPDATE … is_unlisted = true`,
   set `registration_start_date` so pg_cron opens it, add the `CorporateEvent`
   entry + hero image, send the link.

Assumptions to confirm on prod, not derivable from the repos: `CONSUMER_WEB_URL`
= `https://rallypadel.app`; rally-web's `VITE_API_BASE_URL` = the prod API;
whether Supabase email confirmation is on for the consumer project.

## 7. Verification (dev, before ship)

- Run rally-api with `NOTIFICATIONS_SINK=capture` so the partner-invite
  WhatsApp is captured in `notification_outbox`, never sent.
- New Google account: link → sign-in → form (all fields editable) → invite a
  partner by phone → terms → hold on the Grow sandbox → return → registered card.
- Existing account with a verified level: level shown read-only; PATCH body
  contains no `skill_level`.
- Email sign-up with confirmation on: verification link returns to the event
  (same browser); with layer 2, from a second browser.
- The unlisted tournament is absent from `/tournaments`, the club page, the
  organizer page, filter chips and the mobile list while `/join/<slug>` and
  `/tournaments/<id>` work by link; CRM list shows it; scheduler tick enqueues
  no broadcast.
- Close the Grow tab mid-checkout; reopen the link → "complete payment" resumes.

## 8. Out of scope — follow-ups

- CRM toggle for `is_unlisted` (small; SQL until then).
- Page expiry/closing — `CorporateEvent` has no `closed`/`until`; the Samsung
  form is still live a month after the event.
- Waitlist on the corporate page; email-domain allowlist; solo entries;
  `is_unlisted` on the mobile response.

## 9. File map

**rally-api** — `app/models/tournament.py`, `app/schemas/crm/tournament.py`,
`app/services/tournament_service.py` (4 sites), `app/notifications/scheduler.py`,
`app/services/feed_card_service.py`, `scripts/sql/2026-09-08-tournament-is-unlisted.sql`,
`alembic/versions/2026_09_08_*_tournament_is_unlisted.py`, tests under
`tests/services/` and `tests/routers/`.

**rally-web** — `src/constants/corporateEvents.ts`, `src/App.tsx`,
`src/pages/CorporateEventPage.tsx` (new), `src/pages/CorporateRegistrationPage.tsx`
(new), `src/components/corporate/*` (moved), `src/hooks/useTournamentRegistration.ts`
(new, moved logic), `src/pages/TournamentDetailPage.tsx` (call the hook),
`src/hooks/usePendingPayment.ts`, `src/pages/payment/PaymentMethodPage.tsx`,
`src/pages/payment/PaymentReturnPage.tsx`, `src/pages/payment/PaymentConfirmingPage.tsx`,
`src/services/api/client.ts` (skip flag), `src/contexts/AuthContext.tsx` +
`src/pages/auth/AuthCallbackPage.tsx` (`next`), `src/lib/registrationErrors.ts`,
`src/i18n/locales/{he,en}.json`, tests alongside each.
