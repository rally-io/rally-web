/* Mirrors of backend engine values (rally-api `app/services/rating_math.py`). They are
   interpolated into the explainer copy and never typed into a translation file. All four are
   round-two candidates for a server-exposed thresholds endpoint (spec §15) — until then, a
   backend change to any of them must be mirrored here by hand. */

/** σ_on = 0.45 → reliability 82 %: the notch on the ring; the seal is granted at or above it.
 *  Pinned API-side by tests/rating/test_verification_thresholds.py (rally-api). Retuned from
 *  86 on 2026-09-16 — rally-api docs/superpowers/specs/2026-09-16-rating-verification-decision.md. */
export const VERIFIED_RELIABILITY_THRESHOLD = 82
/** prod replay median for players with two distinct partners (single-set matches) — decision §2.4 */
export const TYPICAL_MATCHES_TO_VERIFY = 10
export const TYPICAL_TOURNAMENTS_TO_VERIFY = 3
/** months without a rated match before reliability starts to decay */
export const INACTIVITY_GRACE_MONTHS = 3
