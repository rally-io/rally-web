# Rally Web — Payment Integration Spec (Grow / Meshulam)

> **Status:** ✅ Phase 1 (API Layer) Complete — Phase 2 (Page Layer) pending
> **Last updated:** 2026-05-23 (Phase 1 implementation)

> **Phase 1 implemented by:** `src/services/api/payments.ts`, `src/services/api/payments.test.ts`, `src/types/api.ts`, `src/services/api/client.ts`
> **Branch:** `editprofile` (pushed to origin)

---

## Phase 1 Implementation Summary

All §3 endpoints are wrapped. Tests: 13/13 passing.

### API Wrappers (`src/services/api/payments.ts`)

```ts
// §3.3 Saved cards
getSavedCards(): Promise<ApiResponse<SavedCard[]>>
deleteSavedCard(cardId: string): Promise<ApiResponse<null>>

// §3.1 Hosted checkout initiate
initiatePayment(entity: PaymentEntity, body?: InitiateBookingPaymentBody): Promise<ApiResponse<InitiatePaymentResponse>>

// §3.2 Server-to-server charge
chargeSavedCard(entity: PaymentEntity, cardId: string): Promise<ApiResponse<ChargeSavedCardResponse>>
```

### URL Mapping

| Function | URL |
|----------|-----|
| `getSavedCards` | `GET /rally/v1/payments/saved-cards` |
| `deleteSavedCard(id)` | `DELETE /rally/v1/payments/saved-cards/{id}` |
| `initiatePayment(entity, body)` | `POST /rally/v1/payments/{entity-segment}/{id}/initiate` |
| `chargeSavedCard(entity, cardId)` | `POST /rally/v1/payments/{entity-segment}/{id}/charge-saved-card` |

**Entity segment mapping:** `booking` → `booking`, `tournament_registration` → `tournament-registration`, `event_participation` → `event-participation`

### Key Behavioral Rules

- **`save_card`**: Only forwarded for `booking` initiate. Dropped for `tournament_registration` and `event_participation`.
- **`use_credits`**: Only forwarded for `tournament_registration` when `entity.use_credits !== undefined`.
- **`X-Rally-Client: web`**: Set on all outgoing requests via `client.ts` interceptor. Backend uses it to redirect Grow callbacks to web URL instead of mobile deep link.
- **`confirmZeroPayment`**: Already in `tournaments.ts:48` — no change needed.

### Spec Coverage

All §3 endpoints implemented. `confirmZeroPayment` (§3.4) already exists. Callbacks (§3.5) are server-only, not called from web.

---

## Original Spec (v1.0)

---

## 0. TL;DR — What we are building

1. A **Payment Method screen** (web) listing the player's saved cards + a
   "Pay with Card" option, identical in behaviour to the mobile
   `PaymentMethodScreen`.
2. A **payment redirect handler** that opens Grow's hosted checkout in the
   same tab (full redirect) — the web replacement for the mobile WebView +
   deep-link interception.
3. A **return route** (`/payments/return`) that maps Grow's `successUrl` /
   `cancelUrl` back into our app and shows the right post-payment state
   (confirming → success / failure / retry).
4. A **server-to-server "charge saved card"** path that does NOT redirect at
   all (POST → 200 → success screen).
5. **Card tokenisation as a side-effect of an entity payment**: when the
   user ticks the `save_card` consent on a booking checkout, the same Grow
   hosted-checkout request sets `saveCardToken=1`; the resulting card token is
   captured by the **server-side notify webhook**, not by the browser. We do
   **not** expose a standalone "Save a Card" flow on web — that would charge
   the user 1 ₪ (Grow does not allow `chargeType=3` on our merchant), which
   mobile doesn't do.
6. End-to-end coverage for the three payable entities:
   **bookings**, **tournament registrations**, **event (class) participations**.

The web must **not invent new endpoints** for any of the above — every
endpoint already exists under `/rally/v1/payments/...` for the mobile app and
is auth-shared with the website via Supabase Bearer tokens.

---

## 1. The actors

| Actor                  | What it does                                                                                 |
|------------------------|-----------------------------------------------------------------------------------------------|
| **Rally web** (this)  | Renders summary, payment-method UI, redirects to Grow, handles return URL, polls confirmation |
| **Rally API**          | Owns the `payment_pending` state machine; talks to Grow; receives Grow's server webhook       |
| **Grow / Meshulam**    | Hosted checkout (`createPaymentProcess`), server-to-server token charge (`createTransactionWithToken`), card tokenisation (`saveCardToken=1`), webhook (`notifyUrl`) |
| **Player's browser**   | Goes through the hosted Grow page, redirects back via `successUrl` / `cancelUrl`              |

Two distinct callback channels exist and they must NOT be confused:

- **Server-side `notifyUrl`** (`POST /payments/callbacks/grow/payment`) — the
  authoritative event. Grow retries it on non-200 at 10 / 20 / 30 minutes.
  This is what **actually** confirms the entity and saves the card token.
- **Browser `successUrl` / `cancelUrl`** — best-effort UX redirects only. They
  are NOT authoritative and may arrive before, after, or never compared to the
  webhook. We must always confirm by **polling the entity status**.

Mobile encodes the browser redirect into a deep-link
(`app.rallypadel://payment-result?...`) intercepted by the WebView. Web
replaces this entirely with normal HTTP redirects back to a route we control.

