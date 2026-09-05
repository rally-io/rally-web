import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as networkApi from '../api/network'
import { usePlayerNetwork } from '../hooks/usePlayerNetwork'
import type { GlobeGraph } from '../types'

/* A fresh, deep-equal payload each call — nothing is shared between the two responses, so a
   stable reference can only come from structural sharing, not from identity. */
const payload = (generatedAt: string, matches = 12): GlobeGraph => ({
  generatedAt,
  nodes: [
    { id: 'p1', name: 'Omer Levi', avatarUrl: null, skillLevel: 4, skillTier: 'silver', club: null, matches, winRate: 50, since: 2024 },
    { id: 'p2', name: 'Dani Shoval', avatarUrl: null, skillLevel: 3, skillTier: 'bronze', club: null, matches: 7, winRate: 40, since: 2023 },
  ],
  links: [{ source: 'p1', target: 'p2', type: 'partner', games: 3, lastPlayedAt: null }],
})

function renderNetwork() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { qc, ...renderHook(() => usePlayerNetwork(), { wrapper }) }
}

/** Refetch and let the observer's batched React notification land. */
async function refetch(qc: QueryClient): Promise<void> {
  await act(async () => {
    await qc.refetchQueries({ queryKey: ['player-network'] })
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('usePlayerNetwork', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the same graph reference when a refetch returns the same players', async () => {
    const spy = vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(payload('2026-09-03T10:00:00Z'))
    const { qc, result } = renderNetwork()
    await waitFor(() => expect(result.current.graph).not.toBeNull())
    const graph = result.current.graph
    const index = result.current.index

    // identical data, a new generated_at — what a background refetch actually looks like
    spy.mockResolvedValue(payload('2026-09-03T10:05:00Z'))
    await refetch(qc)

    expect(spy).toHaveBeenCalledTimes(2)
    expect(Object.is(result.current.graph, graph)).toBe(true)
    expect(Object.is(result.current.index, index)).toBe(true)
  })

  it('hands back a new graph when the players actually changed', async () => {
    const spy = vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(payload('2026-09-03T10:00:00Z'))
    const { qc, result } = renderNetwork()
    await waitFor(() => expect(result.current.graph).not.toBeNull())
    const graph = result.current.graph

    spy.mockResolvedValue(payload('2026-09-03T10:05:00Z', 13))
    await refetch(qc)

    expect(Object.is(result.current.graph, graph)).toBe(false)
    expect(result.current.graph?.nodes[0].matches).toBe(13)
  })
})
