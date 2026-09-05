import { useQuery } from '@tanstack/react-query'
import {
  fetchFullPlayerStats, fetchPublicPlayerStats, isNotFound, type FullPlayerStats, type PublicPlayerStats,
} from '../api/playerStats'

export function usePublicPlayerStats(playerId: string | null) {
  return useQuery<PublicPlayerStats>({
    queryKey: ['player-public-stats', playerId],
    queryFn: () => fetchPublicPlayerStats(playerId as string),
    enabled: Boolean(playerId),
    staleTime: 5 * 60 * 1000,
  })
}

export interface PlayerFullStatsState {
  stats: FullPlayerStats | null
  /** the endpoint answered 404: signed out of the player's network, or a private profile */
  notVisible: boolean
  isLoading: boolean
}

/** The mobile app's stats — viewer-scoped (a consumer endpoint, so the answer depends on
    who's asking). A 404 is a normal outcome here (not in network), so it resolves to
    `null` instead of an error; anything else is a real failure.
    `viewerId` (not just "is someone signed in") keys and gates the query: an in-tab
    account switch must not serve viewer 2 a cache entry fetched for viewer 1, and the
    caller passes `null` for a signed-in viewer whose own player profile isn't ready yet
    (that request would 403). */
export function usePlayerFullStats(playerId: string | null, viewerId: string | null): PlayerFullStatsState {
  const enabled = Boolean(viewerId) && Boolean(playerId)
  const query = useQuery<FullPlayerStats | null>({
    queryKey: ['player-full-stats', viewerId, playerId],
    queryFn: async () => {
      try {
        return await fetchFullPlayerStats(playerId as string)
      } catch (err) {
        if (isNotFound(err)) return null
        throw err
      }
    },
    enabled,
    staleTime: 60 * 1000,
    retry: false,
  })
  return {
    stats: query.data ?? null,
    notVisible: query.isSuccess && query.data === null,
    isLoading: query.isPending && enabled,
  }
}