---

## 2. Entities & states

The payment flow is driven by an entity that has been pre-created in
`payment_pending` status. Three entities, three different creation flows, one
shared payment surface.

### 2.1 Court booking (`type=booking`)

- Created by `POST /rally/v1/bookings/` (`bookCourt` in
  `src/services/api/bookings.ts`).
- Response includes `amount_to_pay`, `service_fee`, `credits_applied`,
  `status` (`payment_pending` or `confirmed` if credits cover it),
  `id` (= `bookingId` used in payment endpoints).
- A successful payment / token charge transitions the booking to
  `confirmed` + `payment_status=completed`.
- Abandonment: `POST /rally/v1/bookings/{id}/release-hold` releases the slot
  and refunds any applied credits.

### 2.2 Tournament registration (`type=tournament_registration`)

- Created by the existing registration flow on the tournament detail page.
- Mobile reads `params.registration_id`, `amount_to_pay`, `entry_fee`,
  `credits_applied`, `service_fee`, `status` from query params.
- If `amount_to_pay < 0.01` AND credits cover the total, the web must call
  `POST /rally/v1/tournaments/{tid}/registrations/{rid}/pay`
  (`confirmZeroPayment` — already wired in `tournaments.ts`).
- Otherwise — proceed to payment-method screen.

### 2.3 Event / class participation (`type=event_participation`)

- Created by `POST /rally/v1/events/{event_id}/join` with body
  `{ use_credits: boolean }`.
- Response: `{ participant: {...}, payment: null | { payment_transaction_id, amount } }`.
- If `payment === null`, the join is final (free event or fully covered by
  credits) — no checkout required.
- If `payment !== null`, navigate to payment method with
  `id = participant.id`, `type = event_participation`, `event_id`,
  `amount = payment.amount`.
- Abandonment: `POST /rally/v1/events/{event_id}/release` releases the spot.

---

## 3. Backend surface (consume these — do not invent new ones)

All routes live under `/rally/v1/payments/...` and require the standard
Supabase Bearer token (already injected by `src/services/api/client.ts`).
Response shape: `StandardResponse` (`{ success, data, error }`).

### 3.1 Initiate hosted-checkout sessions (browser redirect needed)

| Endpoint                                                                | Purpose                                              | Returns                            |
|--------------------------------------------------------------------------|------------------------------------------------------|-------------------------------------|
| `POST /payments/booking/{booking_id}/initiate` (body `{ save_card?: boolean }`) | Grow URL to pay a court booking                | `{ payment_url: string }`           |
| `POST /payments/tournament-registration/{registration_id}/initiate`     | Grow URL to pay a tournament registration            | `{ payment_url: string }`           |
| `POST /payments/event-participation/{participant_id}/initiate` *(mobile-only today — confirm if web needs it; mobile route exists but is unused for events: events are saved-card-only by current mobile UX. See §11.)* | Grow URL to pay an event participation | `{ payment_url: string }` |
| `POST /payments/save-card/initiate`                                      | Grow URL to add a card (1 ₪ tokenisation)            | `{ payment_url: string }`           |

> **Pre-condition:** the entity must be in `payment_pending` and
> `amount_to_pay > 0` for the three payment ones. The server returns a
> 4xx + `RallyException` message otherwise — surface that to the user.

### 3.2 Charge a saved card (no redirect — silent server-to-server)

| Endpoint                                                                                      | Purpose                                  |
|-----------------------------------------------------------------------------------------------|------------------------------------------|
| `POST /payments/booking/{booking_id}/charge-saved-card` (`{ card_id }`)                        | Charge saved card for a booking          |
| `POST /payments/tournament-registration/{registration_id}/charge-saved-card` (`{ card_id, use_credits? }`) | Tournament                       |
| `POST /payments/event-participation/{participant_id}/charge-saved-card` (`{ card_id }`)        | Event participation                      |

Returns `{ grow_asmachta: string, amount: number }` (the mobile types use
`{ hyp_transaction_id, hyp_auth_number }` — legacy naming; web should use the
fresh `grow_*` keys present in the actual response).

Failure modes returned as 4xx with a human message — most commonly
"Card payment was declined" (`status_code: 402`). On a **final** token error
(card stolen / blocked / expired) the server soft-deletes the saved card, so
the next `GET /saved-cards` won't list it.

### 3.3 Saved cards

| Endpoint                          | Purpose                          |
|-----------------------------------|----------------------------------|
| `GET /payments/saved-cards`        | List the player's saved cards    |
| `DELETE /payments/saved-cards/{id}`| Remove a saved card              |

`SavedCardResponse`:
```ts
{
  id: string,
  card_last4: string,
  card_expiry: string,          // 'MMYY', e.g. '0526'
  brand: string | null,         // 'Visa' | 'Mastercard' | 'Diners' | 'Amex' | 'Isracard' | 'Discover'
  issuer: string | null,        // currently null on Grow; HYP-legacy field kept for compatibility
  is_default: boolean,
  created_at: string,
  has_token: boolean,           // true ⇒ can charge server-to-server without redirect
}
```

> **Critical UI rule (mirrors mobile):** Only `has_token === true` cards can
> drive the silent server-to-server charge. A card without a token must fall
> back to a fresh hosted-checkout redirect (`initiate*` endpoints).

### 3.4 Zero-payment confirmation

