import { useRef, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/playerGlobe/hooks/usePlayerNetwork', () => ({ usePlayerNetwork: () => ({ index: mockIndex }) }))
vi.mock('@/hooks/useReadyViewerId', () => ({ useReadyViewerId: () => 'viewer' }))

import * as statsApi from '@/features/playerGlobe/api/playerStats'
import { buildNetworkIndex } from '@/features/playerGlobe/lib/networkIndex'
import type { GlobeNode } from '@/features/playerGlobe/types'
import { makeCard } from '@/lib/partners/testCards'
import type { PartnerCard } from '@/types/partnerPool'
import { PartnerDetailDrawer } from './PartnerDetailDrawer'

/* Ported from rally-mobile's PartnerDetailSheet.test.tsx. PlayerCard has its own tests. */

const node = (id: string, name: string): GlobeNode => ({
  id, name, avatarUrl: null, avatarCleanUrl: null, portraitUrl: null, gender: null, skillLevel: null, skillTier: null,
  levelVerified: false, levelReliability: null, club: null, matches: 8, winRate: 50, since: 2025,
})
// Noa (the deck card, p-1) has partnered Dana (p-7) three times.
const mockIndex = buildNetworkIndex({
  nodes: [node('p-1', 'Noa Levi'), node('p-7', 'Dana Cohen')],
  links: [{ source: 'p-1', target: 'p-7', type: 'partner', games: 3, lastPlayedAt: null }],
})

function renderDrawer(card: PartnerCard | null = makeCard()) {
  const onSwipe = vi.fn()
  const onClose = vi.fn()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const element = (c: PartnerCard | null) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PartnerDetailDrawer card={c} onClose={onClose} onSwipe={onSwipe} />
      </MemoryRouter>
    </QueryClientProvider>
  )
  const utils = render(element(card))
  return { onSwipe, onClose, rerender: (c: PartnerCard | null) => utils.rerender(element(c)) }
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(statsApi, 'fetchPublicPlayerStats').mockResolvedValue({
    matches_played: 8, matches_won: 4, matches_lost: 4, win_rate: 50,
    current_streak: 0, best_streak: 2, tournaments_played: 1, tournaments_won: 0,
  })
  vi.spyOn(statsApi, 'fetchFullPlayerStats').mockRejectedValue({ isNotFound: true })
  vi.spyOn(statsApi, 'fetchSocialProfile').mockResolvedValue({ isFollowing: false })
})

describe('PartnerDetailDrawer', () => {
  it('draws nothing without a card', () => {
    renderDrawer(null)
    expect(screen.queryByTestId('partner-detail')).toBeNull()
  })

  it("opens on the deck card's own player card, named for assistive tech, with pass / like in the footer", () => {
    renderDrawer()
    expect(screen.getByRole('dialog', { name: 'Noa Levi' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Noa Levi' })).toBeTruthy()
    expect(screen.getByTestId('partner-detail-footer')).toBeTruthy()
  })

  it('pass and like act on the deck card', () => {
    const { onSwipe } = renderDrawer()
    fireEvent.click(screen.getByTestId('partner-like'))
    expect(onSwipe).toHaveBeenLastCalledWith(expect.objectContaining({ player_id: 'p-1' }), 'like')
    fireEvent.click(screen.getByTestId('partner-pass'))
    expect(onSwipe).toHaveBeenLastCalledWith(expect.objectContaining({ player_id: 'p-1' }), 'pass')
  })

  it('focusing one of their partners switches the card to that player and hides pass / like', () => {
    renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: 'Connections' }))
    fireEvent.click(screen.getAllByText('Dana Cohen')[0])
    expect(screen.getByRole('heading', { name: 'Dana Cohen' })).toBeTruthy()
    expect(screen.queryByTestId('partner-detail-footer')).toBeNull()
  })

  it('the next deck card opens on itself, not on the player focused before', () => {
    const { rerender } = renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: 'Connections' }))
    fireEvent.click(screen.getAllByText('Dana Cohen')[0])
    rerender(makeCard({ player_id: 'p-2', name: 'Maya Bar' }))
    expect(screen.getByRole('heading', { name: 'Maya Bar' })).toBeTruthy()
    expect(screen.getByTestId('partner-detail-footer')).toBeTruthy()
  })

  it("closes from the card's close button, Escape, and a click on the dimmed area, not a click on the card", () => {
    const { onClose } = renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('heading', { name: 'Noa Levi' }))
    expect(onClose).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByTestId('partner-detail'))
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})

/* It opens from deck state, not a Radix Trigger, so it hands focus back itself: to what had
   focus when it opened, or, when that has left the page (the card was swiped from the footer),
   to returnFocusFallback(). */
describe('PartnerDetailDrawer — focus on close', () => {
  function FocusHarness() {
    const [opener, setOpener] = useState<'first' | 'next'>('first')
    const [card, setCard] = useState<PartnerCard | null>(null)
    const nextRef = useRef<HTMLButtonElement>(null)
    const qc = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))[0]
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          {opener === 'first' ? (
            <button type="button" onClick={() => setCard(makeCard())}>
              First card
            </button>
          ) : (
            <button type="button" ref={nextRef}>
              Next card
            </button>
          )}
          <PartnerDetailDrawer
            card={card}
            onClose={() => setCard(null)}
            onSwipe={() => {
              setCard(null)
              setOpener('next')
            }}
            returnFocusFallback={() => nextRef.current}
          />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  async function open() {
    render(<FocusHarness />)
    const first = screen.getByRole('button', { name: 'First card' })
    first.focus()
    fireEvent.click(first)
    await screen.findByTestId('partner-detail')
    await waitFor(() => expect(first).not.toHaveFocus())
    return first
  }

  it('closing gives focus back to what opened it', async () => {
    const first = await open()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByTestId('partner-detail')).toBeNull())
    await waitFor(() => expect(first).toHaveFocus())
  })

  it('a swipe from the footer, which takes the card away, gives focus to the fallback', async () => {
    await open()
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
    await waitFor(() => expect(screen.queryByTestId('partner-detail')).toBeNull())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next card' })).toHaveFocus())
  })
})
