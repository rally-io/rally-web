# Residency Fee Waiver — rally-web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/join/<slug>` a player can declare "I'm a Holon resident" or "we're both Holon residents", attach 1–2 proof files per resident, and register at the reduced price; the registered card shows the waiver state and lets them add missing files; after a rejection the form simply shows again (the API returns no active registration).

**Architecture:** The event entry and the tournament both gate the feature. The form gains a `residentCount` choice and one `EvidencePicker` per resident; the register payload carries `fee_waiver`; the shared hook awaits `onRegistered(reg)` so the page can upload evidence before the payment hand-off (the hook's payment branches are untouched because the API's `amount_to_pay` already reflects the waiver). The registered card reads the new `my_registration` fields.

**Tech Stack:** React 18, TypeScript, react-query, axios (FormData upload), react-i18next, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-09-residency-fee-waiver-design.md`. **API contract** (from the rally-api plan): `POST …/register` accepts `fee_waiver: { type: 'holon_resident', resident_count: 1 | 2 }`; registration responses carry `fee_waiver_type`, `fee_waiver_status` (`pending|approved|rejected`), `fee_waiver_resident_count`, `evidence_counts: { "1": n, "2": n }`, and `amount_to_pay`/`entry_fee` already reduced; `POST /rally/v1/tournaments/registrations/{rid}/evidence` (multipart `files[]` + `for_player`; returns `{ items: [...] }` with ONLY the rows this request created; a failed upload comes back as HTTP 200 `{ success: false, error }`, which the shared axios client does NOT reject on for a 200 — the helpers in `registrationEvidence.ts` check `success` themselves and throw; callers treat any rejection as failure), `GET …/evidence` (returns `{ items: [...] }`, the full live set, owner only); tournament detail carries `fee_waiver_type`. After a rejection the API sets the registration `is_active=false`, so `my_registration` comes back `null` and the page simply shows the form again (the player already got the WhatsApp rejection message) — there is NO rejected-waiver card.

**Branch:** `feat/corporate-tournament-registration` (HEAD `d313488`), base `origin/main`.

## Global Constraints

- Copy exactly as the spec's table; new keys added to both locales and to `REQUIRED_REG_KEYS` in `src/i18n/locales/corporateKeys.test.ts`.
- Client-side limits mirror the server: ≤ 2 files per resident, JPEG/PNG/WebP/PDF, ≤ 10 MB.
- `TournamentDetailPage` behaviour unchanged (it passes no waiver and its `onRegistered` ignores the argument).
- The waiver block renders only when `event.feeWaiver` is set **and** `tr.fee_waiver_type === event.feeWaiver.type`; the "both" option only for `doubles | mixed`.
- `src/constants/corporateEvents.ts` and `public/israel-open-2026-hero.jpeg` stay uncommitted; the `israel-open-2026` entry gains `feeWaiver: { type: 'holon_resident' }` in the working tree only.
- Commit trailers on every commit: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GHhmJYeuaaaU3hfxiQ9Wu8`.
- `npx vitest run` fully green and `npx tsc -b --noEmit` clean before each commit.

## File Structure

| File | Responsibility |
|---|---|
| `src/types/api.ts` | `FeeWaiverRequest`, `RegisterPayload.fee_waiver?`, `TournamentDetail.fee_waiver_type?`, waiver fields on `MyRegistration` and `TournamentRegistrationResult`, `EvidenceItem` |
| `src/constants/corporateEvents.ts` | `CorporateTournamentEvent.feeWaiver?` |
| `src/services/api/registrationEvidence.ts` (new) | `uploadRegistrationEvidence(rid, forPlayer, files)`, `listRegistrationEvidence(rid)` |
| `src/lib/evidenceRules.ts` (new) | `EVIDENCE_MAX_FILES = 2`, `EVIDENCE_MAX_BYTES`, `EVIDENCE_ACCEPT`, `validateEvidenceFiles(existing, incoming) → error key \| null`, `waivedAmount(entryFee, seats, residents)` |
| `src/components/corporate/EvidencePicker.tsx` (+test) | file input styled as a drop zone, chips, remove, errors |
| `src/hooks/useTournamentRegistration.ts` | `buildRegisterPayload(…, feeWaiver?)`, `await onRegistered?.(reg)` |
| `src/pages/CorporateRegistrationPage.tsx` (+tests, fixtures) | waiver block, per-resident pickers, price, upload after register, registered card states |
| `src/i18n/locales/{he,en}.json`, `corporateKeys.test.ts` | copy |

---

