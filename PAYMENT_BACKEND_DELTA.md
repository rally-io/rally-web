# Rally-API — Backend Changes Required for Web Payments

> **Audience:** rally-api engineer.
> **Companion doc:** `rally-website/docs/PAYMENT_SPEC.md` (full web flow).
> **Why this exists:** the rally-website payment API layer can wrap the
> existing `/rally/v1/payments/*` endpoints today, but three things on the
> rally-api side need attention before the end-to-end web flow can ship.
> This file is the contract for those changes.

---

## 1. BLOCKER — Source-tagged Grow return URLs

### What's wrong today

`app/services/payment_service.py` builds Grow's `success_url` / `cancel_url`
pointing at `/payments/callbacks/grow/success` and `/cancel`. Then
`app/routers/consumer/payment_callbacks.py` (or wherever those callback
handlers live) **always** redirects the browser to:

```
app.rallypadel://payment-result?status=success&type=...&id=...
```

A web user who completes a payment on Grow's hosted checkout lands on a
custom-scheme URL their browser cannot resolve. Dead end.

### What the web needs

The success/cancel callbacks must know whether the player started from web
or from mobile, and redirect accordingly:

| Source   | Redirect target                                                     |
|----------|---------------------------------------------------------------------|
| `mobile` | `app.rallypadel://payment-result?status=...&type=...&id=...` (current behaviour, default) |
| `web`    | `https://rallypadel.app/payments/return?status=...&type=...&id=...` (new) |

The web origin should come from a config var (`WEB_BASE_URL`), **not**
hardcoded — staging vs production differ, and never trust user input here.

### Recommended implementation (spec §6.2, option 1 — minimal diff)

1. **Tag the source when creating the Grow session.** In every `initiate_*`
   path inside `payment_service.py`, set Grow's `cfield3` (or another unused
   cfield) to `source:web` when the caller is web, `source:mobile` otherwise.

   - Detection: the request is from web if the caller sent a header like
     `X-Rally-Client: web`, OR if the `User-Agent` doesn't match a known
     mobile UA. **Header is cleaner.** Web will set it in
     `src/services/api/client.ts`. Default to `mobile` for back-compat.

   - Pass through to Grow:
     ```python
     payload["cfield3"] = f"source:{source}"   # 'web' | 'mobile'
     ```

   Grow echoes `cfield3` back on the redirect — that's how the callback
   reads it.

2. **Branch the callback redirect on `cfield3`.** In
   `payment_callbacks.py` (or wherever `/payments/callbacks/grow/success`
   and `/cancel` are implemented):

   ```python
   source = parse_cfield(request.query_params.get("cfield3", ""))  # 'web' or 'mobile'

   if source == "web":
       target = f"{settings.WEB_BASE_URL}/payments/return?status={status}&type={type_}&id={id_}"
   else:
       target = f"app.rallypadel://payment-result?status={status}&type={type_}&id={id_}"

   return RedirectResponse(url=target)
   ```

3. **Allow-list `WEB_BASE_URL`** in settings. Single string, no user input,
   no allow-list traversal — keeps PCI scope tight and eliminates open-redirect
   risk. Production = `https://rallypadel.app`, staging = whatever staging
   is. No per-call `return_url` parameter (rejected as too much surface).

### Endpoints affected

All four `initiate_*` handlers in `routers/consumer/payments.py`:

- `POST /payments/booking/{booking_id}/initiate`
- `POST /payments/tournament-registration/{registration_id}/initiate`
- `POST /payments/event-participation/{participant_id}/initiate`  *(see §2 — this one is also missing)*
- `POST /payments/save-card/initiate`

Plus the two callback routes:

- `GET /payments/callbacks/grow/success`
- `GET /payments/callbacks/grow/cancel`

### Why this is a blocker

Without this, the `/payments/return` route on the web doesn't get hit, so
the web user can't be navigated to the post-payment polling screen. The
webhook still confirms the entity server-side (authoritative), so payment
itself doesn't break — but the UX dead-ends on a `app.rallypadel://` URL.

