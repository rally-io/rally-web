import { z } from 'zod'
import client from '@/services/api/client'
import type { ApiResponse } from '@/types/api'
import type { GlobeGraph } from '../types'

const clubSchema = z.object({ id: z.string().min(1), name: z.string(), city: z.string() })

const nodeSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  avatar_url: z.string().nullable(),
  skill_level: z.number().nullable(),
  skill_tier: z.enum(['bronze', 'silver', 'gold']).nullable(),
  club: clubSchema.nullable(),
  matches: z.number().int().nonnegative(),
  win_rate: z.number().int().min(0).max(100),
  since: z.number().int(),
})

const linkSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.enum(['partner', 'opponent']),
  games: z.number().int().nonnegative(),
  last_played_at: z.string().nullable(),
})

/** The wire shape of GET /public/players/network (snake_case, as rally-api sends it). */
export const networkPayloadSchema = z.object({
  generated_at: z.string(),
  nodes: z.array(nodeSchema),
  links: z.array(linkSchema),
})

export type NetworkPayload = z.infer<typeof networkPayloadSchema>

export function toGlobeGraph(payload: NetworkPayload): GlobeGraph {
  return {
    generatedAt: payload.generated_at,
    nodes: payload.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      avatarUrl: n.avatar_url,
      skillLevel: n.skill_level,
      skillTier: n.skill_tier,
      club: n.club,
      matches: n.matches,
      winRate: n.win_rate,
      since: n.since,
    })),
    links: payload.links.map((l) => ({
      source: l.source,
      target: l.target,
      type: l.type,
      games: l.games,
      lastPlayedAt: l.last_played_at,
    })),
  }
}

/** Public, so the request skips the session lookup; rejects (through the client's
    interceptor) on a non-2xx, and throws on a 2xx that reports failure or fails validation. */
export async function fetchPlayerNetwork(): Promise<GlobeGraph> {
  const res = (await client.get('/public/players/network', {
    headers: { 'X-Skip-Auth': '1' },
  })) as ApiResponse<unknown>
  if (!res.success) throw new Error(res.error.message)
  return toGlobeGraph(networkPayloadSchema.parse(res.data))
}
