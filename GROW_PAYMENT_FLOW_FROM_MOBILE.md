# Grow Payment Flow — Web Integration Spec (Sourced from Rally Mobile)

> **Purpose.** A self-contained, ground-truth specification for integrating the Grow (Meshulam) hosted-checkout payment flow into `rally-website`. Reverse-engineered from the production rally-mobile implementation and the rally-api backend. Web devs should be able to implement everything below **without asking the mobile dev or the backend dev any follow-up questions**.
>
> **Companion docs (existing).**
> - `docs/PAYMENT_SPEC.md` — earlier web-side design (Phase 1/2). Still useful for web UI patterns but may diverge from mobile in detail; this doc is authoritative on what the mobile/server actually does.
> - `docs/PAYMENT_BACKEND_DELTA.md` — open backend-coordination items.
>
> **Scope.** Covers booking, tournament registration, event participation, and standalone card-save. Does **not** cover refunds, settlement, or club onboarding (those are server-only).

---

## 0. TL;DR (one screen)

1. User reaches a "Pay" CTA. The web app already created the entity (`booking`, `tournament_registration`, `event_participation`) on the server and has its UUID and the amount to charge.
2. Web routes to `/payment-method` with the entity context in query params.
3. `/payment-method` fetches saved cards.
   - **Saved card with `has_token=true` selected → Pay Now:** call `charge-saved-card` → server-to-server charge, **no Grow redirect**. On success, route to `/payments/confirming?type=…&id=…`.
   - **Pay with new card / saved card without token:** call `initiate` → backend returns `{ payment_url }` → **full same-tab redirect** to Grow.
4. Grow hosts the checkout. On completion, Grow redirects user's browser to `https://api.rallypadel.app/payments/callbacks/grow/{success|cancel}?…`. The backend reads `cfield3=source:web` and 302-redirects the browser to `https://rallypadel.app/payments/return?status=…&type=…&id=…`.
5. `/payments/return` reads the query string, restores sessionStorage context, and routes to `/payments/confirming` (success) or `/payments/failed` (cancel).
6. `/payments/confirming` polls the entity's status every 3 s (max 10 attempts) until `status='confirmed'` / `payment_status='completed'` / `event.joined=true`. Renders success or "still processing".
7. The **authoritative confirmation** is the Grow→backend webhook (`POST /payments/callbacks/grow/payment`), not the browser. The polling is just UI-side patience.

```
[Entity exists, payment_pending] ──► /payment-method ──► (has_token?) ──┐
                                                                        ├─► charge-saved-card ──► /payments/confirming
                                                                        └─► initiate ──► Grow ──► /payments/callbacks/grow/* ──► /payments/return ──► /payments/confirming | /payments/failed
```

---

## 1. Architecture & actors

| Actor | Role |
|---|---|
| **Web SPA (`rally-website`)** | Hosts `/payment-method`, `/payments/return`, `/payments/confirming`, `/payments/failed`. Initiates payments and polls for confirmation. |
| **rally-api (backend)** | Owns Grow integration. Resolves merchant, signs requests, handles webhook, marks entities paid. **Source of truth for `payment_status`.** |
| **Grow / Meshulam** | Hosted checkout (PCI-DSS SAQ-A boundary). Tokenises cards, charges, sends asynchronous webhook to backend, redirects browser back. |
| **Supabase Auth** | Bearer JWT for all `/rally/v1/*` requests. |

**Trust model.** Browser-side success/cancel redirects are **untrusted UI signals**. The backend confirms the entity only on receiving the Grow `payment` webhook. The web `/payments/confirming` page must therefore poll the entity, not assume success from the redirect.

---

## 2. Entity types

The single `PaymentEntityType` discriminator drives all per-resource branching:

```ts
type PaymentEntityType = 'booking' | 'tournament_registration' | 'event_participation';
```

### 2.1 Per-entity flags

| Flag | Sent on `initiate` | Sent on `charge-saved-card` | Notes |
|---|---|---|---|
| `save_card: boolean` | **booking only** (silently dropped by backend on other entities, but the web client must not send it for tournament/event to stay schema-clean) | n/a | Asks Grow to tokenise the new card during this transaction. |
| `use_credits: boolean` | n/a (initiate does not take this) | **tournament_registration only** | Server applies Rally Wallet credits before charging the card. |
| `requires_approval_event: boolean` | n/a (returned by server on registration, not sent on initiate) | forbidden (must use hosted-checkout) | When `true`, the tournament uses `chargeType=2` (J4/J5 pre-auth hold). `PaymentMethodPage` hides saved cards + Pay-Now and shows hosted-checkout only. Post-payment state: `payment_status=payment_held`, `status=registered` (not `confirmed`). TM approves/captures later. (gap spec §2.5) |

### 2.2 Per-entity confirmation signal

The `/payments/confirming` polling decides "done" using these conditions:

| Entity | Endpoint polled | "Confirmed" condition |
|---|---|---|
| `booking` | `GET /rally/v1/bookings/{id}` | `status === 'confirmed' \|\| payment_status === 'completed'` |
| `tournament_registration` | `GET /rally/v1/tournaments/{tournament_id}/registrations/{id}` | `payment_status === 'payment_held' \|\| payment_status === 'completed' \|\| status === 'confirmed'`. Confirming screen shows "Registration Submitted" for `payment_held` (pre-auth), "Registration Confirmed" for `completed`. |
| `event_participation` | `GET /rally/v1/events/{event_id}` | `event.joined === true` |

**Required extra params per entity for confirming:**
- `tournament_registration` needs `tournament_id` in the URL.
- `event_participation` needs `event_id` in the URL (the participant ID alone is not enough to fetch the event).

### 2.3 Lifecycle (paid path)