### Task 1: Types, event flag, evidence rules, API helpers, copy

- [ ] `src/types/api.ts`: `export interface FeeWaiverRequest { type: 'holon_resident'; resident_count: 1 | 2 }`; add `fee_waiver?: FeeWaiverRequest` to the base member of `RegisterPayload` (so every `partner_type` variant accepts it); `fee_waiver_type?: string | null` on `TournamentDetail`; on `MyRegistration` and on the register result type: `fee_waiver_type?: string | null; fee_waiver_status?: 'pending' | 'approved' | 'rejected' | null; fee_waiver_resident_count?: number | null; evidence_counts?: Record<'1' | '2', number>`; `export interface EvidenceItem { id: string; for_player: 1 | 2; content_type: string; size_bytes: number; created_at: string }`.
- [ ] `CorporateTournamentEvent.feeWaiver?: { type: 'holon_resident' }` with a doc comment ("offered only when the tournament's `fee_waiver_type` matches"). Add it to the uncommitted `israel-open-2026` entry (do not stage the file).
- [ ] `src/lib/evidenceRules.ts`:
```ts
export const EVIDENCE_MAX_FILES = 2
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024
export const EVIDENCE_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'
const ALLOWED = new Set(EVIDENCE_ACCEPT.split(','))
export type EvidenceError = 'evidenceTooMany' | 'evidenceBadFile'
export function validateEvidenceFiles(existing: File[], incoming: File[]): EvidenceError | null {
  if (existing.length + incoming.length > EVIDENCE_MAX_FILES) return 'evidenceTooMany'
  for (const f of incoming) if (!ALLOWED.has(f.type) || f.size > EVIDENCE_MAX_BYTES) return 'evidenceBadFile'
  return null
}
/** Pair price after removing the residents' share; seats = 1 (singles) or 2. */
export function waivedAmount(entryFee: number, seats: 1 | 2, residents: 0 | 1 | 2): number {
  const r = Math.min(residents, seats)
  return Math.round((entryFee * (seats - r) / seats) * 100) / 100
}
```
  Unit tests: counts, type, size, `waivedAmount(150, 2, 1) === 75`, `(150, 2, 2) === 0`, `(150, 1, 1) === 0`, `(150, 2, 0) === 150`.
