import { describe, expect, it } from 'vitest'
import { networkPayloadSchema, toGlobeGraph } from '../api/network'

const payload = {
  generated_at: '2026-09-03T18:00:00Z',
  nodes: [
    {
      id: 'a', name: 'Ada Lovelace', avatar_url: null, skill_level: 4, skill_tier: 'gold',
      club: { id: 'c1', name: 'Rally Tel Aviv', city: 'Tel Aviv' }, matches: 3, win_rate: 67, since: 2025,
    },
    {
      id: 'b', name: 'Bob Ross', avatar_url: 'https://x/b.jpg', skill_level: null, skill_tier: null,
      club: null, matches: 0, win_rate: 0, since: 2024,
    },
  ],
  links: [{ source: 'a', target: 'b', type: 'partner', games: 3, last_played_at: null }],
}

describe('networkPayloadSchema', () => {
  it('accepts the documented payload and camel-cases it', () => {
    const graph = toGlobeGraph(networkPayloadSchema.parse(payload))
    expect(graph.generatedAt).toBe('2026-09-03T18:00:00Z')
    expect(graph.nodes[0]).toEqual({
      id: 'a', name: 'Ada Lovelace', avatarUrl: null, skillLevel: 4, skillTier: 'gold',
      club: { id: 'c1', name: 'Rally Tel Aviv', city: 'Tel Aviv' }, matches: 3, winRate: 67, since: 2025,
    })
    expect(graph.links[0]).toEqual({ source: 'a', target: 'b', type: 'partner', games: 3, lastPlayedAt: null })
  })

  it('rejects a node without an id and an unknown link type', () => {
    expect(() => networkPayloadSchema.parse({ ...payload, nodes: [{ ...payload.nodes[0], id: '' }] })).toThrow()
    expect(() => networkPayloadSchema.parse({ ...payload, links: [{ ...payload.links[0], type: 'friend' }] })).toThrow()
  })
})
