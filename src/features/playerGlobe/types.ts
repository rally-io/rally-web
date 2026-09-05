/* Player network data. `GlobeGraph` is the immutable payload of GET /public/players/network
   (camel-cased); the simulation works on `SimNode` / `SimLink` copies, because d3-force
   writes positions onto the node objects and replaces the link endpoints' ids with node
   objects in place. Partner / rival lists per player are derived from `links` on the client
   (see lib/networkIndex.ts), so a node stays flat. */

export type SkillTier = 'bronze' | 'silver' | 'gold'

export type LinkType = 'partner' | 'opponent'

export interface GlobeClub {
  id: string
  name: string
  city: string
}

export interface GlobeNode {
  id: string
  name: string
  avatarUrl: string | null
  skillLevel: number | null
  skillTier: SkillTier | null
  /** the club the player has played most at, if their matches carry one */
  club: GlobeClub | null
  /** completed matches */
  matches: number
  /** 0–100 */
  winRate: number
  /** year the player joined */
  since: number
}

export interface GlobeLink {
  source: string
  target: string
  type: LinkType
  /** completed matches together / against — spawn weight and head heat of the pulses */
  games: number
  lastPlayedAt: string | null
}

export interface GlobeGraph {
  /** Optional on purpose: the query drops it (see hooks/usePlayerNetwork.ts). It is a fresh
      timestamp per response, so keeping it would make every refetch a new object and rebuild
      the whole WebGL scene. */
  generatedAt?: string
  nodes: GlobeNode[]
  links: GlobeLink[]
}

/** A node as the force engine sees it. `connections` (partner count) drives node size and
    the collide radius; positions and velocities are written by the simulation. */
export interface SimNode extends GlobeNode {
  connections: number
  index?: number
  x?: number
  y?: number
  z?: number
  vx?: number
  vy?: number
  vz?: number
}

/** A link after forceLink has resolved its endpoints to node objects. */
export interface SimLink {
  source: SimNode
  target: SimNode
  games: number
  type: LinkType
  index?: number
}
