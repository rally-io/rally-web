import type { PartnerCard, PartnerMatch, PartnerPoolState, PartnerSearchResult } from '@/types/partnerPool'

/* Test fixtures for the partner finder, shared by the lib, hook, component and page tests.
   Plain data with no vitest import, so it type-checks with the app (ported from rally-mobile
   src/test-utils/partnerCards.ts). */

/** A fully populated deck card. Override only what a test is about. */
export function makeCard(overrides: Partial<PartnerCard> = {}): PartnerCard {
  return {
    player_id: 'p-1',
    name: 'Noa Levi',
    avatar_url: null,
    avatar_clean_url: null,
    portrait_url: null,
    gender: 'female',
    skill_level: 3.5,
    skill_tier: 'B1',
    band_code: 'B',
    globe_tier: 'silver',
    level_verified: true,
    level_reliability: 80,
    court_side: 'right_side',
    matches_played: 42,
    win_rate: 57,
    club: { id: 'c-1', name: 'Padel TLV', city: 'Tel Aviv' },
    since: 2024,
    looking: false,
    ring: 1,
    reasons: [],
    likes_you: false,
    ...overrides,
  }
}

export function makeMatch(overrides: Partial<PartnerMatch> = {}): PartnerMatch {
  return {
    player: makeCard(),
    matched_at: '2026-10-13T10:00:00Z',
    whatsapp_url: 'https://wa.me/972501234567',
    can_register_together: true,
    registered_together: false,
    ...overrides,
  }
}

export function makeSearchResult(overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult {
  return { ...makeCard(), my_decision: null, matched: false, ...overrides }
}

export const POOL_STATE: PartnerPoolState = {
  pool: { id: 'pool-1', kind: 'tournament', tournament_id: 't-1', title: 'Summer Cup', is_open: true },
  me: { looking: true },
  match_count: 2,
}

/** The client's success envelope around `data`, as every partnerPools call resolves. */
export function ok<T>(data: T) {
  return { success: true as const, data, meta: null, error: null }
}

/** The plain object the shared axios client rejects with for an enveloped API error. */
export function apiError(status: number, code?: string) {
  return { status, code, message: code ?? 'error' }
}
