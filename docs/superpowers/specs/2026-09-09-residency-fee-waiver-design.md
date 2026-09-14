# Residency fee waiver with evidence — design

**Status:** draft for owner review, 2026-09-09. Spans rally-api (primary), rally-web (`/join/<slug>`),
rally-crm (registration review). Builds on the corporate registration page and the onboarding details
step on `feat/corporate-tournament-registration`, and on `feat/tournament-is-unlisted` in rally-api.

## Problem

The Israel Open at Padel Time Club is free for Holon residents and paid for everyone else. Residents
must prove residency (an ID card with the address, or a municipal bill). Today a tournament has one
price, uploads are all public, and staff have nowhere to see such evidence next to the registration
they are approving.

## Decisions (owner, 2026-09-09)

| Question | Decision |
|---|---|
| Who reviews, where | **Club staff in the CRM**, on the existing registrations tab, with the existing Approve / Reject buttons. |
| Rejected evidence | **Registration is rejected** (existing flow, existing WhatsApp template); the player may register again as a paying player. |
| Evidence | **1–2 files**, JPEG / PNG / WebP / PDF, ≤ 10 MB each. iPhone HEIC arrives as JPEG through the browser's file input. |
| Storage | **Private** Supabase bucket, never the public one; the CRM reads through short-lived signed URLs. |
| Where the waiver is authorised | **Server-side, per tournament** (`tournaments.fee_waiver_type`). The event page only *offers* the option when both the event entry and the tournament allow it. |

**Owner decision (2026-09-09):** residency is per player. The form offers two options — "אני תושב/ת
חולון" or "שנינו תושבי חולון" — and the pair price drops by the residents' share:

| Option | `resident_count` | Amount due (doubles/mixed) | Path |
|---|---|---|---|
| none | 0 | full `entry_fee` | today's hold flow |
| I'm a resident | 1 | `entry_fee / 2` | hold for half, waiver pending |
| We're both residents | 2 | ₪0 | `registered`, no payment, waiver pending |

Singles tournaments have one player, so only "I'm a resident" exists and it means ₪0. Evidence is per
resident: up to 2 files for each declared resident (max 4 per registration), uploaded by the registering
player for both.

## Flow

1. **Event page.** When the `CorporateEvent` entry declares `feeWaiver: { type: 'holon_resident' }`
   *and* the loaded tournament has `fee_waiver_type === 'holon_resident'`, the form shows a
   "הנחת תושבי חולון" block with a three-way choice: none (default) · "אני תושב/ת חולון" ·
   "שנינו תושבי חולון" (the second option only for doubles/mixed). Choosing a resident option reveals one
   evidence picker **per declared resident** ("ההוכחה שלי", "ההוכחה של השותף/ה"; 1–2 files each, the
   accepted types) and the ₪ price block shows the computed amount: "₪75 · חצי מדמי ההרשמה, בכפוף
   לאישור תושבות" or "₪0 · בכפוף לאישור תושבות". At least one file per declared resident is required.
2. **Register.** Submit order is unchanged (validate → partner → terms gate → `ensure()` → `register()`)
   with `fee_waiver: { type: 'holon_resident', resident_count: 1 | 2 }` added to the payload. The API
   stores the waiver as pending and derives the **effective entry fee** (below). Amount 0 → the
   registration is `registered` with no payment; amount > 0 → `payment_pending`, exactly today's flow but
   for the reduced amount (the hold is placed for half, captured on approve, voided on reject).
3. **Upload.** Right after the row exists, the page uploads the files to
   `POST /rally/v1/tournaments/registrations/{rid}/evidence` (multipart, `for_player` 1 or 2 per file, ≤ 2
   live files per resident). Then the register hook continues as today: amount 0 → the registered card;
   amount > 0 → `/payment-method` for the reduced hold, with `return_to` back to the event.
4. **Registered card.** Shows the waiver line "ממתין לאישור תושבות (1/2 · 2/2)" with the evidence count
   per resident, on top of today's payment states (a half-price registration still shows "complete
   payment" until the hold is placed). If a resident has no evidence stored yet (upload failed, or a refresh
   mid-way), the card offers "הוסיפו הוכחת כתובת" for that resident, until the waiver is approved or
   rejected.
