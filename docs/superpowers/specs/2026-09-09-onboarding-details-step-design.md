# Onboarding details step — design

**Status:** approved by the owner 2026-09-09 (decisions below). Builds on
`fix/tournament-auth-flow` (merged into `feat/corporate-tournament-registration`) and
generalises its tournament-only "required details" mode to every sign-up and sign-in.

## Problem

A new web account lands on the page it came from with no player profile. The site only
forces "complete your profile" later — when an API call fails with `PLAYER_NOT_FOUND` /
`PROFILE_FIELDS_REQUIRED` and the axios interceptor redirects, or when the tournament page
runs its pre-check. Players hit that interruption at the worst moment and many do not
finish it. Skill level is silently 3.0 for anyone who never touches the slider (web
`SKILL_DEFAULT`, API `PlayerCreate.skill_level = 3.0`), which pollutes matchmaking and
ratings for everyone they play with.

## Goal

Right after sign-up, and after any sign-in where something required is missing, the player
completes **name, verified phone and skill level** in one step, then lands where they were
going. Nothing required is missing afterwards. Skill level is an explicit choice with no
default, with a note explaining why honesty matters.

## Decisions (owner, 2026-09-09)

| Question | Decision |
|---|---|
| Phone at the step | **OTP required** (mobile parity; the `PhoneOtpVerification` component and `players/phone/*` endpoints already exist on the auth branch). |
| Existing accounts missing phone or skill | **Hit the step at next sign-in** (whenever the session reports missing required steps), once, then never again. |
| Skill note copy | **"Direct"** (below). |
| Where the step lives | The profile page in a required-details mode (`purpose=onboarding`), reached by a single session-level gate. Not an extra modal step: Google and email-verification returns reload the page, so only a route-level gate covers every entry path. |
| Corporate `/join/<slug>` | Exempt — it collects the same details inline and must never redirect. |
| Backend default 3.0 | Unchanged in this work. The web always sends an explicit level, so the default is unreachable from the web. Removing it is a separate decision because older mobile builds may rely on it (recent mobile sends `skill_level: 0`). |

## Definitions

`GET /rally/v1/me/onboarding-status` returns `has_player_profile` and `missing_steps` over
`("signed_in", "first_name", "contact_number", "player_profile", "skill_level")`; the API
counts `skill_level` present only when truthy, so mobile's `0` and a null both read as missing.

```
REQUIRED_STEPS = ['first_name', 'contact_number', 'skill_level']
needsDetails   = !has_player_profile || missing_steps.some(s => REQUIRED_STEPS.includes(s))
```

`needsDetails` is exposed from `AppSessionContext` (it replaces the page-local
`needsRegistrationDetails` the auth branch computed in `TournamentDetailPage`). Last name is
not an API step; the form requires it anyway (names must be meaningful — no "Player Player").

**`skill_level` below 1.0 means "not chosen".** The mobile app's complete-profile screen
writes `skill_level: 0` and the API's step check treats it as missing, so a mobile-created
account that signs in on the web is gated (correct) and must see an EMPTY slider, not "0.0".
One helper, `normalizeSkillLevel(value) → number | null` (`null` for null/undefined or
`< SKILL_MIN`, otherwise clamped), is the only way the web reads a stored level: the details
form defaults, the corporate page's `levelLocked`, and the "still missing" check after save.
Verified 2026-09-09: `POST /rally/v1/players/phone/{check,request-otp,verify-otp}` depend on
`get_current_user` only ("must work before a Player row exists"), so OTP works at the step for
a brand-new account; codes persist in `phone_otp_codes` with a 10-minute TTL.

## Architecture

### 1. Session-level onboarding gate (`AppSessionContext`)

One effect. When the session is settled and `needsDetails` is true — i.e. `status` is
`profile_incomplete`, or `ready` with a required step missing — and the current route is not
exempt, navigate (replace) to:

```
/profile/edit?purpose=<onboarding | tournament>&returnTo=<safeReturnTo(pathname + search)>
```

