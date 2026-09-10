# Continuous tournament authentication

The user approved fixing the audited authentication and registration issues, using a separate branch from main. Preserve the existing Supabase account system, password support, backend profile requirements, and tournament acknowledgment rules.

## Experience

Use the same authentication component in the login page and tournament dialog. Offer social providers and one email entry. Email lookup is a hint, never a dependency that prevents authentication. Let players explicitly switch between existing-account and account-creation modes. Offer existing-player phone recovery using the existing API; it must clearly say it cannot create new accounts. Keep email verification and password reset, carry a validated local destination through their URLs and email callbacks, and show actionable failures. Do not change live provider settings or email templates.

Keep tournament intent visible and preserve selected partners through auth/profile detours. Resume the next safe step, never automatically place a registration or payment after a redirect. Required acknowledgments must be read and accepted on the current page. Registration checks current onboarding requirements before submitting and collects required phone and skill data before allowing return. Profile editing remains permissive outside registration. Names must be meaningful when creating a profile; do not silently create Player Player.

## Boundaries

Reuse the profile form for tournament completion with explicit purpose, required fields, and a continue-to-tournament CTA. Wait for refreshed profile state before returning. Preserve normal profile editing behavior. Handle incomplete and failed profile loading explicitly. Support English and Hebrew, keyboard access, labeled OTP fields, mobile scrolling, and truthful loading/error messages.

Use current analytics infrastructure for non-PII funnel events. Do not send names, emails, phone numbers, passwords, or OTPs in event properties. Add tests for routing, mode selection, lookup failures, recovery failures, profile completeness, OTP outcomes, and tournament continuity. Run full tests, typecheck/build, and review the final diff.

## Alternatives considered

Changing to passwordless-only login requires production email-template and shared-mobile decisions. A cosmetic-only change leaves the broken return paths and profile loops. The selected approach fixes the existing system first and keeps deployment dependencies explicit.