5. **CRM.** On the tournament's participants tab, waived rows show a "תושבות 1/2 · ממתין" (or 2/2) chip
   beside the status, and an "הוכחות" button that opens a dialog with the files grouped by player (images
   inline, PDFs open in a new tab). Approve confirms the registration (capturing the reduced hold when
   there is one) and sets `fee_waiver_status='approved'`; Reject sets `rejected` (voiding the hold when
   there is one) and sends the existing rejection message. Both buttons stay one-click, as today. If staff
   find that only one of two declared residents qualifies, they reject; the player registers again with
   the right option.
6. **After a rejection** the event page shows a terminal card whose copy says the residency claim was
   declined and offers "להירשם מחדש בתשלום", which reopens the form; the API must not let the rejected
   registration block the new one.

## rally-api

### Data (deploy gates: DDL on prod before the API deploy; the private bucket created on both projects)

- `tournaments.fee_waiver_type text NULL` — the only value today is `'holon_resident'`; set by SQL alongside
  `is_unlisted` until a CRM toggle exists.
- `tournament_registrations.fee_waiver_type text NULL`, `fee_waiver_status text NULL`
  (`pending | approved | rejected`; plain text, no `ALTER TYPE`, so the script runs in a transaction),
  `fee_waiver_resident_count smallint NULL` (1 or 2).
- New table `registration_evidence`: `id uuid pk`, `registration_id uuid fk`, `for_player smallint`
  (1 = player_1, 2 = player_2/guest), `storage_path text`, `content_type text`, `size_bytes int`,
  `uploaded_by uuid`, `created_at timestamptz`, `deleted_at timestamptz NULL`. Soft delete only.
- Supabase Storage bucket `registration-evidence`, **private**, 10 MB file limit, allowed MIME types
  image/jpeg, image/png, image/webp, application/pdf. Object path
  `tournaments/{tournament_id}/registrations/{registration_id}/{uuid}.{ext}`.
- `scripts/sql/2026-09-09-residency-fee-waiver.sql` with the DEPLOY GATE header convention + a
  documentation-only alembic revision, as for `is_unlisted`.

### Behaviour

- **One rule for the fee.** `TournamentRegistration.effective_entry_fee` (model property): when
  `fee_waiver_status in (pending, approved)`, `tournament.entry_fee × (seats − resident_count) / seats`
  where `seats` is 2 for doubles/mixed and 1 for singles; otherwise `tournament.entry_fee`. Every place
  that reads `tournament.entry_fee` for money uses it instead: `amount_to_pay` and `gross_amount`
  (`tournament_registration.py:56-68`), `initiate_tournament_registration_payment`
  (`payment_service.py:636-659` and the second variant at `:1028-1053`), and
  `confirm_zero_payment_tournament_registration` (`:1454-1460`). The waitlist hold is untouched (waivers
  are not offered on the waitlist).
- `register_tournament`: accepts `fee_waiver: {type, resident_count}` on `TournamentRegistrationCreate`.
  Validation: `tournament.fee_waiver_type == type` else `400 FEE_WAIVER_NOT_AVAILABLE`; `resident_count`
  1 or 2, and 2 only when the format has two seats and a partner is given, else `400`. The status decision
  (`tournament_service.py` ~L3791) uses the effective fee: `payment_pending` when > 0, else `registered`;
  service fee via the existing `SettingsService.get_service_fee` on the effective fee. Everything else
  (partner handling, capacity, uniqueness, club membership grant on `registered`) unchanged.
- `confirm-zero-payment` keeps working for the 2/2 case because it recomputes with the effective fee.
- `approve_registration`: unchanged (captures a hold when there is one — the reduced amount — or
  confirms with no money for 2/2) plus `fee_waiver_status='approved'` when pending. `reject_registration`:
  unchanged (voids the hold when there is one) plus `fee_waiver_status='rejected'` and `is_active=false`
  so the filtered uniqueness index and `my_registration` selection let the player register again.
- New consumer endpoints, both requiring the caller to be `player_1` or `player_2` of an **active**
  registration with a **pending** waiver:
  - `POST /rally/v1/tournaments/registrations/{rid}/evidence` — multipart `files[]` + form field
    `for_player` (1 | 2; 2 only when `resident_count == 2`); per file: size cap, content sniff (Pillow for
    images, `%PDF-` magic for PDF — extend `StorageUtil.validate_image_upload` with a document variant
    rather than duplicating it); refuses when that resident would exceed 2 live files (`409
    EVIDENCE_LIMIT`). Uploads to the private bucket, inserts rows, returns the list.
  - `GET /rally/v1/tournaments/registrations/{rid}/evidence` — `[{id, for_player, content_type,
    size_bytes, created_at}]` (no URLs for the player; they know what they uploaded).