`purpose=tournament` when the current path starts with `/tournaments/` (so a player who
signed in from a tournament page sees the tournament copy the auth branch wrote, and the
page's own `checkRegistrationProfile()` stays a belt-and-braces rather than dead code);
`purpose=onboarding` everywhere else. Same rule as the axios bridge.

The details step renders inside the normal `Layout`, navbar included. Clicking a nav item
while a required detail is missing brings the player straight back to the step — but never
silently. The gate carries the clicked destination as the new `returnTo` (so finishing the
step lands them where they wanted to go) and the step opens with a **missing-details
notice** at the top: `edit_profile.missingNotice` with the exact fields still missing
(`edit_profile.missing.{name,phone,level}` joined with " · "), e.g.
"לפני שממשיכים נשארו: טלפון · רמת משחק". The notice is shown in details mode whenever at
least one field is missing, so a first-time visitor sees it too, and the corresponding
inputs get the accent border. The sign-out link is the one way out without completing.

Exempt routes: `/profile/edit`, `/auth/*`, `/login`, `/set-password`, `/join/*`, and the legal
pages (`/terms`, `/privacy` — verify exact paths in `App.tsx`). The gate never fires while
`status` is `loading`, `signed_out` or `profile_error` (no flicker before the status is known;
a failed status load shows the existing retry UI instead of a redirect loop).

This one gate covers every entry path: `AuthCallbackPage` still navigates to `next` (Google,
email verification, recovery) and the gate diverts from there with `returnTo=next`; the
in-modal sign-in/sign-up (`AuthFlow` → `confirmSignIn`) diverts with `returnTo` = the page the
modal was on; a legacy account signing in diverts the same way; a refresh mid-way diverts
again. The axios bridge's `redirectToProfileEdit` (403/422 fallback) stays as a belt-and-braces
and now uses `purpose=onboarding` (or `purpose=tournament` on `/tournaments/*`).

`TournamentDetailPage.checkRegistrationProfile()` (fresh check at press time) stays, reads
`needsDetails` from context for its CTA labels, and navigates with `purpose=tournament`.

### 2. Required-details mode of `EditProfilePage`

`purpose=onboarding` and `purpose=tournament` both enable `detailsMode` (the auth branch's
`tournamentMode` generalised); they differ only in copy.

- **Header.** onboarding: `edit_profile.onboardingTitle` / `onboardingSubtitle`; tournament:
  the existing `registrationTitle` / `registrationSubtitle`. Under it, `edit_profile.requiredNote`
  states that phone and skill level are required and why.
- **Fields.** First and last name (required, meaningful, prefilled from the profile or the
  OAuth metadata when present). Phone with country code (required; a new or changed number
  must pass OTP before Continue enables — existing `PhoneOtpVerification`,
  `initiallyVerified` when the stored number is unchanged). Skill level (required, **no
  default**, see §3).
- **Continue.** `edit_profile.continue` (onboarding) / `continueTournament` (tournament).
  Disabled until names are non-empty, the phone is verified and a level is chosen. On submit:
  create or patch the profile, refetch onboarding-status, confirm `needsDetails` is false
  (otherwise show the existing "still missing" error), then `navigate(returnTo ?? '/')`.
- **No trap.** A "Not your account? Sign out" link (`edit_profile.notYou`) signs out and goes
  to `/`.
- **Remove** the "this is my current level" checkbox (`confirmSkill`): an explicit slider
  choice replaces it.
- **Legacy user** missing only one thing: the other fields come prefilled and remain
  editable; only the missing ones block Continue.
- Outside details mode the page stays the permissive editor it is today (Save only when
  dirty, partial patches, no required skill), so the existing permissive tests keep passing.

### 3. `SkillLevelSlider` empty state and note

- `value: number | null`. When `null`: the big number shows `—`, the number input is empty,
  the range input sits at the midpoint with an `data-empty="true"` style (no fill, muted
  thumb), and `edit_profile.skillEmpty` ("slide to choose your level") is shown above the
  ticks. The first interaction — pointer, keyboard or typing a number — sets a real value
  (snapped to the step) and clears the empty state.
- `edit_profile.skillNote` renders under the slider wherever the slider appears (details mode
  and the normal editor), so the message travels with the control.
- `SKILL_DEFAULT` stays only as `clampSkill`'s NaN fallback; nothing initialises a form from
  it any more. Form default: `skill_level: normalizeSkillLevel(profile?.skill_level)` (so a
  stored `0` from mobile shows the empty state).
- Validation: required in details mode (`validation.skillRequired`); in the permissive
  editor a player without a level can still save other fields, as today.

### 4. Unchanged

`CorporateRegistrationPage` (own inline details, own band selector with no default, exempt
from the gate). The API. The dead `/auth/welcome` route (nobody navigates to it; leave it).

### 5. Analytics

`trackFunnel('onboarding_details_shown', { purpose })` on mount of details mode and
`trackFunnel('onboarding_details_completed', { purpose })` on successful continue. No PII.

## Copy (he / en)

| key | he | en |
|---|---|---|
| `edit_profile.onboardingTitle` | עוד רגע ואתם בפנים | Almost in |
| `edit_profile.onboardingSubtitle` | שם, טלפון מאומת ורמת משחק — ואפשר להתחיל. | Your name, a verified phone and your level, and you're set. |
| `edit_profile.requiredNote` | טלפון מאומת ורמת משחק הם שדות חובה: המספר מאפשר למארגנים ולשותפים ליצור איתכם קשר, והרמה קובעת מול מי תשחקו. | A verified phone and a skill level are required: the number lets organisers and partners reach you, and the level decides who you play with. |
| `edit_profile.continue` | המשך | Continue |
| `edit_profile.skillEmpty` | הזיזו את הסליידר כדי לבחור את הרמה שלכם | Slide to choose your level |
| `edit_profile.skillNote` | בחרו את הרמה האמיתית שלכם. הרמה קובעת מול מי תשחקו ואיך ידורגו המשחקים שלכם. רמה לא מדויקת פוגעת בכם ובשחקנים שאיתכם. | Pick your real level. It decides who you're matched with and how your games are rated. An inaccurate level hurts you and the players around you. |
| `edit_profile.notYou` | לא החשבון שלכם? התנתקו | Not your account? Sign out |
| `edit_profile.missingNotice` | לפני שממשיכים נשארו: {{fields}} | Before you continue we still need: {{fields}} |
| `edit_profile.missing.name` | שם מלא | full name |
| `edit_profile.missing.phone` | טלפון מאומת | a verified phone |
| `edit_profile.missing.level` | רמת משחק | your skill level |
| `edit_profile.validation.skillRequired` | חובה לבחור רמת משחק | Choose your skill level |

Existing keys reused: `registrationTitle`, `registrationSubtitle`, `continueTournament`,
`namesRequired`, `phoneVerified`, `validation.phoneNotVerified`, `loadError`, `retry`.
`confirmSkill` is removed from both locales.

## Testing

- `AppSessionContext` gate: fires for `profile_incomplete` and for `ready` + missing step;
  builds `returnTo` from path + search; never fires on exempt routes, while loading, when
  signed out, or on `profile_error`; does not loop on `/profile/edit`.
- `EditProfilePage` details mode: Continue disabled until names + verified phone + chosen
  level; no default level rendered; a legacy player missing only skill sees the other fields
  prefilled; successful continue navigates to `returnTo`; "still missing" after refetch shows
  the error; sign-out link works; permissive mode unchanged (existing tests).
- `SkillLevelSlider`: null renders the empty state and the note; first interaction sets a
  snapped value; a provided value renders as today.
- `normalizeSkillLevel`: null/undefined/0/0.5 → null; 1.0–7.0 pass through; a legacy
  profile with `skill_level: 0` in details mode shows the empty slider, Continue disabled,
  and the chosen level is patched.
- `TournamentDetailPage`: CTA labels driven by `needsDetails` from context; pre-check
  navigates with `purpose=tournament`.
- `CorporateRegistrationPage`: existing tests unchanged; add one test that the gate does not
  fire on `/join/*`.
- Browser: sign up on dev with a fresh account (email), land on the details step, verify the
  phone by OTP, pick a level, continue back to the original page; sign in as a legacy dev
  account missing skill and confirm the one-time step; confirm `/join/acme-e2e` never redirects.

## Out of scope

Web questionnaire / assessed level (mobile has it; web keeps the slider). Backend default
removal. Copy of the auth gate modal for `/join/*`. The `/auth/welcome` page.
