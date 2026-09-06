import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../api/playerStats'
import { PlayerCard } from '../components/PlayerCard'
import { buildNetworkIndex } from '../lib/networkIndex'
import type { GlobeGraph, GlobeNode } from '../types'

const node = (id: string, name: string, over: Partial<GlobeNode> = {}): GlobeNode => ({
  id, name, avatarUrl: null, skillLevel: null, skillTier: null, club: null, matches: 0, winRate: 0, since: 2024, ...over,
})

const graph: GlobeGraph = {
  generatedAt: 'now',
  nodes: [
    node('me', 'Yoav Ashkenazi', { skillLevel: 4, skillTier: 'gold', club: { id: 'c', name: 'Rally TLV', city: 'Tel Aviv' }, matches: 116, winRate: 65, since: 2024 }),
    node('p1', 'Omer Levi'), node('p2', 'Dani Shoval'), node('r1', 'Yoni Peretz'),
  ],
  links: [
    { source: 'me', target: 'p1', type: 'partner', games: 34, lastPlayedAt: null },
    { source: 'p2', target: 'me', type: 'partner', games: 40, lastPlayedAt: null },
    { source: 'me', target: 'r1', type: 'opponent', games: 10, lastPlayedAt: null },
  ],
}
const index = buildNetworkIndex(graph)

function renderCard(target: GlobeNode, onFocus = vi.fn(), onClose = vi.fn(), viewerId: string | null = 'me') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    onFocus,
    onClose,
    ...render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <PlayerCard node={target} index={index} onFocus={onFocus} onClose={onClose} viewerId={viewerId} />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

describe('PlayerCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'fetchPublicPlayerStats').mockResolvedValue({
      matches_played: 12, matches_won: 7, matches_lost: 5, win_rate: 58,
      current_streak: 2, best_streak: 4, tournaments_played: 3, tournaments_won: 1,
    })
    vi.spyOn(api, 'fetchFullPlayerStats').mockRejectedValue({ isNotFound: true })
    vi.spyOn(api, 'fetchSocialProfile').mockResolvedValue({ isFollowing: false })
  })

  it('shows identity, chips, stats and both lists sorted by games', async () => {
    const { onFocus } = renderCard(index.nodeById.get('me')!)
    expect(screen.getByRole('heading', { name: 'Yoav Ashkenazi' })).toBeInTheDocument()
    expect(screen.getByText('Rally TLV · Tel Aviv')).toBeInTheDocument()
    // The level chip carries the number only — tier is shown by the avatar ring, not in words.
    expect(screen.getByText(/level 4\.0/i)).toBeInTheDocument()
    expect(screen.queryByText(/gold/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^stats$/i })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    // Own card: viewerId === node.id, so there is nobody to follow.
    expect(screen.queryByRole('button', { name: /follow/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /connections/i }))
    // The phone partners/rivals switch must stay pinned above the scrollable lists, not
    // scroll away with them — it should not be a descendant of the overflow-y-auto region.
    const phoneSwitch = screen.getByRole('button', { name: /^partners/i })
    expect(phoneSwitch.closest('.overflow-y-auto')).toBeNull()
    const partners = screen.getByRole('list', { name: /partners/i })
    expect(within(partners).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Dani Shoval'),
      expect.stringContaining('Omer Levi'),
    ])
    const rivals = screen.getByRole('list', { name: /rivals/i })
    expect(within(rivals).getAllByRole('listitem')).toHaveLength(1)
    fireEvent.click(within(partners).getByText('Omer Levi'))
    expect(onFocus).toHaveBeenCalledWith('p1')
  })

  it('closes and falls back to initials without a photo', () => {
    const { onClose } = renderCard(index.nodeById.get('p1')!)
    expect(screen.getAllByText('OL').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('hides Follow and skips the full-stats / follow requests when the viewer is signed out', async () => {
    renderCard(index.nodeById.get('p1')!, vi.fn(), vi.fn(), null)
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /follow/i })).not.toBeInTheDocument()
    expect(vi.mocked(api.fetchFullPlayerStats)).not.toHaveBeenCalled()
    expect(vi.mocked(api.fetchSocialProfile)).not.toHaveBeenCalled()
  })
})