- New CRM endpoint `GET /manage/v1/tournaments/registrations/{rid}/evidence`, gated by
  `check_tournament_access_via_registration`, returning the same rows plus `url` = signed URL, 3600 s.
- Response schemas: `RegistrationResponse` (CRM list) and the consumer `my_registration` /
  `TournamentRegistrationResponse` gain `fee_waiver_type`, `fee_waiver_status`,
  `fee_waiver_resident_count`, `evidence_counts: {"1": n, "2": n}`; `amount_to_pay` already reflects the
  effective fee.
  `StorageUtil` gains `upload_private_bytes` + `create_signed_url(bucket, path, expires_in)`.
- Notifications: none new. Approve and reject reuse `send_registration_approved` /
  `send_tournament_rejection_by_manager`.
- Mobile: unaffected; the new fields are additive and mobile never sends `fee_waiver`.

### Out of scope (follow-ups)

Evidence retention (delete 30 days after the tournament ends — a scheduler job or a manual script; the
soft-delete column and the object path make it a one-query job); a CRM toggle for `fee_waiver_type`;
a "waiver submitted" WhatsApp; partner-level residency.

## rally-web

- `CorporateTournamentEvent` gains optional `feeWaiver: { type: 'holon_resident' }`; the Israel Open entry
  sets it. `TournamentDetail` type gains `fee_waiver_type`; `MyRegistration` gains the waiver fields.
- Form: `residentCount` state (0 | 1 | 2, radio-style pills; 2 hidden for singles); one `EvidencePicker`
  per declared resident (`src/components/corporate/EvidencePicker.tsx`, same `Field`/`inputClass` look:
  an `<input type="file" multiple accept=…>` styled as a drop zone, file chips with remove, client-side
  checks for count/type/size with the same limits as the server, error copy). Price block shows the
  computed amount (`entry_fee × (2 − residentCount) / 2`, ₪0 for 2/2). Validation: at least one file per
  declared resident.
- `RegisterPayload` gains `fee_waiver?`; `buildRegisterPayload` takes it as an extra argument;
  `useTournamentRegistration` passes the created registration to `onRegistered(reg)` and **awaits it**
  before the payment branches (so the evidence upload completes before the hand-off to
  `/payment-method`); the branches themselves are unchanged — `amount_to_pay` from the API already
  reflects the waiver. `TournamentDetailPage` is unchanged.
- New API helpers in `src/services/api/registrationEvidence.ts`: `uploadRegistrationEvidence(rid, files)`
  (FormData; the shared axios client must not send its JSON `Content-Type` for this call) and
  `listRegistrationEvidence(rid)`.
- Registered card: a waiver line (status + per-resident evidence counts) above today's payment states,
  with an add-evidence picker for any declared resident whose count is 0; terminal card for a rejected
  waiver with the re-register CTA (refetching makes `my_registration` null because the API sets
  `is_active=false`).
- Copy (he/en), all under `corporate.reg.*` and added to `REQUIRED_REG_KEYS`:

| key | he | en |
|---|---|---|
| `waiverTitle` | הנחת תושבי חולון | Holon residents' discount |
| `waiverNone` | לא תושבים | Not residents |
| `waiverOne` | אני תושב/ת חולון | I'm a Holon resident |
| `waiverBoth` | שנינו תושבי חולון | We're both Holon residents |
| `waiverHint` | תושבי חולון משחקים חינם. צרפו הוכחת כתובת לכל תושב/ת: תעודת זהות עם הספח או חשבון ארנונה. עד 2 קבצים לכל אחד, JPG/PNG/PDF עד 10MB. | Holon residents play for free. Attach proof of address for each resident: ID card with the address slip, or a municipal bill. Up to 2 files each, JPG/PNG/PDF up to 10 MB. |
| `evidenceMine` | ההוכחה שלי | My proof |
| `evidencePartner` | ההוכחה של השותף/ה | My partner's proof |
| `priceHalf` | חצי מדמי ההרשמה · בכפוף לאישור תושבות | Half the entry fee · subject to residency approval |
| `evidencePick` | בחרו קבצים | Choose files |
| `evidenceRequired` | צרפו לפחות הוכחת כתובת אחת לכל תושב/ת | Attach at least one proof of address per resident |
| `evidenceTooMany` | אפשר לצרף עד 2 קבצים לכל תושב/ת | Up to 2 files per resident |
| `evidenceBadFile` | הקובץ חייב להיות JPG, PNG או PDF עד 10MB | The file must be a JPG, PNG or PDF up to 10 MB |
| `priceWaived` | ₪0 · בכפוף לאישור תושבות | ₪0 · subject to residency approval |
| `registeredStatus_waiverPending` | ממתין לאישור תושבות מהמועדון ({{residents}}/2) | Waiting for the club to confirm residency ({{residents}}/2) |
| `evidenceCount` | {{count}} קבצים צורפו | {{count}} files attached |
| `addEvidence` | הוסיפו הוכחת כתובת | Add proof of address |
| `evidenceUploadFailed` | ההרשמה נקלטה אבל ההעלאה נכשלה. אפשר לצרף את הקבצים כאן. | You're registered, but the upload failed. Attach the files here. |
| `waiverRejectedBody` | בקשת הפטור לתושבי חולון לא אושרה. אפשר להירשם מחדש בתשלום. | The Holon-resident waiver was not approved. You can register again as a paying player. |
| `registerAgainPaid` | להירשם מחדש בתשלום | Register again and pay |

