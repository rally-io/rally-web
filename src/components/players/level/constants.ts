/* Mirrors of backend engine values (rally-api `app/services/rating_math.py`). They are
   interpolated into the explainer copy and never typed into a translation file. All four are
   round-two candidates for a server-exposed thresholds endpoint (spec §15) — until then, a
   backend change to any of them must be mirrored here by hand. */

/** σ_on = 0.40 → reliability 86 %: the notch on the ring; the seal is granted at or above it */
export const VERIFIED_RELIABILITY_THRESHOLD = 86
/** engine simulation median — re-check against the replay report before trusting it in copy */
export const TYPICAL_MATCHES_TO_VERIFY = 15
export const TYPICAL_TOURNAMENTS_TO_VERIFY = 3
/** months without a rated match before reliability starts to decay */
export const INACTIVITY_GRACE_MONTHS = 3
