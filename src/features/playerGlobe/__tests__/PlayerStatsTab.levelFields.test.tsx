import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../api/playerStats'
import { networkPayloadSchema, toGlobeGraph } from '../api/network'
import { PlayerStatsTab } from '../components/PlayerStatsTab'
import type { GlobeNode } from '../types'

/**
 * The level chip is the strongest case for the seal in this whole feature: it prints the
 * actual level number, and the seal is a claim about exactly that number.
 *
 * Three states (spec: the seal is additive only, never a negative mark):
 *   - `levelVerified: true`  -> seal
 *   - `levelVerified: false` -> no seal (explicit "not verified" from the API)
 *   - pair absent on the wire -> no seal (an older API; decodes to `null` via
 *     `networkPayloadSchema`'s `.catch()` — proven end-to-end below, not just typed).
 * None of the three touches the level NUMBER itself, which is asserted unchanged throughout.
 */

const node: GlobeNode = {
  id: 'p1', name: 'Dana Levi', avatarUrl: null, avatarCleanUrl: null, gender: null, skillLevel: 4, skillTier: 'silver',
  levelVerified: false, levelReliability: null,
  club: null, matches: 12, winRate: 58, since: 2024,
}

const career = {
  matches_played: 12, matches_won: 7, matches_lost: 5, win_rate: 58,
  current_streak: 2, best_streak: 4, tournaments_played: 3, tournaments_won: 1,
}

function renderTab(target: GlobeNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PlayerStatsTab node={target} viewerId={null} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PlayerStatsTab level chip verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'fetchPublicPlayerStats').mockResolvedValue(career)
    vi.spyOn(api, 'fetchFullPlayerStats').mockRejectedValue({ isNotFound: true })
  })

  it('shows the seal for a verified level, alongside the unchanged number', async () => {
    renderTab({ ...node, levelVerified: true, levelReliability: 91 })
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(screen.getByText(/level 4\.0/i)).toBeInTheDocument()
    expect(screen.getByTestId('verified-seal')).toBeInTheDocument()
  })

  it('shows no seal for an explicitly unverified level — the number is unchanged, no negative mark', async () => {
    renderTab({ ...node, levelVerified: false, levelReliability: 40 })
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(screen.getByText(/level 4\.0/i)).toBeInTheDocument()
    expect(screen.queryByTestId('verified-seal')).not.toBeInTheDocument()
  })

  // The real wire case: the pair is absent, not `undefined` — reproduced by `delete`ing the
  // keys off a plain object and running it through the actual schema, not by constructing
  // a GlobeNode by hand (levelVerified is a required field on that type; the wire, not the
  // decoded type, is where "absent" is even expressible).
  it('an absent pair (an older API) reaches the chip as no seal — proven through the real decoder, not just typed', async () => {
    const wireNode: Record<string, unknown> = {
      id: 'p1', name: 'Dana Levi', avatar_url: null, skill_level: 4, skill_tier: 'silver',
      level_verified: true, level_reliability: 91,
      club: null, matches: 12, win_rate: 58, since: 2024,
    }
    delete wireNode.level_verified
    delete wireNode.level_reliability
    expect('level_verified' in wireNode).toBe(false)
    expect('level_reliability' in wireNode).toBe(false)

    const graph = toGlobeGraph(
      networkPayloadSchema.parse({ generated_at: 'now', nodes: [wireNode], links: [] }),
    )
    expect(graph.nodes[0].levelVerified).toBeNull()
    expect(graph.nodes[0].levelReliability).toBeNull()

    renderTab(graph.nodes[0])
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(screen.getByText(/level 4\.0/i)).toBeInTheDocument()
    expect(screen.queryByTestId('verified-seal')).not.toBeInTheDocument()
  })
})
