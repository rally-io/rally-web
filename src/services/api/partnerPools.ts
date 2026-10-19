// src/services/api/partnerPools.ts
import client from './client'
import type { ApiResponse } from '@/types/api'
import type {
  PartnerDecision,
  PartnerDeckPage,
  PartnerMatch,
  PartnerPoolState,
  PartnerSearchResult,
  PartnerSwipeResult,
} from '@/types/partnerPool'

const BASE = '/rally/v1/partner-pools'

/** One deck request. The endpoint has no cursor: swiped players drop out server-side. */
export const DECK_PAGE_SIZE = 20
/** The search endpoint answers 422 outside these lengths. */
export const SEARCH_MIN_CHARS = 2
export const SEARCH_MAX_CHARS = 64
const SEARCH_LIMIT = 20

/** Like every resource module, these return the envelope and REJECT on a non-2xx (see
    client.ts). `unwrap` turns a 2xx `success: false` body into the same kind of rejection, a
    plain `{code, message}`, so the deck has a single error path. */
export function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) throw { code: response.error.code, message: response.error.message }
  return response.data
}

/** Get-or-create the tournament's pool and join it. Answers POOL_CLOSED once the viewer is
    registered or waitlisted, with no pool id: that is why lib/partners/storage.ts keeps it. */
export async function openTournamentPool(tournamentId: string): Promise<ApiResponse<PartnerPoolState>> {
  return client.post(BASE, { kind: 'tournament', tournament_id: tournamentId })
}

export async function getDeck(poolId: string, limit: number = DECK_PAGE_SIZE): Promise<ApiResponse<PartnerDeckPage>> {
  return client.get(`${BASE}/${poolId}/deck`, { params: { limit } })
}

export async function swipe(
  poolId: string,
  playerId: string,
  decision: PartnerDecision,
): Promise<ApiResponse<PartnerSwipeResult>> {
  return client.put(`${BASE}/${poolId}/swipes/${playerId}`, { decision })
}

/** Undo a pass. The API refuses a like (UNDO_NOT_ALLOWED). */
export async function undoSwipe(poolId: string, playerId: string): Promise<ApiResponse<{ undone: boolean }>> {
  return client.delete(`${BASE}/${poolId}/swipes/${playerId}`)
}

/** Still answers after the pool closes: matched partners keep their WhatsApp link. */
export async function getMatches(poolId: string): Promise<ApiResponse<PartnerMatch[]>> {
  return client.get(`${BASE}/${poolId}/matches`)
}

export async function searchPlayers(
  poolId: string,
  query: string,
  limit: number = SEARCH_LIMIT,
): Promise<ApiResponse<PartnerSearchResult[]>> {
  return client.get(`${BASE}/${poolId}/players`, { params: { query: query.trim(), limit } })
}

export async function setLooking(poolId: string, looking: boolean): Promise<ApiResponse<PartnerPoolState>> {
  return client.patch(`${BASE}/${poolId}/me`, { looking })
}
