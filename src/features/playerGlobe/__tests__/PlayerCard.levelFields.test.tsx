import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../api/playerStats'
import { PlayerCard } from '../components/PlayerCard'
import { buildNetworkIndex } from '../lib/networkIndex'
import type { GlobeGraph, GlobeNode } from '../types'

/**
 * Pins the tier-ring decision (see the comment above the ring in PlayerCard.tsx): the ring
 * is colour-only decoration, like PlayerShield's fill and PlayerIdentity's MONOGRAM_TONE,
 * so it DELIBERATELY carries no seal in any of the three verification states. The card's
 * one real seal lives in PlayerStatsTab, which is what `view` defaults to ('stats'), so
 * these tests also confirm that seal is the only one on screen when it appears.
 */

const node = (id: string, name: string, over: Partial<GlobeNode> = {}): GlobeNode => ({
  id, name, avatarUrl: null, avatarCleanUrl: null, gender: null, skillLevel: 4, skillTier: 'gold', levelVerified: false, levelReliability: null,
  club: null, matches: 12, winRate: 58, since: 2024, ...over,
})

const graph: GlobeGraph = { generatedAt: 'now', nodes: [node('p1', 'Dana Levi')], links: [] }
const index = buildNetworkIndex(graph)

function renderCard(target: GlobeNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PlayerCard node={target} index={index} onFocus={vi.fn()} onClose={vi.fn()} viewerId={null} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PlayerCard tier ring stays unsealed across all three verification states', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'fetchPublicPlayerStats').mockResolvedValue({
      matches_played: 12, matches_won: 7, matches_lost: 5, win_rate: 58,
      current_streak: 2, best_streak: 4, tournaments_played: 3, tournaments_won: 1,
    })
    vi.spyOn(api, 'fetchFullPlayerStats').mockRejectedValue({ isNotFound: true })
  })

  it('verified: the stats-tab chip carries the one seal on screen; the ring stays the tier colour, unsealed', async () => {
    renderCard(node('p1', 'Dana Levi', { levelVerified: true, levelReliability: 91 }))
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    // Exactly one seal on screen — the chip's, not a second one on the ring.
    expect(screen.getAllByTestId('verified-seal')).toHaveLength(1)
    const ring = screen.getByTestId('tier-ring')
    expect(ring.style.borderColor).not.toBe('')
    // The one seal on screen belongs to the chip, not the ring.
    expect(within(ring).queryByTestId('verified-seal')).not.toBeInTheDocument()
  })

  it('explicitly unverified: the ring carries no mark either — true or false, it stays plain', async () => {
    renderCard(node('p1', 'Dana Levi', { levelVerified: false, levelReliability: 40 }))
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(screen.queryByTestId('verified-seal')).not.toBeInTheDocument()
    const ring = screen.getByTestId('tier-ring')
    expect(ring.style.borderColor).not.toBe('')
    // `false` now renders a ghost somewhere on the card (VerificationMark never returns
    // null for it) — a global `verified-seal` absence check alone cannot tell "no seal
    // anywhere" apart from "the ghost landed on the ring", since the ghost's testid is
    // `verified-seal-ghost`, never `verified-seal`. Scope to the ring, the way the
    // `true` case above already does, to actually pin that it stays unsealed.
    expect(within(ring).queryByTestId('verified-seal')).not.toBeInTheDocument()
    expect(within(ring).queryByTestId('verified-seal-ghost')).not.toBeInTheDocument()
  })

  it('an absent pair (unknown, an older API): no seal anywhere, ring colour unchanged — the ring never carries a negative mark either', async () => {
    // levelVerified/levelReliability are required on GlobeNode (the decoded type); "absent
    // on the wire" is exercised end to end in network.levelFields.test.ts and
    // PlayerStatsTab.levelFields.test.tsx. Here the decoded false/null shape stands in for
    // it, since this suite is about the RING's reaction to that shape, not the decoder.
    const { rerender } = renderCard(node('p1', 'Dana Levi'))
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(screen.queryByTestId('verified-seal')).not.toBeInTheDocument()
    const unknownRingColor = screen.getByTestId('tier-ring').style.borderColor

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <PlayerCard
            node={node('p1', 'Dana Levi', { levelVerified: true, levelReliability: 91 })}
            index={index}
            onFocus={vi.fn()}
            onClose={vi.fn()}
            viewerId={null}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByTestId('tier-ring').style.borderColor).toBe(unknownRingColor)
  })
})