| Endpoint                                                                       | Purpose |
|---------------------------------------------------------------------------------|---------|
| `POST /payments/tournament-registration/{registration_id}/confirm-zero-payment` | Confirm a tournament registration when credits fully cover the price |
| `POST /rally/v1/tournaments/{tid}/registrations/{rid}/pay`                       | Web-exposed alias of the same call — already used by `confirmZeroPayment()` in `src/services/api/tournaments.ts` |

Bookings & events achieve zero-payment via different routes:
booking → `amount_to_pay === 0` returned by `bookCourt`, no payment needed.
event → join response with `payment === null`.

### 3.5 Callbacks (server-only — for awareness, NEVER call from web)

- `POST /payments/callbacks/grow/payment` — Grow → API webhook (form-encoded,
  wrapped in `data[...]` keys).
- `GET  /payments/callbacks/grow/success` — Grow → browser, redirects today
  to `app.rallypadel://payment-result?status=success&type=&id=` (mobile
  deep link). **Must be changed** to redirect to the web's return URL when
  the request came from the web (see §6).
- `GET  /payments/callbacks/grow/cancel`  — same but for cancellation.

---

## 4. Web flows — the three payment entry points

> **Frame of reference for naming:** the route names below are suggestions.
> Existing routes in this repo: `/tournaments/summary` already renders the
> summary; web has no `/payment-method` route yet — this spec defines it.

### 4.1 Booking flow (web parity with `app/clubs/booking-summary.tsx`)

```
[ClubDetailPage]
   ↓ (player picks a slot, taps "Book")
[/clubs/:id/booking-summary]   ← new web route or inline modal
   ↓ POST /rally/v1/bookings/    (use_credits toggle)
   ├─ amount_to_pay === 0  ──→ booking already confirmed → /my-activity (success state)
   └─ amount_to_pay > 0    ──→ /payment-method?type=booking&booking_id=...&amount=...
                                    ↓
                                (see §5: Payment method screen)
```

### 4.2 Tournament flow (web parity with `app/tournaments/summary.tsx`)

The summary route **already exists** at `/tournaments/summary`. Today it can
confirm the zero-payment branch. We must extend it to navigate into the
payment-method screen when `amountToPay >= 0.01`.

```
[/tournaments/summary?id=&registration_id=&status=payment_pending&...]
   ↓ "Pay Now"
   ├─ effective_amount < 0.01   ──→ POST .../registrations/{rid}/pay → success
   └─ effective_amount >= 0.01  ──→ /payment-method?type=tournament_registration&booking_id={rid}&tournament_id={tid}&amount=...&use_credits={bool}
```

> `booking_id` is reused as the generic "entity id" query param to match the
> mobile naming (see `app/payment-method.tsx`); rename to `entity_id` web-side
> only if you do it consistently across the whole spec.

### 4.3 Event / class flow (web parity with `EventDetailScreen`)

Web does not yet ship the events page, but when it does:

```
[/events/:id]
   ↓ "Join"
   ↓ POST /rally/v1/events/{event_id}/join  { use_credits }
   ├─ payment === null  ──→ inline joined state
   └─ payment !== null  ──→ /payment-method?type=event_participation&booking_id={participant.id}&event_id={event_id}&amount={payment.amount}&use_credits={bool}
```

---

## 5. The Payment Method screen (the heart of this spec)

This is a single route — **`/payment-method`** (or `/checkout/method`) —
that handles all three entity types. It is the web mirror of
`src/screens/PaymentMethodScreen.tsx` in mobile.

### 5.1 Query / route params

| Param         | Required for      | Notes                                                                  |
|---------------|--------------------|------------------------------------------------------------------------|
| `type`        | always             | `booking` \| `tournament_registration` \| `event_participation`         |
| `booking_id`  | always             | Entity id (booking id / registration id / participant id).             |
| `amount`      | always             | Display amount in NIS (₪). Format with `formatCurrency`.                |
| `tournament_id` | tournament only  | Needed for the zero-payment fallback and proper "back" behaviour.       |
| `event_id`    | event only         | Needed to release the participation on abandon.                         |
| `use_credits` | tournament/event   | Passed back into `charge-saved-card` for tournament; "use_credits" on event join. |

### 5.2 Sections (top → bottom, matching mobile UX)

1. **Header bar** — back arrow (see §5.5 for the "leave?" prompt) + title + amount due pill.
2. **Recommended payment option** (only rendered when saved cards exist):
   - Radio list of `SavedCard[]` (token-capable first, falling back to non-token).
   - Default card marked with a "DEFAULT" badge.
   - Single "Pay ₪{amount} Now" button — behaviour described in §5.4.
3. **Add Payment Method** — single tappable row labelled "Save a Card" /
   "הוסיפו כרטיס לתשלום מהיר יותר בפעם הבאה". Behaviour in §5.6.
4. **Other Payment Methods (coming soon)** — Apple Pay, Google Pay rows
   (visually disabled). Keep the structure so we can light them up later.

A first-load spinner is shown until `GET /payments/saved-cards` resolves.

### 5.3 Saved-card list logic (parity with mobile)

```ts
const cards = await getSavedCards();
const tokenCard = cards.find(c => c.has_token);
const initialSelectedId = (tokenCard ?? cards[0])?.id ?? null;
```

