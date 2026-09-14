# Residency Fee Waiver — rally-crm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a tournament's participants tab, club staff see which registrations claim a residency waiver (and for how many players), open the uploaded evidence grouped by player, and approve or reject with the buttons they already use.

**Architecture:** Read-only additions. The registration row type gains the waiver fields; a small chip map beside the status; an `EvidenceDialog` that fetches signed URLs when opened (they expire, so nothing is cached). Approve/Reject are untouched — the API updates the waiver status behind them.

**Tech Stack:** Vite + React + TS, react-query, axios client (`src/api/client.ts`), i18n (`src/locales/{he,en}.json`), Vitest.

**Spec:** `../rally-web/docs/superpowers/specs/2026-09-09-residency-fee-waiver-design.md`. **API contract:** registration rows carry `fee_waiver_type`, `fee_waiver_status` (`pending|approved|rejected`), `fee_waiver_resident_count`, `evidence_counts: { "1": n, "2": n }`; `GET /manage/v1/tournaments/registrations/{id}/evidence` → `{ items: [{ id, for_player, content_type, size_bytes, created_at, url }] }` (signed URLs, 1 h).

**Repo / branch:** `/Users/shahafpariente/Desktop/SideKicks/Rally/rally-crm`, new branch `feat/registration-evidence-review` from `origin/main`.

## Global Constraints

- No change to approve/reject behaviour, dialogs, toasts or query keys.
- Both layouts (desktop `DataTable` cell and the mobile card in `src/app/components/tournament-dashboard-view.tsx`) get the same chip and button — there is no shared row component, so both sites are edited.
- Signed URLs are fetched on dialog open and dropped on close (`staleTime: 0`, `gcTime: 0`).
- Strings under `tournaments.waiver.*` in both `src/locales/he.json` and `src/locales/en.json` (no parity test exists — add the keys to both by hand and grep to confirm).
- Commit trailers: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GHhmJYeuaaaU3hfxiQ9Wu8`.
- `npx vitest run` green and the type-check (`npx tsc --noEmit` or the repo's `typecheck` script) clean before each commit.

## File Structure

| File | Responsibility |
|---|---|
| `src/app/components/tournament-dashboard-view.tsx` | `Registration` type fields; chip + evidence button in both layouts |
| `src/api/tournaments.ts` | `getRegistrationEvidence(id)` |
| `src/constants/registration-status.ts` | `FEE_WAIVER_STATUS_CONFIG` map (orthogonal to `RegistrationStatus`) |
| `src/features/tournaments/components/EvidenceDialog.tsx` (+test) | dialog grouping files by player; images inline, PDFs as links |
| `src/locales/{he,en}.json` | `tournaments.waiver.*` |

---

### Task 1: Types, API helper, chip config, copy

- [ ] `Registration` (`tournament-dashboard-view.tsx:214-221`) gains `fee_waiver_type?: string | null`, `fee_waiver_status?: 'pending' | 'approved' | 'rejected' | null`, `fee_waiver_resident_count?: number | null`, `evidence_counts?: Record<'1' | '2', number>`.
- [ ] `src/api/tournaments.ts`: `export async function getRegistrationEvidence(id: string): Promise<EvidenceItem[]>` → `GET ${BASE}/${id}/evidence`, returns `response.data.data.items`; `EvidenceItem` type next to it.
- [ ] `src/constants/registration-status.ts`: `FEE_WAIVER_STATUS_CONFIG: Record<'pending'|'approved'|'rejected', { i18nKey: string; colorClass: string }>` — pending amber, approved green, rejected red (reuse the palette classes already used there).
- [ ] Copy (he / en): `tournaments.waiver.chip` "תושבות {{residents}}/{{seats}}" / "Residency {{residents}}/{{seats}}"; `pending` "ממתין" / "pending"; `approved` "אושר" / "approved"; `rejected` "נדחה" / "rejected"; `evidence` "הוכחות" / "Evidence"; `noEvidence` "אין הוכחות" / "No evidence"; `dialogTitle` "הוכחות תושבות" / "Residency evidence"; `player1` "שחקן/ית 1" / "Player 1"; `player2` "שחקן/ית 2" / "Player 2"; `openPdf` "פתחו PDF" / "Open PDF"; `loadError` "לא הצלחנו לטעון את הקבצים" / "Couldn't load the files"; `expiresHint` "הקישורים תקפים לשעה" / "Links are valid for one hour".
- [ ] Commit `feat(tournaments): registration waiver fields, evidence api, chip config, copy`.

---

### Task 2: `EvidenceDialog`

- [ ] `src/features/tournaments/components/EvidenceDialog.tsx`: props `{ registrationId: string; residentCount: number; open: boolean; onOpenChange(open): void }`. `useQuery({ queryKey: ['registration-evidence', registrationId], queryFn: () => getRegistrationEvidence(registrationId), enabled: open, staleTime: 0, gcTime: 0 })`. Groups items by `for_player`; each group titled `player1`/`player2` (the second only when `residentCount === 2`); images (`content_type` starting `image/`) rendered inline `<img className="max-h-72 rounded-lg object-contain">` inside a click-to-open `<a target="_blank" rel="noreferrer">`; PDFs as `openPdf` links; empty group → `noEvidence`; loading skeleton; `loadError` on failure; `expiresHint` footer. Built on the repo's `Dialog` primitives (the `DisqualifyDialog` file shows the imports).
- [ ] Tests (`EvidenceDialog.test.tsx`, API mocked): renders two groups with an image and a PDF link; empty group copy; error copy; does not fetch while closed. Commit `feat(tournaments): residency evidence dialog`.

---

### Task 3: Chip and button in both layouts

- [ ] Desktop status cell (`:2434-2441`) and mobile card (`:2588-2593`): when `reg.fee_waiver_status`, render beside the status span a chip `t('tournaments.waiver.chip', { residents: reg.fee_waiver_resident_count, seats: tournament_format === 'singles' ? 1 : 2 })` + ` · ` + `t('tournaments.waiver.' + status)` with the config's `colorClass`; and a small button `t('tournaments.waiver.evidence')` + total count (sum of `evidence_counts`), or `noEvidence` styling when 0, opening `EvidenceDialog` for that registration (one dialog instance at the view level keyed by the selected registration id — do not mount a dialog per row).
- [ ] Tests (the dashboard view's existing test file, or a focused test rendering the row helpers if the view is too heavy to mount): a waived row shows the chip text and the count; a plain row shows neither; clicking the button opens the dialog with the right registration id. Commit `feat(tournaments): residency waiver chip and evidence button on the participants tab`.

---

### Task 4: Docs

- [ ] The controller updates the wiki (`crm-tournaments-ui.md` registration section is already marked stale; add the waiver chip/dialog there).
