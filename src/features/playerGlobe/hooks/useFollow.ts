import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSocialProfile, followPlayer, unfollowPlayer } from '../api/playerStats'

export interface FollowState {
  isFollowing: boolean
  isLoaded: boolean
  isPending: boolean
  error: Error | null
  toggle: () => void
}

/** The viewer's follow relationship with one player, toggled optimistically.
    Both the query key and the mutation key are scoped by `viewerId` *and* `playerId`:
    - `viewerId` scoping stops an in-tab account switch from serving viewer 2 viewer 1's
      follow state (sign-out is SPA-local; the cache otherwise outlives it).
    - `mutationKey` matters even when `viewerId` is stable: `useMutation` calls
      `setOptions()` on every render, and when a parent reuses the same hook instance
      across a selection change (no remount), a still-pending mutation for player A would
      have its `onError`/`onSettled` rebound to player B's closures by the time it
      settles — A's rollback would land on B's cache entry. A `mutationKey` that changes
      with `playerId` makes the observer `reset()` instead of rebinding, so the in-flight
      mutation keeps the options (and cache key) it started with. `PlayerCardFollow`'s
      `key={node.id}` (forcing a full remount) covers the same case for that call site;
      this is the hook's own defense for any caller that doesn't remount. */
export function useFollow(playerId: string | null, viewerId: string | null): FollowState {
  const qc = useQueryClient()
  const key = ['social-profile', viewerId, playerId] as const
  const enabled = Boolean(viewerId) && Boolean(playerId)
  const profile = useQuery({
    queryKey: key,
    queryFn: () => fetchSocialProfile(playerId as string),
    enabled,
    staleTime: 60 * 1000,
  })
  const mutation = useMutation({
    mutationKey: ['social-follow', viewerId, playerId] as const,
    mutationFn: (next: boolean) => (next ? followPlayer(playerId as string) : unfollowPlayer(playerId as string)),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<{ isFollowing: boolean }>(key)
      qc.setQueryData(key, { isFollowing: next })
      return { previous }
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key })
    },
  })
  const isFollowing = profile.data?.isFollowing ?? false
  return {
    isFollowing,
    isLoaded: profile.isSuccess,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error(String(mutation.error)) : null,
    toggle: () => {
      if (!profile.isSuccess || mutation.isPending) return
      mutation.mutate(!isFollowing)
    },
  }
}