## rally-crm

- `Registration` type gains the three fields; `src/api/tournaments.ts` gains `getRegistrationEvidence(id)`.
- Participants tab (`tournament-dashboard-view.tsx`, both the desktop cell and the mobile card): a small
  amber "תושבות 1/2 · ממתין" / green "תושבות 2/2 · אושר" chip beside the status span, driven by a tiny map
  in `src/constants/registration-status.ts` (orthogonal to `RegistrationStatus`), and an "הוכחות" button
  (with the total count; "אין הוכחות" when 0) that opens `EvidenceDialog`
  (`src/features/tournaments/components/EvidenceDialog.tsx`, a `Dialog` grouping files by player with
  the images inline — the `ReportDetailDrawer` pattern — and PDFs as "open" links). URLs are fetched when
  the dialog opens and are not cached beyond it (they expire).
- Approve / Reject unchanged. Strings under `tournaments.waiver.*` in both locales.

## Testing

- **API** (service tests on the dev DB): register with `resident_count=2` on an allowed doubles tournament
  → `registered`, amount 0, waiver pending; `resident_count=1` → `payment_pending` with `amount_to_pay ==
  entry_fee/2` and the hold initiated for that amount; singles with `resident_count=1` → amount 0;
  `resident_count=2` on singles or without a partner → 400; a tournament without `fee_waiver_type` → 400;
  evidence upload: owner only, pending only, `for_player=2` only when `resident_count == 2`, 3rd file for
  the same resident refused, bad type refused, PDF accepted, size cap; CRM evidence endpoint returns signed
  URLs grouped by player and 403s a foreign account; approve sets `approved` (and captures the half hold
  when present); reject sets `rejected` + `is_active=false` (voiding the hold when present) and a new
  registration by the same player succeeds; CRM list and consumer `my_registration` carry the fields;
  `confirm-zero-payment` on a 2/2 registration does not 400 and on a 1/2 registration 400s as today.
- **Web**: the waiver block absent without the event flag, absent without the tournament flag, present
  with both, "both" option hidden for singles; per-resident picker validation; price block shows half / ₪0;
  payload carries `fee_waiver` with the count; hook awaits `onRegistered(reg)` before the payment
  branches; uploads called per resident after register; registered card states (pending 1/2 with the
  complete-payment button, pending 2/2, a resident with 0 files + add-evidence, rejected + re-register);
  `TournamentDetailPage` tests unchanged.
- **CRM**: chip rendering per waiver status on both layouts; dialog fetches and renders; approve/reject
  behaviour unchanged.
- **Browser (dev)**: create the private bucket on dev, set `fee_waiver_type` on the fixture tournament,
  run the 2/2 path end-to-end (two residents, two uploads), see the files grouped by player in the CRM as
  the club account, reject, re-register as 1/2 to the Grow card form for half the fee; approve a second
  2/2 registration and confirm the WhatsApp approval template is what fires.

## Ship gates

1. Prod DDL (`scripts/sql/2026-09-09-residency-fee-waiver.sql`) before the API deploy.
2. Private bucket `registration-evidence` created on dev and prod (Supabase dashboard; not code).
3. API deploy before web and CRM.
4. Set `fee_waiver_type='holon_resident'` on the Israel Open tournament by SQL (with `is_unlisted`).
