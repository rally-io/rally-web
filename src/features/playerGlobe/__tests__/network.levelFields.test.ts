import { describe, expect, it } from 'vitest'
import { networkPayloadSchema, toGlobeGraph } from '../api/network'

/**
 * `level_verified` / `level_reliability` are the same THREE-state pair as the league
 * decoder (`leagueRanking/types.ts`, spec §4): true = verified, false = the server
 * checked and said no, null = the server did not say. The API deploys before the
 * clients, so an absent pair (an older backend) must decode as UNKNOWN — `null` —
 * never as a false "not verified" claim, and garbage must degrade the same way
 * rather than throwing and blanking the whole globe.
 *
 * The absent case here is built by `delete`ing the keys off a plain object, not by setting
 * them to `undefined` — a schema-decoded payload never sees `undefined` on the wire; it
 * either sees the key or it doesn't, and only `delete` reproduces that.
 */

const baseNode = {
  id: 'a',
  name: 'Ada Lovelace',
  avatar_url: null,
  skill_level: 4,
  skill_tier: 'gold' as const,
  club: null,
  matches: 3,
  win_rate: 67,
  since: 2025,
}

function payloadWithNode(node: Record<string, unknown>) {
  return { generated_at: '2026-09-03T18:00:00Z', nodes: [node], links: [] }
}

describe('level fields on nodeSchema', () => {
  it('decodes the pair when the API sends it', () => {
    const parsed = networkPayloadSchema.parse(
      payloadWithNode({ ...baseNode, level_verified: true, level_reliability: 91 }),
    )
    expect(parsed.nodes[0].level_verified).toBe(true)
    expect(parsed.nodes[0].level_reliability).toBe(91)
  })

  it('an explicit false decodes as unverified — a plain boolean, nothing more', () => {
    const parsed = networkPayloadSchema.parse(
      payloadWithNode({ ...baseNode, level_verified: false, level_reliability: null }),
    )
    expect(parsed.nodes[0].level_verified).toBe(false)
    expect(parsed.nodes[0].level_reliability).toBeNull()
  })

  it('an older API sending neither field decodes as unknown (null), not throwing', () => {
    const node: Record<string, unknown> = { ...baseNode, level_verified: true, level_reliability: 91 }
    delete node.level_verified
    delete node.level_reliability
    expect('level_verified' in node).toBe(false)
    expect('level_reliability' in node).toBe(false)

    const parsed = networkPayloadSchema.parse(payloadWithNode(node))
    expect(parsed.nodes[0].level_verified).toBeNull()
    expect(parsed.nodes[0].level_reliability).toBeNull()
  })

  it('garbage in the field degrades rather than throwing', () => {
    const parsed = networkPayloadSchema.parse(
      payloadWithNode({ ...baseNode, level_verified: 'yes', level_reliability: 'x' }),
    )
    expect(parsed.nodes[0].level_verified).toBeNull()
    expect(parsed.nodes[0].level_reliability).toBeNull()
  })

  it('toGlobeGraph carries the pair through the mapping, camel-cased', () => {
    const graph = toGlobeGraph(
      networkPayloadSchema.parse(payloadWithNode({ ...baseNode, level_verified: true, level_reliability: 91 })),
    )
    expect(graph.nodes[0].levelVerified).toBe(true)
    expect(graph.nodes[0].levelReliability).toBe(91)
  })
})