```
[create entity]            POST /bookings, POST /tournament-registrations, POST /events/{id}/join
        │                  Entity returns id + amount_to_pay, status=payment_pending, payment_status=pending
        ▼
[choose payment method]    /payment-method
        │
        ├─ saved-card path: POST /payments/{type}/{id}/charge-saved-card        → entity becomes paid sync (200)
        │                                                                       → if 402 PAYMENT_DECLINED: entity is rolled back/cancelled by server
        │
        └─ hosted-checkout: POST /payments/{type}/{id}/initiate                 → returns payment_url
                            window.location.assign(payment_url)
                            (Grow takes over)
                            POST /payments/callbacks/grow/payment               → webhook marks entity paid (authoritative)
                            GET  /payments/callbacks/grow/{success|cancel}      → redirects browser back to web
        ▼
[confirming]               /payments/confirming polls until paid or timeout
        ▼
[done]                     navigate to entity-specific success screen / activity list
```

---

## 3. Backend API surface (authoritative)

**Base URL.** `https://api.rallypadel.app/rally/v1` (prod). All paths below are relative to this prefix.

**Common headers.**
- `Authorization: Bearer <supabase_access_token>` — every payment call.
- `Content-Type: application/json`.
- `X-Rally-Client: web` — **REQUIRED on every web request**. The backend uses this to decide whether to redirect Grow callbacks to the web `/payments/return` URL or to the mobile `app.rallypadel://payment-result` deep link. Already set globally in `src/services/api/client.ts:28`.

**Response envelope.** All endpoints return:
```jsonc
// success
{ "success": true,  "data": <T>,            "error": null }
// failure
{ "success": false, "data": null, "error": { "code": string, "message": string, "details"?: object } }
```
Use `src/services/api/payments.ts` — it already normalises non-2xx to the failure envelope, including the 402 → `PAYMENT_DECLINED` mapping described in §9.

### 3.1 `POST /payments/{type-segment}/{id}/initiate`

Returns a Grow hosted-checkout URL.

| URL `type-segment` | UUID `{id}` is… | Request body |
|---|---|---|
| `booking` | `booking_id` | `{ "save_card"?: boolean }` |
| `tournament-registration` | `registration_id` | `{}` |
| `event-participation` | `event_participant_id` | `{}` |

Response (200):
```jsonc
{ "success": true, "data": { "payment_url": "https://secure.meshulam.co.il/checkout/…" }, "error": null }
```

Failure conditions to handle:
- **400** entity not in `payment_pending`, or `amount_to_pay <= 0`, or club not Grow-onboarded → show generic "couldn't start payment" inline error and let the user retry / contact support. No deep-link decoding.
- **404** entity not found → user shouldn't have reached `/payment-method`; route back to home.
- **5xx** transient → inline retry.

Side effects (FYI, not the client's problem):
- Server creates a `PaymentTransaction` row with `status='initiated'`.
- Server tags the Grow session with custom fields:
  - `cField1 = bookingId:<id>` (regardless of entity, Grow only allows fixed field names; the backend uses cField1 for "primary id" for all entities)
  - `cField2 = txnId:<payment_transaction.id>`
  - `cField3 = source:web` (when `X-Rally-Client: web` is sent) — this is the bit that makes Grow redirect to the web URL.

**Hosted-checkout URL lifetime.** ~30 min. Do not cache `payment_url` in long-lived storage — only sessionStorage for the round-trip.

### 3.2 `POST /payments/{type-segment}/{id}/charge-saved-card`

Charges a saved tokenised card server-to-server. **No Grow redirect.**

| URL `type-segment` | Request body |
|---|---|
| `booking` | `{ "card_id": "<uuid>" }` |
| `tournament-registration` | `{ "card_id": "<uuid>", "use_credits"?: boolean }` |
| `event-participation` | `{ "card_id": "<uuid>" }` |

Response (200):
```jsonc
{
  "success": true,
  "data": { "grow_asmachta": "123456", "amount": 120.00 },
  "error": null
}
```

`grow_asmachta` is the Meshulam receipt/reference number (אסמכתא). Show it on the success screen as proof of payment.

Failure conditions:
- **402 PAYMENT_DECLINED** — the card was declined OR the token is dead. Server may have **soft-deleted the card** in this call (final Grow error codes 103/451/452/453). UI must:
  1. Show inline error: "Payment declined. Please try another card." (key: `payment.declined`).
  2. **Refetch saved cards** — the failed card may be gone.
  3. Stay on `/payment-method` so the user can pick another card or "Pay with new card".
  4. Do **not** call the entity-cancel endpoint; for bookings the server rolls back any applied credits but the booking is **cancelled** on declined charge — verify the entity's status before letting the user retry. (For tournaments the registration stays in `payment_pending`; user can retry.)
- **4xx** with code `INSUFFICIENT_CREDITS` / `CARD_TOKEN_INVALID` / etc. — backend normalises these into `error.code`; show the `error.message`.

### 3.3 `POST /payments/tournament-registration/{id}/confirm-zero-payment`

Used when applied credits cover the full amount. No card needed.

Request body: `{}`
Response (200):
```jsonc
{ "success": true, "data": { "confirmed": true }, "error": null }
```

After 200: synchronously route to the tournament success screen. **No polling required.** Server has applied credits and confirmed the registration before responding.

### 3.4 `GET /payments/saved-cards`

Response (200):
```jsonc
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "card_last4": "5678",
      "card_expiry": "0531",            // MMYY string
      "brand": "Visa" | "Mastercard" | "Diners" | "Amex" | "Isracard" | "Discover" | null,
      "issuer": null,                    // always null on Grow (legacy HYP field)
      "is_default": false,
      "has_token": true,                 // true → eligible for server-to-server charge
      "created_at": "2026-04-12T08:31:00Z"
    }
  ],
  "error": null
}
```

**Ordering rule (mobile parity).** When pre-selecting, prefer the first card with `has_token=true`; fall back to the first card. The list itself can be rendered in the order returned (backend orders by `is_default desc, created_at desc`).

**`has_token=false` cards.** These are placeholders for cards Grow hasn't tokenised yet (rare — happens if `save_card` was sent but Grow's tokenisation step failed asynchronously). Selecting one on the Pay Now button must trigger the **hosted-checkout path**, not server-to-server.

### 3.5 `DELETE /payments/saved-cards/{card_id}`

