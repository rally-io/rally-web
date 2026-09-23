import { describe, expect, it } from 'vitest'
import { networkPayloadSchema } from '@/features/playerGlobe/api/network'
import { MyLeagueCardSchema, StandingsRowSchema } from '../types'

/**
 * The three-state contract (spec §4). Until the "not verified" label existed,
 * null and false rendered identically and nothing depended on telling them
 * apart. Now null means "the server did not say" and must never be stamped
 * "not verified".
 */
describe('level_verified survives as three states', () => {
  const base = {
    rank: 1, player_id: 'p1', first_name: 'A', last_name: 'B', points: 0,
    skill_tier: 'gold', band_code: 'A', is_provisional: false,
    avatar_url: null, avatar_clean_url: null, counted_results: 0, rank_change: null,
    level_reliability: 40,
  }

  it('keeps true', () => {
    expect(StandingsRowSchema.parse({ ...base, level_verified: true }).level_verified).toBe(true)
  })

  it('keeps false', () => {
    expect(StandingsRowSchema.parse({ ...base, level_verified: false }).level_verified).toBe(false)
  })

  it('keeps null as null, NOT false', () => {
    expect(StandingsRowSchema.parse({ ...base, level_verified: null }).level_verified).toBeNull()
  })

  it('an absent field is null, not false', () => {
    expect(StandingsRowSchema.parse(base).level_verified).toBeNull()
  })

  it('a malformed value degrades to null, not false', () => {
    expect(StandingsRowSchema.parse({ ...base, level_verified: 'yes' }).level_verified).toBeNull()
  })
})

describe('level_verified survives as three states on the globe nodeSchema', () => {
  const baseNode = {
    id: 'a', name: 'Ada Lovelace', avatar_url: null, skill_level: 4, skill_tier: 'gold',
    club: null, matches: 3, win_rate: 67, since: 2025, level_reliability: 40,
  }

  function payloadWithNode(node: Record<string, unknown>) {
    return { generated_at: '2026-09-03T18:00:00Z', nodes: [node], links: [] }
  }

  it('keeps true', () => {
    const parsed = networkPayloadSchema.parse(payloadWithNode({ ...baseNode, level_verified: true }))
    expect(parsed.nodes[0].level_verified).toBe(true)
  })

  it('keeps false', () => {
    const parsed = networkPayloadSchema.parse(payloadWithNode({ ...baseNode, level_verified: false }))
    expect(parsed.nodes[0].level_verified).toBe(false)
  })

  it('keeps null as null, NOT false', () => {
    const parsed = networkPayloadSchema.parse(payloadWithNode({ ...baseNode, level_verified: null }))
    expect(parsed.nodes[0].level_verified).toBeNull()
  })

  it('an absent field is null, not false', () => {
    const parsed = networkPayloadSchema.parse(payloadWithNode(baseNode))
    expect(parsed.nodes[0].level_verified).toBeNull()
  })

  it('a malformed value degrades to null, not false', () => {
    const parsed = networkPayloadSchema.parse(payloadWithNode({ ...baseNode, level_verified: 'yes' }))
    expect(parsed.nodes[0].level_verified).toBeNull()
  })
})

/**
 * The THIRD decoder of this pair: the shared `PlayerContextFields` block in types.ts,
 * spread into both `PublicPlayerSeasonSchema` and `MyLeagueCardSchema` (exercised here
 * via `MyLeagueCardSchema`, the smaller of the two fixtures). `types.levelFields.test.ts`
 * only pinned this decoder for true/absent — two of five states — leaving false, explicit
 * null and malformed untested even though they are exactly the states the other two
 * decoders above were hardened against. Brought to the same five-state standard here.
 */
describe('level_verified survives as three states via the shared PlayerContextFields block (MyLeagueCardSchema)', () => {
  const season = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Season 1',
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2026-12-31T00:00:00Z',
    counting_results: 5,
    is_active: true,
  }

  const base = {
    season, points: 0, global_rank: null, rank_change: null, results: [],
    level_reliability: 40,
  }

  it('keeps true', () => {
    expect(MyLeagueCardSchema.parse({ ...base, level_verified: true }).level_verified).toBe(true)
  })

  it('keeps false', () => {
    expect(MyLeagueCardSchema.parse({ ...base, level_verified: false }).level_verified).toBe(false)
  })

  it('keeps null as null, NOT false', () => {
    expect(MyLeagueCardSchema.parse({ ...base, level_verified: null }).level_verified).toBeNull()
  })

  it('an absent field is null, not false', () => {
    expect(MyLeagueCardSchema.parse(base).level_verified).toBeNull()
  })

  it('a malformed value degrades to null, not false', () => {
    expect(MyLeagueCardSchema.parse({ ...base, level_verified: 'yes' }).level_verified).toBeNull()
  })
})
