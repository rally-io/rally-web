import { PARTNER_ERROR } from '@/types/partnerPool'

/** One UI behaviour per API error code (ported from rally-mobile src/lib/partners/errors.ts). */
export type PartnerErrorKind =
  | 'unavailable' // FEATURE_DISABLED, POOL_NOT_FOUND, a code-less 404: the page says "not available"
  | 'closed' // POOL_CLOSED: registered, waitlisted, or registration ended
  | 'player_gone' // PLAYER_UNAVAILABLE, PLAYER_NOT_FOUND: drop that card for good
  | 'undo_refused' // UNDO_NOT_ALLOWED: forget the undo, say nothing
  | 'rate_limited' // RATE_LIMITED or any 429: card back on top, "slow down"
  | 'other' // network, 5xx, anything else: card back on top, generic toast

/** Duck-typed on `.code` / `.status`, the plain object the shared axios client rejects with
    (src/services/api/client.ts), or the `{code}` unwrap throws for a `success: false` body. */
export function classifyPartnerError(error: unknown): PartnerErrorKind {
  const fields = typeof error === 'object' && error !== null ? (error as { code?: unknown; status?: unknown }) : {}
  switch (fields.code) {
    case PARTNER_ERROR.FEATURE_DISABLED:
    case PARTNER_ERROR.POOL_NOT_FOUND:
      return 'unavailable'
    case PARTNER_ERROR.POOL_CLOSED:
      return 'closed'
    case PARTNER_ERROR.PLAYER_UNAVAILABLE:
    case PARTNER_ERROR.PLAYER_NOT_FOUND:
      return 'player_gone'
    case PARTNER_ERROR.UNDO_NOT_ALLOWED:
      return 'undo_refused'
    case PARTNER_ERROR.RATE_LIMITED:
      return 'rate_limited'
    default:
      if (fields.status === 429) return 'rate_limited'
      // Web only: a 404 with no code is an API that predates the partner routes (the client
      // rejects a bare 404 as {isNotFound, status}), so the finder is simply not there.
      if (fields.status === 404 && fields.code === undefined) return 'unavailable'
      return 'other'
  }
}
