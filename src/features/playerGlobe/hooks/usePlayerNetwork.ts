import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPlayerNetwork } from '../api/network'
import { buildNetworkIndex, type NetworkIndex } from '../lib/networkIndex'
import type { GlobeGraph } from '../types'

export interface PlayerNetworkState {
  graph: GlobeGraph | null
  index: NetworkIndex | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

/* `generatedAt` is a fresh timestamp on every response, so a graph carrying it can never be
   referentially stable — and an unstable graph rebuilds the entire WebGL scene on each
   background refetch. Dropping it here lets TanStack's structural sharing (which is applied
   to the select output too) hand back the previous object whenever the players and links
   came back identical. Module-level so the observer's select memo also hits. */
const withoutTimestamp = ({ nodes, links }: GlobeGraph): GlobeGraph => ({ nodes, links })

/** The whole network, fetched once and kept for five minutes; the index is rebuilt only
    when the graph object changes. */
export function usePlayerNetwork(): PlayerNetworkState {
  const query = useQuery({
    queryKey: ['player-network'],
    queryFn: fetchPlayerNetwork,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    select: withoutTimestamp,
  })
  const graph = query.data ?? null
  const index = useMemo(() => (graph ? buildNetworkIndex(graph) : null), [graph])
  return {
    graph,
    index,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: () => {
      void query.refetch()
    },
  }
}
