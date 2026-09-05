import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import * as api from '../api/playerStats'
import { useFollow } from '../hooks/useFollow'

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useFollow', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('reads the relationship and toggles it optimistically', async () => {
    vi.spyOn(api, 'fetchSocialProfile').mockResolvedValue({ isFollowing: false })
    // Held open so the optimistic `true` window is observable before the mutation
    // settles — resolving immediately lets onSettled's invalidate/refetch race ahead
    // of the notifyManager-scheduled render and the assertion never sees it.
    let resolveFollow!: () => void
    const follow = vi.spyOn(api, 'followPlayer').mockImplementation(
      () => new Promise<void>((resolve) => { resolveFollow = resolve }),
    )
    const { result } = renderHook(() => useFollow('p1', 'me'), { wrapper: wrapper() })
    // `isFollowing` defaults to `false` before the query loads (`profile.data?.isFollowing ?? false`),
    // so waiting on it directly is vacuous — it never actually waits for the fetch, and `toggle()`'s
    // `!profile.isSuccess` guard then silently no-ops. Wait on `isLoaded` instead.
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.isFollowing).toBe(false)
    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.isFollowing).toBe(true))
    expect(follow).toHaveBeenCalledWith('p1')
    await act(async () => {
      resolveFollow()
    })
  })

  it('rolls back when the request fails', async () => {
    // Only the initial load resolves to `true`; onSettled's invalidateQueries triggers a
    // background refetch after the mutation fails, and that refetch must never resolve —
    // otherwise it would independently deliver the same "true" the rollback restores, and
    // this test would pass even with the rollback deleted.
    vi.spyOn(api, 'fetchSocialProfile')
      .mockResolvedValueOnce({ isFollowing: true })
      .mockImplementation(() => new Promise(() => {}))
    vi.spyOn(api, 'unfollowPlayer').mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useFollow('p1', 'me'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isFollowing).toBe(true))
    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.isFollowing).toBe(true)
  })

  it('does nothing while disabled (no viewer)', () => {
    const spy = vi.spyOn(api, 'fetchSocialProfile')
    renderHook(() => useFollow('p1', null), { wrapper: wrapper() })
    expect(spy).not.toHaveBeenCalled()
  })

  it("keeps a settling mutation's rollback on the player it started with, not whichever player is selected when it settles", async () => {
    // Regression for the PlayerCardFollow crossover bug: without `mutationKey`, an
    // in-flight follow for p1 has its onError/onSettled rebound (via useMutation's
    // per-render setOptions) to whichever player the hook is now called with by the
    // time it settles, and the rollback lands on the new player's cache entry instead.
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const clientWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    vi.spyOn(api, 'fetchSocialProfile')
      .mockResolvedValueOnce({ isFollowing: false }) // p1's initial load
      .mockResolvedValueOnce({ isFollowing: true }) // p2's initial load
      // Any further fetch (onSettled's invalidate) must never resolve — otherwise a
      // "successful" background refetch could paper over a misdirected rollback and
      // this test would pass even with mutationKey removed.
      .mockImplementation(() => new Promise(() => {}))
    let rejectFollow!: (err: Error) => void
    vi.spyOn(api, 'followPlayer').mockImplementation(
      () => new Promise<void>((_resolve, reject) => { rejectFollow = reject }),
    )

    const { result, rerender } = renderHook(
      ({ playerId }: { playerId: string }) => useFollow(playerId, 'me'),
      { wrapper: clientWrapper, initialProps: { playerId: 'p1' } },
    )
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.isFollowing).toBe(false)
    act(() => result.current.toggle()) // optimistic follow('p1') → true, in flight (never resolves)
    await waitFor(() => expect(result.current.isFollowing).toBe(true))

    // The card's selection moves to a different player before p1's follow request settles —
    // same hook instance, new playerId, no unmount (what `key={node.id}` prevents in prod;
    // this test targets the hook's own defense, independent of that).
    rerender({ playerId: 'p2' })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.isFollowing).toBe(true) // p2's own, unrelated relationship

    rejectFollow(new Error('boom'))

    await waitFor(() => expect(qc.getQueryData(['social-profile', 'me', 'p1'])).toEqual({ isFollowing: false }))
    expect(qc.getQueryData(['social-profile', 'me', 'p2'])).toEqual({ isFollowing: true })
  })

  it('reads the relationship again when the viewer changes', async () => {
    const fetchSpy = vi.spyOn(api, 'fetchSocialProfile')
      .mockResolvedValueOnce({ isFollowing: true })
      .mockResolvedValueOnce({ isFollowing: false })
    const { result, rerender } = renderHook(
      ({ viewerId }: { viewerId: string }) => useFollow('p1', viewerId),
      { wrapper: wrapper(), initialProps: { viewerId: 'v1' } },
    )
    await waitFor(() => expect(result.current.isFollowing).toBe(true))
    rerender({ viewerId: 'v2' })
    await waitFor(() => expect(result.current.isFollowing).toBe(false))
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