Response (200): `{ "success": true, "data": { "deleted": true }, "error": null }`

Soft-deletes the card (`deleted_at` set). Backend hides soft-deleted cards from `GET /payments/saved-cards`. **No "are you sure" backend round-trip** — the web UI owns confirmation.

### 3.6 `POST /payments/save-card/initiate` (standalone card-save)

Used to add a card outside of a real payment. Charges 1 ₪ via Grow to obtain a token; the 1 ₪ is **not refunded automatically** by the mobile spec (TBD — for now treat as a known UX cost). Most flows save cards *during* a real booking initiate (`save_card: true`) which is free, so this should be the secondary path.

Request body: `{}`
Response (200): `{ "success": true, "data": { "payment_url": "…" }, "error": null }`

The flow is otherwise identical to `initiate`, with `pending.addingCard = true` set in sessionStorage so `/payments/return` knows to route back to `/payment-method` (not `/payments/confirming`) on success.

### 3.7 Backend webhook (informational)

`POST /payments/callbacks/grow/payment` is hit by Grow's servers. **Web does not call or observe this directly**, but its behaviour explains the polling window:

- Webhook decodes `cField2 = txnId:<id>`, looks up `PaymentTransaction`, and on `statusCode='2'` (success) marks the related entity as paid:
  - Booking: `status='confirmed'`, `payment_status='completed'`, records to revenue ledger.
  - Tournament reg: same.
  - Event participant: `EventService.confirm_payment()` sets `event.joined=true` for the player.
- If the new card was tokenised, the webhook upserts a `SavedCard` row.
- The webhook **is idempotent** — duplicate deliveries are no-ops.
- Grow retries failed deliveries at 10 / 20 / 30 minutes. **In rare cases the webhook can land seconds *after* the browser redirect.** That's why `/payments/confirming` polls — see §6.4.

---

## 4. URL contract: how the user gets back to the web

This is the single biggest difference from mobile. Mobile uses an `app.rallypadel://` custom scheme; web uses real HTTPS routes.

### 4.1 Mobile reference (do **not** copy verbatim)

Mobile WebView intercepts `app.rallypadel://payment-result?status=…&type=…&id=…&transactionId=…&Brand=…&L4digit=…` and `…/payments/callbacks/grow/success|cancel` URLs.

### 4.2 Web equivalent

> **⚠️ OPEN backend dependency (G1).** rally-api does **not** yet redirect web users back; `/payments/callbacks/grow/success` and `/payments/callbacks/grow/cancel` currently always 302 to `app.rallypadel://payment-result`. Web sends `X-Rally-Client: web` on every request (already set in `src/services/api/client.ts`), but the backend must still thread `source=web` through the Grow success/cancel URLs and branch the redirect to `{WEB_BASE_URL}/payments/return?…`. **Until G1 lands, the hosted-checkout (new-card) round-trip dead-ends in the browser.** Saved-card paths and all unit tests do NOT depend on G1.

**When G1 lands**, the flow will be:

```
Grow → GET https://api.rallypadel.app/payments/callbacks/grow/success?type=<type>&id=<id>&source=web
       └─ 302 → https://rallypadel.app/payments/return?status=success&type=<type>&id=<id>
```

and analogously for `/cancel`:

```
Grow → GET https://api.rallypadel.app/payments/callbacks/grow/cancel?type=<type>&id=<id>&source=web
       └─ 302 → https://rallypadel.app/payments/return?status=failed&type=<type>&id=<id>
```

**Query params web must consume on `/payments/return`:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `status` | `'success' \| 'failed'` | yes | Anything other than the literal `success` is treated as `failed`. |
| `type` | `PaymentEntityType` | yes | Whitelist-validate; reject unknown values. |
| `id` | UUID string | yes | Whitelist-validate as UUID; on mismatch treat as failure. |

**Params *not* sent by the backend to web (but present in mobile deep links):** `transactionId`, `Brand`, `L4digit`. The web flow does not need them — the confirmation page polls the entity, which already has the receipt info if you need it.

**`tournament_id` / `event_id` are NOT in the return URL.** The backend doesn't know what entity-context the web app needs. The web must recover them from sessionStorage (see §11).

### 4.3 What happens if the user closes the Grow tab

Grow's hosted page may or may not call `/cancel` when the user closes it. Assume **silent abandonment is possible**. Mitigation:
- The entity stays in `payment_pending` until either the webhook fires or a cleanup job ages it out.
- On returning to the site (e.g. from history), the user can re-enter the same flow; the **same `initiate` call** is safe to call again — backend issues a fresh `PaymentTransaction`.

### 4.4 Same-tab vs. new-tab redirect

**Use same-tab full redirect** (`window.location.assign(payment_url)`). Reasons:
- Grow's success/cancel callbacks rely on the user's browser session being the one that returns to `https://rallypadel.app/payments/return`.
- A `window.open(...)` popup gets blocked on Safari/iOS and disconnects from sessionStorage.
- Preserve UI state across the redirect via sessionStorage (§11), not via window-handle juggling.

---

## 5. Saved-card model

### 5.1 Display

| Field | Render as | Example |
|---|---|---|
| `brand` + `card_last4` | `${brand ?? t('payment.cardFallback')} •••• ${card_last4}` | `Visa •••• 5678` |
| `card_expiry` (MMYY) | `MM/YY` (use `formatExpiry()` — see mobile `PaymentMethodScreen.tsx:40-42`) | `05/31` |
| `issuer` | suffix with " · " if non-null (never is, on Grow — keep code path for forward-compat) | `Expires 05/31 · MAX` |
| `is_default` | `t('payment.defaultBadge')` pill | `Default` |
| `has_token` | **not displayed**; controls Pay Now branching only | n/a |

### 5.2 Selection rules