- [ ] `src/services/api/registrationEvidence.ts`: `uploadRegistrationEvidence(registrationId, forPlayer, files)` builds `FormData` (`files` appended per file, `for_player`), posts with the shared client and `headers: { 'Content-Type': undefined }` (or however the client lets the browser set the multipart boundary — check `client.ts`'s default headers and write a test that the request has no JSON content type); `listRegistrationEvidence(registrationId)`. Tests in `src/services/api/registrationEvidence.test.ts` with the client mocked like `tournaments.test.ts`.
- [ ] Copy: all `corporate.reg.*` keys from the spec table in he + en; `REQUIRED_REG_KEYS` extended. Commit `feat(corporate): fee waiver types, evidence rules, api helpers, copy`.

---

### Task 2: `EvidencePicker`

- [ ] `src/components/corporate/EvidencePicker.tsx`: props `{ id: string; label: string; files: File[]; onChange(files: File[]): void; error?: string | null; disabled?: boolean }`. Renders a `Field` (label, error/hint contract) wrapping a hidden `<input type="file" multiple accept={EVIDENCE_ACCEPT}>` behind a `button` styled with `inputClass(false)` ("בחרו קבצים"), then one chip per file (name, size in MB, a remove `×` with `aria-label`). On change: `validateEvidenceFiles(files, picked)`; on error call `onChange(files)` unchanged and surface the error key via a callback `onError(key)` (the page maps it to copy); on success `onChange([...files, ...picked])`. Keep the component copy-free except the `evidencePick` button label (i18n).
- [ ] Tests: picks two valid files → `onChange` with both; third → `onError('evidenceTooMany')`; a `.txt` → `evidenceBadFile`; remove chip → `onChange` without it; disabled → input disabled. Commit `feat(corporate): evidence picker`.

---

### Task 3: Hook — payload and `onRegistered(reg)`

- [ ] `buildRegisterPayload(format, state, acknowledgedMessages, feeWaiver?: FeeWaiverRequest)` spreads `...(feeWaiver ? { fee_waiver: feeWaiver } : {})` into every returned object. `register(partnerState, feeWaiver?)` threads it. `onRegistered?: (reg: TournamentRegistrationResult) => void | Promise<void>`; the call becomes `await onRegistered?.(reg)` (still inside the `mounted` guard, before the amount branches). `TournamentDetailPage`'s existing `onRegistered: () => setPartnerState({ phase: 'idle' })` keeps compiling.
- [ ] Tests (`useTournamentRegistration.test.ts` or the existing hook test file): payload contains `fee_waiver` when given and not otherwise; `onRegistered` receives the registration and the hook waits for it before navigating (an `onRegistered` that resolves after a tick → `navigate` not yet called when it starts, called after). `tournaments.test.ts` two-argument assertion still passes. Commit `feat(registration): hook carries the fee waiver and awaits onRegistered(reg)`.

---

### Task 4: The form — waiver block, pickers, price, upload after register

- [ ] In `RegistrationForm` (`CorporateRegistrationPage.tsx` ~`:328-527`): `residentCount: 0 | 1 | 2`, `myFiles: File[]`, `partnerFiles: File[]`, `evidenceError`. `waiverOffered = !!event.feeWaiver && tr.fee_waiver_type === event.feeWaiver.type`; `seats = tr.format === 'singles' ? 1 : 2`. Block placement: between the level fieldset and the partner section: title `waiverTitle`, hint `waiverHint`, three pill buttons (`waiverNone`, `waiverOne`, `waiverBoth` — the third hidden when `seats === 1`; `aria-pressed`), then `EvidencePicker` "evidenceMine" when `residentCount ≥ 1` and "evidencePartner" when `residentCount === 2`. Price block: `waivedAmount(tr.entry_fee, seats, residentCount)` with `priceHalf`/`priceWaived` subtitles (₪0 → `priceWaived`, half → `priceHalf`, full → today's `priceLabel`).
- [ ] Validation: `residentCount ≥ 1 && myFiles.length === 0` → `evidenceRequired`; `residentCount === 2 && partnerFiles.length === 0` → same; `residentCount === 2` requires a partner (reuse the partner-required scroll).
- [ ] Submit: `register(partnerState, residentCount ? { type: event.feeWaiver.type, resident_count: residentCount } : undefined)` with `onRegistered: async (reg) => { if (!residentCount) return; try { await uploadRegistrationEvidence(reg.id, 1, myFiles); if (residentCount === 2) await uploadRegistrationEvidence(reg.id, 2, partnerFiles) } catch { setUploadFailed(true) } finally { await refetchTournament() } }` — `onRegistered` is passed through `useTournamentRegistration`'s options (the page already builds them at `:51`). An upload failure must not block the flow: the card's add-evidence path recovers it.
- [ ] Tests (`CorporateRegistrationPage.form.test.tsx`, fixtures extended with `mockUploadEvidence`): block absent when the event has no `feeWaiver`; absent when `tr.fee_waiver_type` is null; present with both; "both" hidden for singles; price shows 75 / 0 / 150 as `residentCount` changes; submit without files → `evidenceRequired`; submit with 1 resident + 1 file → `register` called with `fee_waiver {resident_count: 1}` and upload called with `(reg.id, 1, [file])`; 2 residents → two uploads; upload rejection → `uploadFailed` state rendered. Commit `feat(corporate): residency waiver on the registration form`.

---

### Task 5: Registered card — waiver line, add evidence, rejected re-register

- [ ] `RegisteredCard` (`:253-317`): when `myReg.fee_waiver_status` is set, render a waiver line above the payment state: `registeredStatus_waiverPending` with `{ residents: fee_waiver_resident_count }` (or "approved" copy once approved — reuse the confirmed status line), then per declared resident `evidenceCount` (`evidence_counts["1"]`, `["2"]`) and, when a count is 0 and status is pending, an `EvidencePicker` + "addEvidence" button that calls `uploadRegistrationEvidence(myReg.id, n, files)` then refetches; show `evidenceUploadFailed` when the page arrived with `uploadFailed`.
- [ ] Rejected waiver: `NON_CONFIRMED_STATUSES` branch — when `status === 'rejected'` and `fee_waiver_status === 'rejected'`, body `waiverRejectedBody` and a `registerAgainPaid` button that clears the page's `myReg` view (refetch; the API returns no active registration) so the form renders.
- [ ] Tests: pending 2/2 with counts {1:2, 2:1}; pending 1/2 with payment pending → both the waiver line and the complete-payment button; count 0 → picker + add button → upload called; rejected waiver → copy + button → after refetch the form shows. Commit `feat(corporate): registered card shows the residency waiver and evidence`.

---

### Task 6: Docs

- [ ] Force-add this plan (`docs/` is ignored). The controller updates the wiki.