- Re-fetch saved cards every time the user lands on the screen (after returning
  from the "Add Payment Method" flow). Use a focus / mount effect; on web
  you can also subscribe to `window` `focus` for the popup variant.
- If the previously selected card was removed (token died), fall back to
  the new default.

### 5.4 "Pay Now" — what happens when the user clicks

```ts
const selected = cards.find(c => c.id === selectedCardId);

if (selected?.has_token) {
  // Silent path — no Grow redirect.
  await chargeSavedCard(type, entityId, selected.id, useCredits);
  // success → navigate to /payments/confirming?...
  // failure → toast "card was declined", reload cards (final-error cards disappear)
} else {
  // No usable token — fall back to hosted-checkout for a one-shot card entry.
  const { payment_url } = await initiatePayment(type, entityId);
  // → see §6 for the redirect mechanic.
}
```

When **no** saved cards exist, the "Recommended" section is hidden — the user
must use "Add Payment Method" or rely on entering a card on the next
hosted-checkout (a future enhancement could surface a "Pay with new card"
shortcut that calls `initiate*` directly).

### 5.5 Leaving the screen (the "are you sure?" prompt)

Mobile shows a destructive confirm because leaving releases the hold. Web must
do the same:

| `type`                 | What "back" does                                                                         |
|------------------------|------------------------------------------------------------------------------------------|
| `booking`              | Confirm modal → `POST /rally/v1/bookings/{booking_id}/release-hold` → `/clubs`            |
| `event_participation`  | Confirm modal → `POST /rally/v1/events/{event_id}/release` → previous page                |
| `tournament_registration` | Plain back. The registration stays in `payment_pending` — players can resume from `/my-activity`. |

If the user closes the tab without confirming we cannot intercept reliably
(the API will eventually time out the hold server-side). Do **not** rely on
`beforeunload`.

### 5.6 Saving a card during a payment (booking only)

Web does **not** expose a standalone "Save a Card" / "Add Payment Method"
button. The only way to save a card on web is to tick the `save_card`
consent checkbox while paying for a **booking**. This matches mobile:

- The checkbox forwards `save_card: true` to
  `POST /rally/v1/payments/booking/{id}/initiate`.
- The backend includes `saveCardToken=1` on the Grow hosted-checkout call.
- The card token is captured by the server-side webhook (`notifyUrl`), not
  the browser.
- After Grow redirects back to `/payments/return`, the regular confirming →
  success flow runs. The next time the user hits the payment-method screen,
  `/saved-cards` includes the new card.

The standalone `POST /rally/v1/payments/save-card/initiate` endpoint exists
on the API but is **not** wired up on web — calling it triggers an actual
1 ₪ Grow charge (the API uses `chargeType=1, sum=1`), which mobile doesn't
do. Don't reintroduce the call without also fixing the API to use a true
no-charge tokenisation (`chargeType=3`, requires `is_direct_debit=1` on the
Grow merchant).

The legacy mobile `/save-card/confirm` endpoint is deprecated — never call
it. Card tokens always arrive via the server-side webhook.

---

## 6. The hosted-checkout redirect — web replacement for the WebView

Mobile loads `payment_url` in a `WebView` and intercepts `app.rallypadel://`
deep links. Web must do this differently.

### 6.1 Recommended approach: same-tab full redirect

1. Persist any in-flight context the user will need after the redirect (entity
   id, type, optional return-to URL) in `sessionStorage` under
   `rally.pendingPayment`. This lets `/payments/return` recover state even if
   the redirect strips query params.
2. `window.location.assign(payment_url)`.
3. Grow's hosted page → user pays / cancels → Grow redirects browser to one of
   our return URLs (see §6.3 / §6.4).
4. Our `/payments/return` route reads the query params + sessionStorage and
   routes to `/payments/confirming` (success) or `/payments/failed` (cancel /
   declined).

Alternative: pop a centered window/tab (`window.open(payment_url, ..., 'width=480,height=720')`).
Lower friction on desktop but blocked by mobile-Safari pop-up rules and harder
to recover state. **Default to full redirect.**

### 6.2 What URLs does the backend ask Grow to redirect to?

Today the API hardcodes mobile-shaped URLs:

```py
# rally-api/app/services/payment_service.py
notify_url   = f"{PUBLIC_BASE_URL}/payments/callbacks/grow/payment"
success_url  = f"{PUBLIC_BASE_URL}/payments/callbacks/grow/success?type={type}&id={id}"
cancel_url   = f"{PUBLIC_BASE_URL}/payments/callbacks/grow/cancel?type={type}&id={id}"
```

And `payment_callbacks.py` always redirects browsers to the mobile deep link:

```py
return RedirectResponse(url=f"app.rallypadel://payment-result?status=success&type=...&id=...")
```

> **Backend change required for web parity.** We need the backend to be able
> to redirect web users to a web URL. Two acceptable shapes:
>
> 1. **Source-tagged success URLs.** The web `initiate*` calls pass an extra
>    `source=web` query param down the chain (or `cfield3=source:web`); the
>    callbacks router branches on it and returns a 302 to
>    `https://rallypadel.app/payments/return?status=success&type=...&id=...`
>    instead of the `app.rallypadel://` deep link.
> 2. **Per-call return URLs.** Add an optional `return_url` (web origin only,
>    validated against an allow-list) to the `initiate*` requests; the
>    callbacks router uses it when present. More flexible but bigger backend
>    diff.
>
> **Recommendation:** option 1 — minimal change, no allow-list, no leaked
> open-redirect surface. Spec the diff (1 router branch + 1 cfield) and call
> it out as a backend dependency.