- On first load, **auto-select the first `has_token=true` card**; fall back to the first card. (Mobile: `PaymentMethodScreen.tsx:82-90`.)
- When the user adds a card (returns from `/payments/save-card` flow), **refetch `getSavedCards()`** and keep the previously selected card if still in the list.
- Refetch on window `focus` (returning from a Grow tab if a same-tab redirect wasn't used).

### 5.3 Delete card

Mobile does not expose delete inside the payment flow (delete lives in a separate Manage Cards screen). Web parity: **do not add a delete affordance to `/payment-method`**. If/when web adds Manage Cards (separate from this spec), the `DELETE /payments/saved-cards/{id}` call exists.

### 5.4 Set-default card

No client-side endpoint exists yet; backend sets `is_default=true` on the first tokenised card automatically. Out of scope for this spec.

---

## 6. UX spec, screen-by-screen

### 6.1 Pre-payment screens (caller responsibility)

Pages that own a "Pay" CTA must:

1. Ensure the entity exists on the server (booking created, tournament registration created, event joined-with-hold).
2. Compute the amount to charge **after applying any credits the user toggled** (tournament).
3. Detect the **zero-payment short-circuit** (tournament only): if computed amount `< 0.01`, call `confirmTournamentZeroPayment(id)` directly **without routing to `/payment-method`**, then show success.
4. For non-zero amounts, navigate to:
   ```
   /payment-method?type=<type>&entity_id=<uuid>&amount=<number>
                 &tournament_id=<uuid>?     // only if type=tournament_registration
                 &event_id=<uuid>?           // only if type=event_participation
                 &use_credits=<bool>?        // only if type=tournament_registration; default false
   ```
5. Persist a `PendingPayment` object to sessionStorage at the same moment (see §11). The sessionStorage is the **only** source of truth for `tournament_id` / `event_id` / `use_credits` across the Grow round-trip.

### 6.2 `/payment-method`

**Layout (top → bottom).**

1. Header. Back button (chevron, left in LTR / right in RTL), title `payment.title` ("אמצעי תשלום" / "Payment Method"), spacer.
2. Amount pill. Label `payment.amountDue` on the leading side, amount in `₪{amount}` in `rally-accent` on the trailing side. Surface card with 1 px border.
3. **Recommended Payment Option** section (only when saved cards exist).
   - Section title: `payment.recommended` ("אמצעי תשלום מומלץ" / "Recommended Payment Option"), uppercase, muted.
   - Card list (single surface, hairline dividers between rows). Each row:
     - Radio (20 × 20 circle, accent fill when selected).
     - Card icon box (36 × 36, accent-tinted bg).
     - Two-line text: `{Brand} •••• {last4}` bold + `Expires MM/YY[ · issuer]` caption.
     - Optional `Default` pill on the trailing side.
     - Whole row is `Pressable` → sets `selectedCardId`.
     - `accessibilityRole="radio"`, `accessibilityState={ checked: isSelected }`.
   - **Pay Now button** at the bottom of the same surface (divider above):
     - Accent-filled, full width inside the surface card.
     - Lock icon + `payment.payNow` ("שלם ₪{amount} עכשיו" / "Pay ₪{amount} Now").
     - Disabled / spinner while charging.
4. **Pay with Card** section (always rendered, even when saved cards exist).
   - Single surface with two rows:
     - Tap-row: card-outline icon + `payment.addMethod` / `payment.cardTitle` ("תשלום בכרטיס" / "Pay with Card") title, `payment.cardSubtitle` ("כרטיס אשראי / דביט" / "Credit / Debit Card") subtitle, chevron trailing. `onPress` → `handlePayWithNewCard()`.
     - Hairline divider.
     - Save-card checkbox row: `payment.saveCardConsent` ("שמור את הכרטיס לתשלומים עתידיים" / "Save my card for future payments"). State is the `saveCard` local boolean.
5. **Other Methods** section.
   - Apple Pay row — disabled, "Coming Soon" pill.
   - Google Pay row — disabled, "Coming Soon" pill.
   - Do **not** wire up — these are placeholder rows for product signalling.
6. Full-screen loading overlay while `initiating === true` (modal + spinner + `payment.preparing`).

**State machine.**

```
loadingCards   → fetch /payments/saved-cards
hasSavedCards  → savedCards.length > 0
selectedCardId → first has_token card on load; survives manual selection across refetch
saveCard       → false by default (independent of selectedCardId)
charging       → true during charge-saved-card request
initiating     → true during initiate request (covers both Pay Now of no-token saved card AND Pay with Card)
```

**Pay Now click handler (pseudocode).**

```ts
async function handlePayNow() {
  const card = savedCards.find(c => c.id === selectedCardId);
  if (!card) return;
  if (card.has_token) await chargeWithSavedCard(card);
  else                await payWithNewCard();      // re-uses the Pay-with-Card flow
}
```

**Card-row tappable area.** The whole row, not just the radio. Hit target ≥ 44 px.

**Back button behaviour (booking).** Show a confirmation dialog ("Are you sure you want to leave? Booking is not confirmed and the slot will be released."). On confirm: `POST /bookings/{id}/release-hold` (already implemented in the web codebase) → `navigate('/clubs')`.

**Back button behaviour (tournament).** No release on back — the registration stays in `payment_pending`. Just `navigate(-1)`.

**Back button behaviour (event).** Confirmation dialog → `POST /events/{event_id}/release` → `navigate(-1)`.

**`hideRecommended` (pre-auth guard).** When `requires_approval_event === true` is forwarded to `/payment-method` via query param, the saved-cards section and sticky Pay-Now bar are hidden. Only "Pay with Card" (hosted checkout) is shown. This prevents users from immediately capturing a pre-auth hold via `charge-saved-card`, which bypasses manager approval. Set by `RegistrationSummaryPage` when navigating; read by `parseEntity` in `PaymentMethodPage`.

### 6.3 Hosted checkout (Grow page)

- We never render Grow's checkout ourselves. After `window.location.assign(payment_url)`, the browser leaves the site.
- Grow's checkout is mobile-aware; no User-Agent tricks needed on web.
- Grow handles 3DS step-up internally. No web work.
- **PCI scope.** Web stays in SAQ-A — never touch PAN / CVV / cardholder data. The hosted page does it.

### 6.4 `/payments/return`

Hit when Grow → backend → web 302's the browser back. Read-only screen — does no API work, just routes.

**Decision tree:**

```ts
const { status, type, id } = parseQuery();   // ?status=&type=&id=
const pending = pendingPayment.get();        // sessionStorage

if (pending?.addingCard) {
  if (status === 'success') return navigate('/payment-method');   // card now saved
  else                       return navigate('/payments/failed');
}

if (status !== 'success')                    return navigate(`/payments/failed?type=${type}&id=${id}`);
if (!isPaymentEntityType(type))              return navigate('/payments/failed');
if (!isUuid(id))                              return navigate('/payments/failed');

navigate(`/payments/confirming?type=${type}&id=${id}` +
         (type === 'tournament_registration' ? `&tournament_id=${pending?.tournamentId ?? ''}` : '') +
         (type === 'event_participation'      ? `&event_id=${pending?.eventId ?? ''}`         : ''));
```

**Render while routing:** centered spinner + `payment.confirming` text. ~0–200 ms typical.

### 6.5 `/payments/confirming`

**Query params:** `type`, `id`, optional `tournament_id`, optional `event_id`.

**Hook:** `useEntityPolling({ type, entityId: id, tournamentId, eventId })`.

**Polling rules (must match mobile parity):**

| Constant | Value | Source |
|---|---|---|
| `INTERVAL_MS` | `3000` | mobile `app/transaction-confirming.tsx:19` |
| `MAX_ATTEMPTS` | `10` (~30 s ceiling) | mobile `:20` |
| `ERROR_FALLBACK_THRESHOLD` | `2` consecutive errors → treat as confirmed **only if at least one successful fetch occurred first** | mobile `:117-122` |

**State machine:**
```
polling     → spinner + "Confirming your payment…"
confirmed   → success card + "View Activity" CTA → /my-activity
timeout     → "Your payment is still processing. Check My Activity in a moment." + CTA to /my-activity
```

**On confirmed**, the screen can display `grow_asmachta` if it was returned by `charge-saved-card` (saved-card path). On the hosted-checkout path the asmachta is not surfaced to the client — that's fine; show a generic success.

**Do NOT call any "confirm" endpoint client-side after Grow checkout.** Server already confirms via webhook. The client only watches.

### 6.6 `/payments/failed`

**Query params (informational):** `type?`, `id?`.

**UI:**
- Error illustration / icon.
- `payment.failedTitle` ("התשלום נכשל" / "The payment failed").
- `payment.failedSubtitle` ("לא הצלחנו להשלים את התשלום שלך. נסה שוב או השתמש בשיטת תשלום אחרת." / "We weren't able to complete your payment. Try again or use a different payment method.").
- "Try Again" → `navigate(-1)` (back to `/payment-method`; sessionStorage `pending` still present).
- "Go Home" → `navigate('/')`, **and `pendingPayment.clear()`**.

**On mount:** Read `pending` once; do nothing destructive unless the user actively presses "Go Home".

---

## 7. Save-card flow

Two entry paths:

1. **Implicit during a booking initiate.** Send `save_card: true` on `POST /payments/booking/{id}/initiate`. Free (it's a real payment). Webhook tokenises the card after the user pays.
2. **Standalone** via `POST /payments/save-card/initiate`. Costs 1 ₪. Used when the user adds a card from a Manage Cards / Settings screen.

**Standalone flow:**
```
[/settings/payment-methods or wherever]
   │ click "Add Card"
   ▼
pendingPayment.set({ ..., addingCard: true })
POST /payments/save-card/initiate → { payment_url }
window.location.assign(payment_url)
   │ Grow checkout for 1 ₪
   ▼
GET /payments/callbacks/grow/success?type=save_card&id=<txnId>&source=web
   │ 302
   ▼
GET /payments/return?status=success&type=save_card&id=<txnId>
   │ pendingPayment.addingCard === true → bypass the entity-route logic
   ▼
navigate('/payment-method')    // or back to manage-cards origin
   │ saved cards refetched on focus → new card appears
   ▼
pendingPayment.clear()
```

**Important:** `type=save_card` is not a `PaymentEntityType`; do not feed it to `useEntityPolling`. Special-case it inside `/payments/return` before any entity logic runs.

---

## 8. Zero-payment short-circuit (tournament only)

**When credits cover the full amount:**
```ts
const finalAmount = Math.max(0, amountToPay - applicableCredits);
if (finalAmount < 0.01) {
  await confirmTournamentZeroPayment(registrationId);   // POST /payments/tournament-registration/{id}/confirm-zero-payment
  // Synchronously success — server applied credits + confirmed registration.
  navigateToTournamentSuccess();
  return;
}
// else proceed to /payment-method with finalAmount
```

- **Booking has no zero-path** in mobile — bookings always require Grow (credits are auto-applied server-side; if they fully cover, the server still routes through Grow with 0 ₪ but mobile never hits this case in practice).
- **Event has no zero-path.**
- Web must implement the zero-path branch in the tournament summary page **before** routing to `/payment-method`.

---

## 9. Error matrix

| Surface | Trigger | Display key | User action |
|---|---|---|---|
| `/payment-method` Pay Now (saved card) | 402 `PAYMENT_DECLINED` | `payment.declined` ("התשלום נדחה. אנא נסה כרטיס אחר.") | Refetch cards, stay on screen, let user pick another card or use a new one. |
| `/payment-method` Pay Now / Pay with Card | 4xx other (e.g. `INSUFFICIENT_CREDITS`, `CARD_TOKEN_INVALID`) | `error.message` from response | Inline error toast, stay on screen. |
| `/payment-method` initiate | 5xx / network | `payment.cardSetupError` ("Something went wrong starting your payment. Please try again.") | Inline retry. |
| Grow page load | Grow returns to `/payments/callbacks/grow/cancel` (user clicked cancel) | n/a — flows into `/payments/return` with `status=failed` → `/payments/failed` | Try Again button. |
| `/payments/confirming` | Entity not confirmed within 10 attempts | `payment.stillProcessing` ("עדיין מעבד..." / "Still processing…") + subtitle linking to My Activity | "Go to My Activity". |
| `/payments/confirming` | 2+ consecutive fetch errors AND no prior successful fetch | Same as timeout | "Go to My Activity". |
| `/payments/confirming` | 2+ consecutive fetch errors AFTER ≥ 1 successful fetch | Treat as confirmed (mobile parity — backend is intermittently flaky on the read endpoint right after the webhook lands) | Success card. |
| `/payments/return` | `status !== 'success'` OR invalid `type` / `id` | n/a — routes to `/payments/failed` | Try Again. |
| Any | 401 (token expired) | n/a — `client.ts` interceptor signs the user out | Re-login prompt. |
| Any | 403 with `PROFILE_FIELDS_REQUIRED` | n/a — `client.ts` interceptor redirects to edit-profile | Complete profile then retry. |

**Codes the UI explicitly checks** (everything else falls through to `error.message`):
- `PAYMENT_DECLINED` (HTTP 402, set in `payments.ts` normaliser)
- `PROFILE_FIELDS_REQUIRED` / `PLAYER_NOT_FOUND` (HTTP 403, handled in `client.ts`)

Mobile does **not** decode Grow-specific error codes client-side (103/451/452/453 etc.) — the backend handles card-soft-deletion based on those and surfaces a single `PAYMENT_DECLINED` to the client. Keep this contract.

---

## 10. i18n strings (Hebrew + English)

All payment text must go through `t('payment.<key>')`. Hebrew is the default locale. Below is the full keyset, sourced from `rally-mobile/src/i18n/translations.ts`. **Use these exact translations** to keep wording consistent with mobile.

| Key | HE | EN |
|---|---|---|
| `payment.title` | אמצעי תשלום | Payment Method |
| `payment.amountDue` | לתשלום | Amount due |
| `payment.savedCards` | כרטיסים שמורים | Saved Cards |
| `payment.cardExpires` | תוקף {{expiry}} | Expires {{expiry}} |
| `payment.cardTitle` | תשלום בכרטיס | Pay with Card |
| `payment.cardSubtitle` | כרטיס אשראי / דביט | Credit / Debit Card |
| `payment.cardNetworks` | ויזה, מאסטרקארד, אמקס | Visa, Mastercard, Amex |
| `payment.otherMethods` | שיטות נוספות | Other Methods |
| `payment.comingSoon` | בקרוב | Coming soon |
| `payment.comingSoonBadge` | בקרוב | Soon |
| `payment.preparing` | מכין תשלום… | Preparing payment… |
| `payment.preparingSaveCard` | מכין הוספת כרטיס… | Preparing card setup… |
| `payment.recommended` | אמצעי תשלום מומלץ | Recommended Payment Option |
| `payment.defaultBadge` | ברירת מחדל | Default |
| `payment.payNow` | שלם ₪{{amount}} עכשיו | Pay ₪{{amount}} Now |
| `payment.saveCardConsent` | שמור את הכרטיס לתשלומים עתידיים | Save my card for future payments |
| `payment.cardFallback` | כרטיס | Card |
| `payment.leaveTitle` | האם אתם בטוחים שברצונכם לעזוב? | Are you sure you want to leave? |
| `payment.leaveMessageBooking` | ההזמנה לא הושלמה והמקום ישוחרר. | Booking is not confirmed and the slot will be released. |
| `payment.leaveMessageTournament` | ההרשמה לא הושלמה ואתם עלולים לאבד את מקומכם. | Registration is not confirmed and you could lose your spot. |
| `payment.leaveMessageEvent` | המקום שלכם לא אושר וישוחרר. | Your spot is not confirmed and will be released. |
| `payment.failedTitle` | התשלום נכשל | The payment failed |
| `payment.failedSubtitle` | לא הצלחנו להשלים את התשלום שלך. נסה שוב או השתמש בשיטת תשלום אחרת. | We weren't able to complete your payment. Try again or use a different payment method. |
| `payment.tryAgain` | נסה שוב | Try Again |
| `payment.cancelTitle` | ביטול תשלום | Cancel payment |
| `payment.cancelMessage` | האם אתם בטוחים שברצונכם לבטל את התשלום? ההזמנה שלכם לא תאושר. | Are you sure you want to cancel the payment? Your booking will not be confirmed. |
| `payment.continueButton` | המשך בתשלום | Continue with payment |
| `payment.cancelButton` | ביטול | Cancel |
| `payment.confirming` | מאשרים… | Confirming… |
| `payment.stillProcessing` | עדיין מעבד... | Still processing… |
| `payment.stillProcessingSubtitle` | ההזמנה שלך בתהליך אישור. בדקו את "הפעילות שלי" לסטטוס העדכני ביותר. | Your booking is being confirmed. Check "My Activity" for the latest status. |
| `payment.declined` | התשלום נדחה. אנא נסה כרטיס אחר. | Payment declined. Please try another card. |
| `payment.cardSetupError` | אירעה שגיאה בהתחלת התשלום. אנא נסה שוב. | An error occurred initiating the payment. Please try again. |
| `payment.providerFooter` | תשלומים מאובטחים על ידי Grow · SSL · PCI-DSS SAQ-A | Payments by Grow · SSL · PCI-DSS SAQ-A |
| `credits.available` | קרדיטים זמינים | Credits Available |
| `credits.remainingAfter` | יישאר לך {{amount}} | You'll have {{amount}} left |
| `credits.availableAmount` | יש לך {{amount}} זמין | You have {{amount}} available |
| `credits.applied` | הוחל | Applied |

**RTL note.** Hebrew is the default; `<App/>` flips `dir="rtl"` when locale is `he`. All horizontal layouts in payment screens must be mirrored: back chevrons, row directions (`useRtl().rowDirection`), text alignment (`useRtl().textAlign`). Amounts (`₪120`) always render LTR within an RTL line — let the browser handle bidi.

---

## 11. sessionStorage round-trip (`PendingPayment`)

Grow's redirect drops most of our context (we only get `status`, `type`, `id` back). We bridge via sessionStorage. The existing `src/hooks/usePendingPayment.ts` already implements this.

```ts
interface PendingPayment {
  type: PaymentEntityType;
  entityId: string;
  amount: number;
  tournamentId?: string;     // required round-trip-restoration target for tournament_registration
  eventId?: string;          // required round-trip-restoration target for event_participation
  useCredits?: boolean;      // tournament_registration only
  addingCard?: boolean;      // standalone save-card flow
}

pendingPayment.set(value)   // serialise to sessionStorage
pendingPayment.get(): PendingPayment | null
pendingPayment.clear()      // on /payments/failed Go-Home, after successful completion
```

**Lifecycle hooks:**
- `pendingPayment.set(...)` is called by the **pre-payment page** (booking summary / tournament summary / event detail) right before navigating to `/payment-method`. Also re-saved by `/payment-method` if the user toggles credits or save-card.
- `pendingPayment.get()` is called by `/payments/return` and (optionally) `/payment-method` on mount to recover state if reloaded.
- `pendingPayment.clear()` is called only by `/payments/failed` Go-Home and by `/payments/confirming` on a confirmed success **before** navigating away.

**Persistence boundary.** sessionStorage survives the Grow round-trip in the same tab. If the user closes the tab and reopens via history, the session is gone — that's acceptable (they'll re-enter via the entity's summary page).

---

## 12. Saved-card-success path: dispatching to `/payments/confirming` even without a Grow redirect

For the **server-to-server charge** path (saved card with `has_token`), there is no Grow redirect — `chargeSavedCard` returns synchronously with `{ grow_asmachta, amount }`. **Web still routes through `/payments/confirming`** for consistency and because the entity-status DB update inside the backend transaction may lag behind the HTTP response by a small window.

```ts
const r = await chargeSavedCard(entity, card.id);
if (r.success) {
  pendingPayment.clear();   // already paid; no return-trip needed
  navigate(`/payments/confirming?type=${type}&id=${id}` + (tournamentId ? `&tournament_id=${tournamentId}` : '') + (eventId ? `&event_id=${eventId}` : ''), { replace: true });
} else if (r.error.code === 'PAYMENT_DECLINED') {
  setInlineError(t('payment.declined'));
  queryClient.invalidateQueries(['saved-cards']);
} else {
  setInlineError(r.error.message);
}
```

Mobile takes a slightly different shortcut (calls `onChargeSuccess` → parent navigates to `transaction-confirming`). Web parity: navigate to `/payments/confirming`. The polling will almost always confirm on the first attempt.

---

## 13. Backend webhook behaviour (informational, for understanding polling timing)

> You can skip this section if you only need to integrate the client. Read it if you're debugging "the user paid but `/payments/confirming` timed out".

- Grow's webhook (`POST /payments/callbacks/grow/payment`) typically lands within 1–3 seconds of the user completing the payment.
- The backend's webhook handler:
  1. Decodes `cField2` → looks up `PaymentTransaction`.
  2. Idempotency-guards on `txn.status == completed` (early-return on duplicate webhooks).
  3. On `statusCode='2'`: sets `txn.status = completed`, **then** calls `_confirm_booking()` / `_confirm_tournament_registration()` / `_confirm_event_registration()` to mark the entity paid.
  4. If a card was tokenised, upserts a `SavedCard` row.
  5. Calls Grow `approveTransaction()` to finalise (best-effort, non-blocking).
  6. Returns 200 (always — even on internal failure, to prevent Grow retries thrashing).
- Polling window of 30 s (10 attempts × 3 s) is **almost always sufficient**. The "still processing" timeout state is for the rare case where Grow's webhook is delayed (queue lag, retry storms).
- The entity's status will eventually become correct even if the user closes the browser — confirmation does not depend on the web client running.

---

## 14. Testing checklist

### 14.1 Unit / integration (vitest)

- [ ] `src/services/api/payments.ts` — already covered by `payments.test.ts`. Re-verify that `initiate('booking', { save_card: true })` sends `save_card`, but `initiate('tournament_registration', { save_card: true })` does NOT (silently drops it).
- [ ] `src/hooks/usePendingPayment.ts` — round-trip get/set/clear; private-mode (sessionStorage unavailable) → no throw.
- [ ] `src/hooks/useEntityPolling.ts` — confirms on first successful poll; times out after 10 attempts; 2-consecutive-error fallback after ≥1 success.
- [ ] `src/pages/payment/PaymentMethodPage.tsx` — saved-card has_token=true → calls `chargeSavedCard`; has_token=false → calls `initiate` and navigates via `window.location.assign`.
- [ ] `src/pages/payment/PaymentReturnPage.tsx` — `addingCard` short-circuit; unknown `type` routes to `/payments/failed`; non-UUID `id` routes to `/payments/failed`.

### 14.2 Manual smoke

For each entity (booking, tournament registration, event participation):

- [ ] Pay with a new card (`save_card=false`) → Grow → success → `/payments/confirming` confirms within 30 s → entity shows as paid in `/my-activity`.
- [ ] Pay with a new card with `save_card=true` (booking only) → Grow → success → after `/payments/confirming`, navigate back to `/payment-method` (e.g. by re-entering the flow) → new card appears in saved list.
- [ ] Pay with a saved tokenised card (`has_token=true`) → no Grow redirect → `/payments/confirming` confirms on first poll → done.
- [ ] Pay with a saved card → Grow declines on the backend → inline `payment.declined` shown → cards refetched → user can pick another.
- [ ] Cancel inside Grow's hosted page (click Grow's cancel button) → `/payments/return` → `/payments/failed` → "Try Again" returns to `/payment-method`.
- [ ] Close the Grow tab abruptly → entity remains in `payment_pending` → user can re-enter flow and retry.
- [ ] (tournament only) Toggle credits ON such that final amount > 0 → enters `/payment-method` with reduced amount → pays normally.
- [ ] (tournament only) Toggle credits ON such that final amount = 0 → never enters `/payment-method`; calls `confirm-zero-payment` directly → tournament success shown.
- [ ] (RTL) Whole flow with `he` locale → all chevrons mirrored, amounts still LTR, text aligned correctly.
- [ ] Refresh `/payment-method` mid-flow → page rehydrates from sessionStorage; saved cards refetched.
- [ ] Log out mid-flow → 401 interceptor signs user out cleanly; no zombie polling.

### 14.3 Edge cases

- [ ] `/payments/confirming` opened directly via URL (no sessionStorage) — must still poll correctly given query params; sessionStorage is only required to **arrive** there, not to operate there.
- [ ] User navigates back from `/payments/confirming` to `/payment-method` — flow should remain usable; polling should stop (cleanup the interval on unmount).
- [ ] Two payment tabs open simultaneously for different entities — sessionStorage is per-tab, no cross-talk.

---

## 15. File map (where each piece of this spec lives)

Already implemented (verify, don't recreate):

| Concern | Path |
|---|---|
| API wrappers | `src/services/api/payments.ts` |
| Auth + `X-Rally-Client: web` header | `src/services/api/client.ts:28` |
| Types | `src/types/api.ts:299-344` |
| Payment Method page | `src/pages/payment/PaymentMethodPage.tsx` |
| Return handler | `src/pages/payment/PaymentReturnPage.tsx` |
| Confirming / polling page | `src/pages/payment/PaymentConfirmingPage.tsx` |
| Failed page | `src/pages/payment/PaymentFailedPage.tsx` |
| Polling hook | `src/hooks/useEntityPolling.ts` |
| sessionStorage helper | `src/hooks/usePendingPayment.ts` |
| Card brand icon | `src/components/payment/CardBrandIcon.tsx` |
| Saved-card row | `src/components/payment/SavedCardRow.tsx` |
| Routes | `src/App.tsx` (Layout-wrapped) |

Mobile reference (read-only — quote, don't import):

| Concern | Path |
|---|---|
| Mobile API wrapper | `rally-mobile/src/services/paymentService.ts` |
| Mobile Payment Method screen | `rally-mobile/src/screens/PaymentMethodScreen.tsx` |
| Mobile WebView screen (informational; web doesn't need a WebView) | `rally-mobile/src/screens/PaymentWebViewScreen.tsx` |
| Mobile booking summary | `rally-mobile/src/screens/BookingSummaryScreen.tsx` |
| Mobile tournament summary (zero-payment path) | `rally-mobile/app/tournaments/summary.tsx` |
| Mobile transaction-confirming (polling reference) | `rally-mobile/app/transaction-confirming.tsx` |
| Mobile payment-result | `rally-mobile/app/payment-result.tsx` |
| Mobile deep-link scheme | `rally-mobile/app.json` |
| Mobile i18n source | `rally-mobile/src/i18n/translations.ts` |

Backend (rally-api) reference:

| Concern | Path |
|---|---|
| Payment routes | `rally-api/routers/consumer/payments.py` |
| Grow callback handlers | `rally-api/routers/payment_callbacks.py` |
| Grow service client | `rally-api/services/grow_service.py` |
| Payment service logic | `rally-api/services/payment_service.py` |
| Schemas | `rally-api/schemas/mobile/payment.py` |

---

## 16. Glossary

| Term | Meaning |
|---|---|
| **Grow** | Brand name of Meshulam's payment platform. Used interchangeably in code. |
| **asmachta** (אסמכתא) | Receipt / approval reference number issued by Grow. Stored on `PaymentTransaction.grow_asmachta`. Shown to the user as proof of payment. |
| **`has_token`** | Server flag on `SavedCard` indicating Grow has issued a reusable token for this card → can charge server-to-server. |
| **`cFieldN`** | Custom-fields slot in Grow's API. We use cField1 (entity id), cField2 (txnId), cField3 (source:web/mobile). |
| **Hosted checkout** | Grow's externally-hosted payment page. Web redirects to it; PCI scope stays at Grow. |
| **Webhook** | `POST /payments/callbacks/grow/payment` — server-to-server notification from Grow that is the authoritative confirmation signal. |
| **Save-card** | Tokenising a card for future use. Free during booking initiate (`save_card: true`); 1 ₪ standalone. |
| **Zero-payment** | Tournament-only short-circuit when credits cover full amount → no Grow involvement. |
| **PCI-DSS SAQ-A** | The lightest PCI compliance scope, available because we never touch PAN/CVV. Don't break this — the moment we accept card data in our own DOM, scope explodes. |

---

## 17. Open questions / known gaps (delegate or decide before shipping)

1. **Manage Cards screen.** Not in this spec — out of scope for the payment flow but needed for `DELETE /payments/saved-cards/:id` to be usable. Product to decide where the entry point lives (Settings → Payment Methods is the obvious slot).
2. **Set-default-card endpoint.** Backend currently auto-sets default on first save; no client-side toggle exists. Add when a Manage Cards screen ships.
3. **1 ₪ standalone-save UX.** Mobile doesn't currently advertise the 1 ₪ charge to the user. Decide whether web shows a disclosure ("A 1 ₪ verification charge will be made and refunded") — note that today it is **not auto-refunded**.
4. **Save-card on tournament/event initiate.** The backend silently ignores `save_card: true` on these entities. If product wants save-card during tournament/event payments, that's a backend change (out of this spec's scope).
5. **`tournament_id` / `event_id` not in the Grow return URL.** Currently relies entirely on sessionStorage. If the user clears storage mid-flow (rare but possible), `/payments/confirming` will be unable to poll. Acceptable fallback: route to `/my-activity` and let them check status there. Alternative (out of scope): backend includes the parent id in the return URL.
6. **Webhook delay > 30 s.** If Grow's queue lags beyond the polling window, the user sees "still processing". This is acceptable — the entity is paid; only the UI is impatient. Add a banner on `/my-activity` if the entity recently transitioned, to reinforce this.

---

**End of spec.** This document is the single source of truth for Grow integration on web. Update it in the same PR as any behaviour change.