### What the web side will do

`rally-website/src/services/api/client.ts` will set an
`X-Rally-Client: web` header on every outgoing request. The BE only needs
to read it inside the `initiate_*` handlers.

### Acceptance test

1. `curl -H "X-Rally-Client: web" -X POST .../payments/booking/{id}/initiate`
   → response includes `payment_url`. Open it in a browser, complete
   payment in Grow sandbox.
2. Grow redirects browser to
   `https://rallypadel.app/payments/return?status=success&type=booking&id=...`
   — **not** to `app.rallypadel://...`.
3. Same request without the header (or with `X-Rally-Client: mobile`)
   still redirects to `app.rallypadel://payment-result?...` for mobile back-compat.

---

## 2. GAP — `event-participation/initiate` handler missing

### What's wrong today

`PaymentService.initiateEventParticipationPayment` exists on mobile and
hits `POST /payments/event-participation/{participant_id}/initiate`. The
matching FastAPI handler does **not** exist in
`routers/consumer/payments.py`. Mobile masks the gap by only using
saved-card-only flows for events.

The web spec (`PAYMENT_SPEC.md` §11.1) explicitly calls this out as a gap.

### What the web needs

The handler, mirroring the booking and tournament-registration ones. Same
shape:

```
POST /rally/v1/payments/event-participation/{participant_id}/initiate
Body: (empty)
→ 200 { success: true, data: { payment_url: "https://meshulam.co.il/..." } }
→ 4xx if the participant is not in payment_pending, amount is 0, etc.
```

Implementation should reuse `_initiate_hosted_checkout` / whatever the
shared helper inside `payment_service.py` is — the only difference is the
entity lookup (`EventParticipant` instead of `Booking` /
`TournamentRegistration`) and the amount-due derivation
(`event_participation.payment.amount`).

### Why this is a gap, not a blocker

Web can ship saved-card-only event flow without this handler (matches
mobile's current UX). It only blocks the "user with no saved card joins a
paid event" case. Coordinate priority — if web ships events at all, this
handler should land alongside it.

### Acceptance test

`POST /rally/v1/payments/event-participation/{participant_id}/initiate`
returns a `payment_url` for a participant in `payment_pending` with
`amount > 0`. Returns 4xx with `RallyException` message otherwise.

---

## 3. RESOLVED — `grow_*` response shape on `charge-saved-card`

**BE confirmed:** all three `charge-saved-card` endpoints return
`{ "grow_asmachta": ..., "amount": ... }` — no legacy `hyp_*` keys
server-side. Web typing as `ChargeSavedCardResponse = { grow_asmachta: string; amount: number }`
is correct as-is. No backend work required for this item.

---

## Summary

| #   | Severity | Effort                         | Blocks                                        |
|-----|----------|--------------------------------|------------------------------------------------|
| 1   | 🔲 **Still Open** — Blocker  | ~1 router branch + 1 cfield + 1 setting | `/payments/return` (web post-payment UX) |
| 2   | 🔲 **Still Open** — Gap      | ~30 LOC new handler            | Event hosted-checkout flow (web suppressed until handler ships — see T9 workaround in `PaymentMethodPage.tsx`) |
| 3   | ✅ Resolved | —                            | (No work — `grow_*` shape confirmed)          |

Web payment API wrappers can ship before any of these land — they wrap
existing endpoints. But the end-to-end web flow needs at minimum #1
before users can complete a payment without hitting a dead end.

---

## Out of scope (intentionally)

These were considered and rejected; don't implement unless asked:

- **Per-call `return_url` parameter** on `initiate_*` endpoints. More
  flexible but introduces an open-redirect surface that would need an
  allow-list. Source-tagging (option 1) is simpler and covers all
  current needs.
- **`/save-card/confirm` endpoint.** Spec §5.6 confirms `confirmSaveCard`
  is deprecated; the webhook is authoritative. Don't add a new one.
- **3DS handling for token charges.** Not needed today; would only be
  built if we see frictionless-MIT declines spike (spec §11.4).