### 6.3 `/payments/return` — the success / cancel landing page

A bare, layout-free route (mirrors `/auth/callback` in this codebase) that:

1. Reads `status`, `type`, `id`, and any additional Grow params from
   `useSearchParams()`.
2. Reads `sessionStorage.rally.pendingPayment` to recover any client-only
   context (e.g. `tournament_id` / `event_id` for navigation continuity).
3. **`status === 'success'`** → push-replace to
   `/payments/confirming?type=...&id=...&tournament_id=...&event_id=...`.
4. **`status === 'failed'`** → push-replace to
   `/payments/failed?type=...&id=...`.

Do **not** trust the `status` blindly — even on success show the confirming
screen, which then polls the entity (see §7). If `status` is missing or
unparsable, default to `failed` and let the user retry.

### 6.4 `/payments/confirming` — the polling screen (parity with mobile `transaction-confirming`)

Behaviour (translate `app/transaction-confirming.tsx` to web):

- Poll every 3s, max 10 attempts (so up to ~30s).
- `type === 'booking'`         → `GET /rally/v1/bookings/{id}` until
  `status === 'confirmed'` OR `payment_status === 'completed'`.
- `type === 'tournament_registration'` →
  `GET /rally/v1/tournaments/{tournament_id}/registrations/{id}` until
  `status === 'confirmed'` OR `payment_status === 'completed'`.
- `type === 'event_participation'`     → `GET /rally/v1/events/{event_id}`
  until `event.joined === true`.

States to render:
- **Polling**       → "Confirming your payment…" spinner.
- **Confirmed**     → success card with the entity details + "Done" / "View".
- **Timed-out**     → "Still processing — we'll email you" + link to
  `/my-activity` (the booking will land there once the webhook lands).
- **Generic success** (2 consecutive fetch errors) → fall back to a generic
  success state so a flaky backend can't surface as "payment failed".

The polling exists because the **server webhook is authoritative**, not the
browser redirect — Grow can complete the charge before, after, or completely
separately from the redirect.

### 6.5 `/payments/failed` — the failure landing page

Parity with `app/payment-result.tsx`:

- Single "Try again" CTA → `router.back()`.
- Secondary "Go home" CTA → `/`.
- Optional `reason` query param if we ever surface a Grow err_id message.

---

## 7. State machine, end-to-end

```
                          ┌─────────────────┐
                          │ Entity created  │
                          │ payment_pending │
                          └─────────────────┘
                                   │
       ┌────────── credits cover total ────────────┐
       │                                            │
       ▼                                            ▼
 confirm-zero-payment                       /payment-method
 (tournaments) OR auto-                              │
 confirm by API (booking,                            │
 free event)                                         │
       │                                  ┌──────────┴────────────┐
       │                          has_token card?         no usable card
       │                                  │                       │
       │                                  ▼                       ▼
       │                       charge-saved-card           initiate-* (redirect)
       │                                  │                       │
       │              ┌───────────────────┼───────────────────────┤
       │              │ success                                   │
       │              ▼                                            ▼
       │      /payments/confirming  ← polls entity until confirmed
       │              │
       │              ├─ confirmed → success screen
       │              ├─ failed → /payments/failed (retry)
       │              └─ timeout → "still processing"
       │
       ▼
   success screen
```

> **Pre-auth hold (tournament + `requires_approval_event=true`):** tournament hosted-checkout uses `chargeType=2` (J4/J5 hold) → backend returns `payment_status=payment_held`, `status=registered` (not `confirmed`). This IS a successful payment — the TM approves/captures later. Web treats `payment_held` as a "confirmed" polling result and shows "Registration Submitted" (not "Payment Confirmed") on the confirming screen. Saved-card capture is forbidden for these entities (`hideRecommended=true` in `PaymentMethodPage`).

---

## 8. Auth & headers

- Every payment call rides on `Authorization: Bearer <supabase_access_token>`.
- This is already handled by `src/services/api/client.ts` (the existing axios
  client injects the token automatically before each request, including the
  payment endpoints we add). **Do not** re-implement.
- 401 from a payment endpoint must NOT silently drop the user mid-checkout.
  Use `useAuthGate` to require sign-in before navigating into
  `/payment-method` in the first place.

---

## 9. Error handling matrix

| Stage                         | Failure                                             | UX response                                                                 |
|-------------------------------|-----------------------------------------------------|-----------------------------------------------------------------------------|
| `initiate*` returns 4xx       | Entity not in `payment_pending`, amount 0, etc.     | Toast `error.message`, navigate back to the summary screen.                  |
| `initiate*` returns 5xx / network | API down or Grow unreachable                   | Toast generic "Couldn't start payment", stay on payment-method screen.       |
| `charge-saved-card` returns 402 | Card declined, non-final error                    | Inline error "This card was declined. Choose another or add a new one."     |
| `charge-saved-card` 402 + final token error | Server soft-deleted the card             | Same inline error + automatically refresh `/saved-cards`; card disappears.   |
| Grow redirect: `status=failed`| Cancelled / declined at the hosted page             | `/payments/failed` page; "Try again" returns to `/payment-method`.           |
| Polling times out             | Webhook stuck or back-pressure                      | "Still processing — check My Activity in a moment", link to `/my-activity`.  |
| Webhook arrives but redirect missed | Browser closed / nav glitch                   | The entity is confirmed regardless; user finds it in `/my-activity`.         |

