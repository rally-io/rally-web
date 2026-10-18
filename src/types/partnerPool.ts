/**
 * Wire types for /rally/v1/partner-pools, the tournament partner finder (rally-api
 * feat/partner-finder; docs/specs/2026-10-13-tournament-partner-finder-spec.md).
 *
 * Kept in the API's snake_case, as rally-mobile's src/types/partnerPool.ts is. The one
 * conversion is toGlobeNode (src/lib/partners/toGlobeNode.ts), for the globe's player card.
 */
import type { GlobeClub } from '@/features/playerGlobe/types'

export type PartnerDecision = 'like' | 'pass'

/** Where a swipe came from, for analytics: the card stack, the detail drawer, or search. */
export type PartnerSwipeSource = 'deck' | 'detail' | 'search'

export interface PartnerPoolSummary {
  id: string
  kind: string
  tournament_id: string | null
  title: string
  /** open for THIS viewer; false once they are registered or waitlisted */
  is_open: boolean
}

export interface PartnerPoolState {
  pool: PartnerPoolSummary
  me: { looking: boolean }
  match_count: number
}

/** `code` stays a plain string: a newer API may send a code this build does not know, and the
    card skips it (formatReason returns null) instead of failing. */
export interface PartnerReason {
  code: string
  params: Record<string, string | number>
}

export interface PartnerCard {
  player_id: string
  name: string
  avatar_url: string | null
  avatar_clean_url: string | null
  portrait_url: string | null
  gender: string | null
  skill_level: number | null
  /** The tier CODE, e.g. "B1": a label to print, never a colour. The colour is `globe_tier`. */
  skill_tier: string | null
  band_code: string | null
  /** bronze | silver | gold, the globe's ring colour. Read it through globeTierOf. */
  globe_tier: string | null
  level_verified: boolean | null
  level_reliability: number | null
  court_side: string | null
  matches_played: number
  /** null when the player has no matches yet: the card says "New to Rally" */
  win_rate: number | null
  club: GlobeClub | null
  since: number
  looking: boolean
  ring: 1 | 2 | 3
  reasons: PartnerReason[]
  /** deck only: this player has liked the viewer */
  likes_you: boolean
}

export interface PartnerDeckPage {
  cards: PartnerCard[]
  needs_gender: boolean
}

export interface PartnerMatch {
  player: PartnerCard
  matched_at: string
  /** bare https://wa.me/<digits>; null when the player has no phone number */
  whatsapp_url: string | null
  can_register_together: boolean
  registered_together: boolean
}

export interface PartnerSwipeResult {
  matched: boolean
  match: PartnerMatch | null
}

export type PartnerSearchResult = PartnerCard & {
  my_decision: PartnerDecision | null
  matched: boolean
}

/** What a swipe told its caller. `ok: false` means the server did not record it. */
export interface SwipeOutcome {
  ok: boolean
  matched: boolean
}

/** Every `error.code` the partner endpoints raise (rally-api plan, error table). */
export const PARTNER_ERROR = {
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  POOL_NOT_FOUND: 'POOL_NOT_FOUND',
  POOL_CLOSED: 'POOL_CLOSED',
  POOL_KIND_UNSUPPORTED: 'POOL_KIND_UNSUPPORTED',
  PLAYER_UNAVAILABLE: 'PLAYER_UNAVAILABLE',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  SWIPE_SELF: 'SWIPE_SELF',
  UNDO_NOT_ALLOWED: 'UNDO_NOT_ALLOWED',
  RATE_LIMITED: 'RATE_LIMITED',
} as const
