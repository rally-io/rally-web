import { describe, expect, it } from 'vitest'
import { makeCard } from './testCards'
import { globeTierOf, toGlobeNode } from './toGlobeNode'

describe('toGlobeNode', () => {
  it('maps every field the globe card reads', () => {
    const node = toGlobeNode(
      makeCard({ player_id: 'p-9', name: 'Dana', skill_level: 3.75, matches_played: 12, win_rate: 50, since: 2023 }),
    )
    expect(node).toEqual({
      id: 'p-9',
      name: 'Dana',
      avatarUrl: null,
      avatarCleanUrl: null,
      portraitUrl: null,
      gender: 'female',
      skillLevel: 3.75,
      skillTier: 'silver',
      levelVerified: true,
      levelReliability: 80,
      club: { id: 'c-1', name: 'Padel TLV', city: 'Tel Aviv' },
      matches: 12,
      winRate: 50,
      since: 2023,
    })
  })

  it('takes the ring colour from globe_tier, never from skill_tier, which is a tier CODE', () => {
    expect(toGlobeNode(makeCard({ skill_tier: 'B1', globe_tier: 'gold' })).skillTier).toBe('gold')
    // A code that happens to spell a colour still is not one.
    expect(toGlobeNode(makeCard({ skill_tier: 'gold', globe_tier: null })).skillTier).toBeNull()
  })

  it('an unknown globe tier is no tier', () => {
    expect(globeTierOf({ globe_tier: 'platinum' })).toBeNull()
  })

  it('a player with no matches gets a 0 win rate on the globe node', () => {
    expect(toGlobeNode(makeCard({ matches_played: 0, win_rate: null })).winRate).toBe(0)
  })
})
