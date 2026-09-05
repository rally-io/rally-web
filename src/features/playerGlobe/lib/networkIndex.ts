import type { GlobeGraph, GlobeNode } from '../types'

export interface PeerRef {
  id: string
  games: number
}

/** Everything the page derives from the flat payload: lookups by id and each player's
    partner / rival lists (most games first). Built once per graph. */
export interface NetworkIndex {
  nodeById: Map<string, GlobeNode>
  partnersOf: Map<string, PeerRef[]>
  rivalsOf: Map<string, PeerRef[]>
  partnerCount: (id: string) => number
}

export function buildNetworkIndex(graph: GlobeGraph): NetworkIndex {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const partnersOf = new Map<string, PeerRef[]>()
  const rivalsOf = new Map<string, PeerRef[]>()
  graph.nodes.forEach((n) => {
    partnersOf.set(n.id, [])
    rivalsOf.set(n.id, [])
  })
  for (const link of graph.links) {
    const bucket = link.type === 'partner' ? partnersOf : rivalsOf
    bucket.get(link.source)?.push({ id: link.target, games: link.games })
    bucket.get(link.target)?.push({ id: link.source, games: link.games })
  }
  const byGames = (a: PeerRef, b: PeerRef) => b.games - a.games
  partnersOf.forEach((list) => list.sort(byGames))
  rivalsOf.forEach((list) => list.sort(byGames))
  return {
    nodeById,
    partnersOf,
    rivalsOf,
    partnerCount: (id) => partnersOf.get(id)?.length ?? 0,
  }
}