> Mobile catches a subtle case: when the player closes the WebView on a
> `booking`, mobile calls `cancelBooking` to refund credits; on an
> `event_participation` it calls `releaseEventParticipation`. Web should
> replicate this with the equivalent endpoints in §5.5 — both already exist.

---

## 10. UI / design parity checklist

The mobile `PaymentMethodScreen` has visual conventions we should keep:

- ₪ amount displayed in `colors.accent` (lime accent already in
  `tailwind` config via `rally-accent`).
- Card rows: brand icon box, `{brand} •••• {last4}`, "Expires MM/YY · {issuer}"
  subtitle, lock icon on the Pay button.
- "DEFAULT" pill on the default card (`is_default === true`).
- Disabled "Coming Soon" rows for Apple Pay / Google Pay.
- Securely-styled footer strip — mobile reads "Powered by HYP · SSL Secured ·
  PCI-DSS SAQ-A". **Update for Grow:** "Payments by Grow (Meshulam) · SSL ·
  PCI-DSS SAQ-A".
- Hebrew is the default; the whole screen must render RTL — use
  `useRtl()` (already in this repo) and `dir`-aware spacing
  (`me-2`/`ms-2` over `mr-2`/`ml-2`).

Strings to add to `he.json` / `en.json`:

```
payment.title                        "Payment"
payment.amountDue                    "Amount Due"
payment.recommended                  "Recommended Payment Option"
payment.payNow                       "Pay ₪{{amount}} Now"
payment.otherMethods                 "Other Payment Methods"
payment.comingSoonBadge              "SOON"
payment.cardExpires                  "Expires {{expiry}}"
payment.defaultBadge                 "DEFAULT"
payment.cardFallback                 "Card"
payment.preparing                    "Preparing checkout…"
payment.confirming                   "Confirming your payment…"
payment.stillProcessing              "Payment is still processing — check My Activity in a moment."
payment.failedTitle                  "Payment failed"
payment.failedSubtitle               "Don't worry — no money was charged. You can try again."
payment.tryAgain                     "Try Again"
payment.cancelTitle                  "Cancel payment?"
payment.cancelMessage                "Your spot will be released if you leave now."
payment.cancelButton                 "Yes, cancel"
payment.continueButton               "Keep paying"
payment.declined                     "The card was declined. Please choose another or add a new one."
payment.providerFooter               "Payments by Grow · SSL · PCI-DSS SAQ-A"
```

(Match key style with existing `tournament.*` namespace.)

---

## 11. Decisions & open questions for the team

These are things that surfaced while reading both codebases — they're not
blockers, but they need an explicit call.

