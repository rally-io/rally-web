# Tournament authentication implementation plan

> **For agentic workers:** Use subagent-driven-development for the independent auth implementation and review; integrate registration changes in this session.

**Goal:** Players can authenticate and supply registration details without losing their tournament or receiving misleading completion messages.

**Architecture:** Shared auth UI and validated return URLs; existing profile form gains a registration mode; selected partners survive a bounded session draft. Keep backend enforcement authoritative and never automatically submit payments or stale acknowledgments.

**Tech Stack:** React, React Router, Supabase, React Query, existing Vitest and Testing Library.

- [x] Establish clean baseline from origin/main in isolated worktree.
- [x] Auth: shared login/dialog flow; consistent email branching with fallback when lookup fails; social and existing-player phone access; safe return URL helper `safeReturnTo(value)` and `getAuthReturnTo()`; preserve verification and recovery destinations; localized recoverable failures and accessibility. Files: `src/components/auth/*`, `src/pages/auth/*`, `src/contexts/AuthContext.tsx`, `src/services/api/auth.ts`, `src/lib/authReturn.ts`, auth translations/tests.
- [x] Registration: validate current onboarding status before both registration and waitlist; route to `/profile/edit?purpose=tournament&returnTo=...`; persist selected partner per tournament and signed-in account for short session lifetime; restore after detours without submitting; handle profile errors. Files: `src/pages/TournamentDetailPage.tsx`, `src/contexts/AppSessionContext.tsx`, `src/components/tournaments/ParticipantsSection.tsx`, regression tests.
- [x] Profile: in tournament mode, require missing phone with successful OTP and skill; require meaningful names for creation; allow valid unchanged values in create mode; await fresh profile reads before returning; keep tournament goal and required-field explanations visible. Files: `src/pages/EditProfilePage.tsx`, `src/components/profile/PhoneOtpVerification.tsx`, profile tests/translations.
- [x] Analytics: typed non-PII funnel helper in `src/lib/analytics.ts`, instrument auth, profile and tournament checkout milestones; test no raw identity properties.
- [x] Verify: `npm test`, `npm run build`, targeted lint of changed files; independent spec and code review; commit completed branch, keep original workspace unchanged.

## Verification and handoff

- Restored and revalidated on 2026-09-07 after the temporary worktree disappeared; saved session patches recovered the changes.
- Full suite: 80 files, 695 tests passed. Production build passed. Changed-file lint: no errors; existing context-export and test typing warnings remain. Build retains its pre-existing large-chunk warning.
- Mocked mobile doubles journey passed: signup, verified phone, confirmed skill, partner selection, explicit registration, payment-method handoff. No automatic registration after redirects.
- English/Hebrew 320px layout checks: no overflow or untranslated auth keys; Hebrew email entry stays LTR.
- Independent spec and code-quality reviews approved, including a fresh review after restoration.
- No new application dependencies, database migrations, production settings, real email/SMS sends, payments, deployment, push, or merge.
- Before production rollout, exercise real Google/Apple/Facebook callbacks, confirmation/reset emails and existing-player phone recovery in staging; verify the project's redirect allowlist preserves callback query parameters. Enabled provider flags alone do not prove a full provider roundtrip.
