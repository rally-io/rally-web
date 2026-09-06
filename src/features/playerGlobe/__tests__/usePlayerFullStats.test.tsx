import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as api from '../api/playerStats'
import { usePlayerFullStats } from '../hooks/usePlayerStats'

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('usePlayerFullStats', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('maps the enveloped 404 (no isNotFound key) to notVisible, not an error', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // The real client shape for this endpoint's 404 (an enveloped `{success:false, error}`
    // body) — the interceptor's envelope branch catches it before the bare-404 branch, so
    // there is no `isNotFound` key, only `status` and `message`.
    vi.spyOn(api, 'fetchFullPlayerStats').mockRejectedValue({ status: 404, message: 'Player not found' })
    const { result } = renderHook(() => usePlayerFullStats('p1', 'viewer-1'), { wrapper: wrapper(qc) })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.notVisible).toBe(true)
    expect(result.current.stats).toBeNull()
    expect(qc.getQueryState(['player-full-stats', 'viewer-1', 'p1'])?.status).not.toBe('error')
  })

  it('refetches when the viewer changes for the same player', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const fetchSpy = vi.spyOn(api, 'fetchFullPlayerStats').mockResolvedValue({
      matches_played: 10,
      matches_won: 6,
      matches_lost: 4,
      win_rate: 60,
      current_streak: 2,
      best_streak: 5,
      tournaments_played: 1,
      tournaments_won: 0,
      skill_history: [],
      top_partners: [],
      top_clubs: [],
    })
    const { result, rerender } = renderHook(
      ({ viewerId }: { viewerId: string }) => usePlayerFullStats('p1', viewerId),
      { wrapper: wrapper(qc), initialProps: { viewerId: 'v1' } },
    )
    await waitFor(() => expect(result.current.stats).not.toBeNull())
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    rerender({ viewerId: 'v2' })
    // A cache miss on the new (viewer-scoped) key: v1's cached result must not be served
    // synchronously as v2's answer.
    expect(result.current.stats).toBeNull()
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
  })
})