1. **Does web need to start an event-participation hosted-checkout, or is it
   saved-card-only?** Mobile's current `EventDetailScreen` always uses the
   payment-method screen and accepts the WebView fallback. The backend route
   `initiate_event_participation_payment` is referenced in mobile's
   `PaymentService.initiateEventParticipationPayment` *but the matching API
   handler does NOT exist in `routers/consumer/payments.py`* (a gap also
   present on mobile — confirm with backend whether it's planned).
   → If it's needed for web, add the endpoint server-side **first**.

2. **Source-tagging Grow return URLs.** §6.2 specifies the minimal backend
   change: pass `source=web` (or set it on the cfield) so the callback router
   redirects to `https://rallypadel.app/payments/return` instead of
   `app.rallypadel://payment-result`. Coordinate this with backend before
   shipping the web flow — otherwise the user lands in a "open the app" dead
   end on web.

3. **Apple Pay / Google Pay.** Grow supports both via hosted checkout. Mobile
   shows them as "coming soon". Web can either match (recommended for parity)
   or enable them at launch if Grow's hosted page already has them on — they
   are not a separate API integration on our side.

4. **3-D Secure (3DS).** Grow's hosted checkout handles 3DS for us; the silent
   `createTransactionWithToken` path does NOT — by definition, server-to-server
   token charges are MIT (merchant-initiated), and Israeli issuers don't
   typically challenge them. If we ever see frictionless-MIT declines spike,
   we'll need to add a 3DS fallback that re-routes the user through the
   hosted page. **Don't pre-build it.**

5. **PCI scope.** The web never touches a PAN. The card is entered on Grow's
   page over SSL; we receive only `last4`, `expiry`, `brandCode`, and the
   `cardToken` (server-side). We stay in **PCI-DSS SAQ-A** — the footer note
   above reflects this. Do not add a form field for raw card data anywhere.

6. **Mobile UX nits worth keeping on web:**
   - Pre-select first **token-capable** card, not the default. This is a
     deliberate mobile choice: a saved-but-tokenless card forces a redirect,
     so we should prefer the silent path.
   - Don't show the "Recommended" section if there are zero saved cards
     (instead of showing it empty).
   - On final-token errors, the card auto-disappears from the list on next
     fetch — make sure the polling/refresh logic in the payment-method
     screen catches that.

7. **Idempotency.** `createTransactionWithToken` accepts a
   `transactionUniqueIdentifier` (the API derives one from the
   `PaymentTransaction.id`). On the web side, debounce the "Pay Now" button
   and disable it while in-flight to avoid double-clicks creating two
   `PaymentTransaction` rows (the server's uniqueness check protects against
   double-charge but not double-row).

---

## 12. Files to add / change on web

> Suggested file layout — adjust to local conventions.

### New
- `src/pages/payment/PaymentMethodPage.tsx` — the screen described in §5.
- `src/pages/payment/PaymentReturnPage.tsx` — the post-redirect handler (§6.3).
- `src/pages/payment/PaymentConfirmingPage.tsx` — polling (§6.4).
- `src/pages/payment/PaymentFailedPage.tsx` — failure (§6.5).
- `src/services/api/payments.ts` — wrapper over the endpoints in §3.
- `src/components/payment/SavedCardRow.tsx` — single row, parity with mobile.
- `src/components/payment/CardBrandIcon.tsx` — icon mapping by `brand`.
- `src/hooks/usePendingPayment.ts` — sessionStorage helper for §6.1.

### Modified
- `src/App.tsx` — register the new routes (`/payment-method`,
  `/payments/return`, `/payments/confirming`, `/payments/failed`).
- `src/types/api.ts` — add `SavedCard`, `InitiatePaymentResponse`,
  `ChargeSavedCardResponse`, `PaymentEntityType`.
- `src/pages/RegistrationSummaryPage.tsx` — extend the `deferred_pay` mode so
  "Pay Now" navigates into `/payment-method` (today the page never goes past
  zero-payment confirmation).
- `src/services/api/tournaments.ts` — no change needed; the `confirmZeroPayment`
  helper already lines up with §3.4.
- `src/services/api/bookings.ts` — no change required for payment per se; if
  the web is going to drive the full booking flow, also add the
  `release-hold` helper.

### Backend dependency (NOT in this repo)
- The redirect from `/payments/callbacks/grow/success` and
  `/payments/callbacks/grow/cancel` must know whether the player started on
  the web or the mobile app. Coordinate per §6.2 / §11.2 before shipping.

---

## 13. Testing checklist (web-only)

- [ ] Booking, credits cover total → `bookCourt` returns confirmed → success
      shown without ever hitting `/payment-method`.
- [ ] Booking, partial credits + paid balance → `/payment-method` → no saved
      cards → "Add Payment Method" works; after redirect back, new card
      appears in the list.
- [ ] Booking, with a token-capable card → "Pay Now" performs silent charge,
      lands on `/payments/confirming`, polls until confirmed.
- [ ] Booking, with a tokenless card → "Pay Now" falls back to hosted-checkout
      redirect, comes back to confirming.
- [ ] Booking, decline on saved-card charge → inline error, card list refreshed
      (final-error card removed).
- [ ] Booking, back button on `/payment-method` → confirm modal → calls
      `release-hold` → returns to `/clubs`.
- [ ] Tournament, `amount_to_pay < 0.01` → `/tournaments/summary` confirms
      zero-payment without entering `/payment-method`.
- [ ] Tournament, paid balance → navigates to `/payment-method` with
      `use_credits` flag set; passed through to `charge-saved-card`.
- [ ] Tournament, back button → no API call (stays in `payment_pending`),
      visible in `/my-activity`.
- [ ] Event join, free / fully credited → no `/payment-method` shown.
- [ ] Event join, paid → `/payment-method` → success → `/payments/confirming`
      polls `GET /events/{id}` for `joined === true`.
- [ ] Event, back button on `/payment-method` → `release` endpoint called.
- [ ] Webhook arrives **after** redirect → confirming screen still resolves
      within the 10× poll budget.
- [ ] Webhook arrives **before** redirect → first poll already sees `confirmed`.
- [ ] User closes the tab mid-checkout → next visit to `/my-activity` shows
      either the confirmed entity (if webhook landed) or the `payment_pending`
      row with a "Continue payment" CTA.
- [ ] RTL: every screen in Hebrew has correct alignment, icons mirrored,
      back arrow points right way.
- [ ] Double-click on "Pay Now" doesn't create two charges (button disabled
      during in-flight).
- [ ] No PAN field anywhere — Grow handles it. PCI scope stays SAQ-A.

---

## Phase 2: Page Layer — PENDING

### Pages to build

| Page | Route | Description |
|------|-------|-------------|
| `PaymentMethodPage` | `/payment-method` | Saved cards list, "Pay Now", "Add Payment Method" — see §5 |
| `PaymentReturnPage` | `/payments/return` | Handle Grow success/cancel redirect — see §6.3 |
| `PaymentConfirmingPage` | `/payments/confirming` | Poll entity status until confirmed — see §6.4 |
| `PaymentFailedPage` | `/payments/failed` | Error display with retry — see §6.5 |

### Hooks needed

| Hook | Purpose | File |
|------|---------|------|
| `usePendingPayment` | sessionStorage helper for persisting in-flight payment state | `src/hooks/usePendingPayment.ts` |
| `useEntityPolling` | Poll entity until confirmed/failed/timeout | `src/hooks/useEntityPolling.ts` |

### Key behaviors

**PaymentMethodPage** (`/payment-method`):
- `GET /payments/saved-cards` → show saved cards (token-capable first)
- "Pay with saved card" → `chargeSavedCard(entity, cardId)` → 402 shows inline error, re-fetch cards
- "Pay with Card" (booking) + save-card consent checkbox → `initiatePayment(entity, { save_card })` → redirect → card token captured by webhook on return
- Back button → release hold for `booking` / `event_participation`; no-op for `tournament_registration`

**PaymentReturnPage** (`/payments/return`):
- Read Grow query params (`status`, `type`, `id`)
- Persist to `sessionStorage` via `usePendingPayment`
- Route to `/payments/confirming` (success) or `/payments/failed` (cancel/failed)

**PaymentConfirmingPage** (`/payments/confirming`):
- Poll entity every 3s, max 10 attempts (~30s)
- `booking` → `GET /rally/v1/bookings/{id}`
- `tournament_registration` → `GET /rally/v1/tournaments/{tid}/registrations/{id}`
- `event_participation` → `GET /rally/v1/events/{event_id}`
- On confirmed → success screen; on timeout → "check My Activity"

**PaymentFailedPage** (`/payments/failed`):
- Display error from sessionStorage/URL params
- "Try again" → `router.back()`; "Go home" → `/`

---

## Phase 3: Booking Hold Release — PENDING

When payment fails or is cancelled, the booking hold must be released.

**Add to** `src/services/api/bookings.ts`:
```ts
releaseHold(bookingId: string): Promise<ApiResponse<null>>
// Calls: DELETE /rally/v1/bookings/{bookingId}/hold
```

---

## Backend Coordination

> See also: `docs/PAYMENT_BACKEND_DELTA.md`

| Item | Status | Description |
|------|--------|-------------|
| **BLOCKER §1** | 🔲 Open | Source-tagged redirect — backend must read `X-Rally-Client: web` to redirect Grow callbacks to `https://rallypadel.app/payments/return` instead of mobile deep link |
| **GAP §2** | 🔲 Open | `POST /payments/event-participation/{id}/initiate` handler must exist on backend for event flow |
| §3 | ✅ Resolved | Response shape normalized — `chargeSavedCard` returns `{ grow_asmachta, amount }` |

---

## Phase 1 Files

| File | Purpose |
|------|---------|
| `src/services/api/payments.ts` | API wrappers (5 exported functions) |
| `src/services/api/payments.test.ts` | Unit tests (13 passing) |
| `src/types/api.ts` | Payment types (Phase 1 additions) |
| `src/services/api/client.ts` | Axios client with `X-Rally-Client: web` header |
| `src/services/api/client.test.ts` | Header tests (2 passing) |
| `src/services/api/tournaments.ts:48` | `confirmZeroPayment` (pre-existing) |
| `docs/superpowers/plans/2026-05-23-payment-api-layer.md` | Phase 1 implementation plan |
| `docs/PAYMENT_BACKEND_DELTA.md` | Backend coordination items |

---

## Phase 2 Files (TODO)

| File | Status |
|------|--------|
| `src/hooks/usePendingPayment.ts` | ✅ Done |
| `src/hooks/useEntityPolling.ts` | ✅ Done |
| `src/pages/payment/PaymentMethodPage.tsx` | ✅ Done |
| `src/pages/payment/PaymentReturnPage.tsx` | ✅ Done |
| `src/pages/payment/PaymentConfirmingPage.tsx` | ✅ Done |
| `src/pages/payment/PaymentFailedPage.tsx` | ✅ Done |
| `src/components/payment/SavedCardRow.tsx` | ✅ Done |
| `src/components/payment/CardBrandIcon.tsx` | ✅ Done |
| `src/services/api/bookings.ts` (add `releaseHold`) | ✅ Done |

---

## i18n Strings (§10)

Add to `he.json` / `en.json` when Phase 2 lands:

```
payment.title, payment.amountDue, payment.recommended, payment.payNow,
payment.otherMethods, payment.comingSoonBadge, payment.cardExpires,
payment.defaultBadge, payment.cardFallback, payment.preparing,
payment.confirming, payment.stillProcessing,
payment.failedTitle, payment.failedSubtitle, payment.tryAgain,
payment.cancelTitle, payment.cancelMessage, payment.cancelButton,
payment.continueButton, payment.declined,
payment.providerFooter
```

---

## 14. Glossary

- **Grow / Meshulam** — Israeli payment gateway. New stack replacing HYP. The
  mobile code still has HYP-era names (`hyp_transaction_id`, `parseHypRedirect`)
  for compatibility; do not introduce those names into web code — use
  `grow_*`.
- **HYP / Yaad Pay** — legacy gateway. Some types in the mobile codebase still
  carry `hyp_` names because of incomplete renames; the backend has fully
  migrated.
- **`payment_pending`** — entity status meaning "created but not paid".
  All three entities go through it.
- **`has_token`** — saved card has a Grow `cardToken` and can be charged
  server-to-server. Cards without a token must be re-entered.
- **`asmachta`** — Hebrew for "receipt / reference". Grow returns one on every
  charge; it is the canonical reference players will see on their statements.
- **`approveTransaction`** — Grow API call required to finalise credit-card
  one-offs (chargeType=1) created via `createPaymentProcess`. **Not** called
  for token charges or J4/J5 pre-auths. Already handled server-side; web
  doesn't see it.
- **`notifyUrl`** — server-side webhook from Grow. Authoritative.
- **`successUrl` / `cancelUrl`** — browser-redirect URLs. Best-effort only;
  must NOT be used as proof of payment.
