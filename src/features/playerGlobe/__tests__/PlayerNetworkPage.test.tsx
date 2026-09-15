import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { AppSessionStatus } from '@/contexts/AppSessionContext'
import { useAppSession } from '@/hooks/useAppSession'
import { trackGlobeOpen } from '@/lib/analytics'
import PlayerNetworkPage from '../pages/PlayerNetworkPage'
import * as networkApi from '../api/network'
import * as playerStatsApi from '../api/playerStats'
import type { GlobeGraph, GlobeNode } from '../types'

const mockUseAppSession = vi.mocked(useAppSession)
function appSession(status: AppSessionStatus) {
  return { status, onboardingStatus: null, playerProfile: null, needsDetails: false, refetchOnboarding: vi.fn(), clearSession: vi.fn() }
}

const requireSignIn = vi.fn()
// "Find me" looks up the Supabase auth uid — a network node's id IS that uid.
const auth: { session: { user: { id: string } } | null } = { session: null }
vi.mock('@/hooks/useAuthGate', () => ({ useAuthGate: () => ({ requireSignIn }) }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: auth.session }) }))
vi.mock('@/hooks/useAppSession', () => ({ useAppSession: vi.fn() }))
vi.mock('@/lib/analytics', () => ({
  GLOBE_OPEN_SOURCES: ['nav', 'home', 'ranking_row', 'player_page', 'share_link', 'direct'],
  trackGlobeOpen: vi.fn(),
}))
// WebGL does not exist in jsdom: the globe is a labelled box that reports the ids it gets.
// Like the real scene, `focusPlayer` SELECTS the node and echoes that selection through
// `onSelect` — TWICE, because a focus asked for while the layout runs is parked and replayed
// on settle, which selects again. The page must tell those echoes apart from a visitor's
// click; a stub that swallowed the echo let a sign-in gate on every signed-out share-link
// landing through. The stub's own "node" is a button that reports a pick the way a click does.
const focusPlayer = vi.fn()
vi.mock('../components/PlayerGlobe', async () => {
  const React = await import('react')
  return {
    PlayerGlobe: React.forwardRef(function Stub(
      props: { onSelect?: (id: string | null) => void },
      ref: React.Ref<unknown>,
    ) {
      React.useImperativeHandle(ref, () => ({
        focusPlayer: (id: string) => {
          focusPlayer(id)
          props.onSelect?.(id)
          props.onSelect?.(id)
        },
        clearSelection: vi.fn(),
        resetView: vi.fn(),
      }))
      return (
        <div data-testid="globe">
          <button type="button" data-testid="globe-node-p1" onClick={() => props.onSelect?.('p1')} />
        </div>
      )
    }),
  }
})

const node = (id: string, name: string): GlobeNode => ({
  id, name, avatarUrl: null, skillLevel: null, skillTier: null, levelVerified: false, levelReliability: null,
  club: null, matches: 0, winRate: 0, since: 2024,
})
const graph: GlobeGraph = {
  generatedAt: 'now',
  nodes: [node('me', 'Yoav Ashkenazi'), node('p1', 'Omer Levi')],
  links: [{ source: 'me', target: 'p1', type: 'partner', games: 3, lastPlayedAt: null }],
}

type Entry = string | { pathname: string; search?: string; state?: unknown }
function renderPage(initialEntry: Entry = '/network') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const tree = () => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <PlayerNetworkPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
  const utils = render(tree())
  return { ...utils, qc, rerender: () => utils.rerender(tree()) }
}

describe('PlayerNetworkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.session = null
    mockUseAppSession.mockReturnValue(appSession('ready'))
    // Selecting a player now renders PlayerStatsTab, which fires real queries — stub them so
    // this page's tests stay pure (no live request to the API base URL) and so opening a card
    // doesn't leave a real fetch running past the test.
    vi.spyOn(playerStatsApi, 'fetchPublicPlayerStats').mockResolvedValue({
      matches_played: 0, matches_won: 0, matches_lost: 0, win_rate: 0,
      current_streak: 0, best_streak: 0, tournaments_played: 0, tournaments_won: 0,
    })
    vi.spyOn(playerStatsApi, 'fetchFullPlayerStats').mockRejectedValue({ isNotFound: true })
    vi.spyOn(playerStatsApi, 'fetchSocialProfile').mockResolvedValue({ isFollowing: false })
  })

  it('renders the globe once the graph arrives and focuses a searched player', async () => {
    vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
    auth.session = { user: { id: 'me' } }
    renderPage()
    expect(await screen.findByTestId('globe')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'omer' } })
    fireEvent.click(await screen.findByText('Omer Levi'))
    expect(focusPlayer).toHaveBeenCalledWith('p1')
    expect(await screen.findByRole('heading', { name: 'Omer Levi' })).toBeInTheDocument()
  })

  // Regression: a signed-in viewer whose player profile isn't ready yet (e.g. a brand-new
  // sign-up mid this-same session) must never trigger the two signed-in-only requests —
  // the client interceptor takes their 403 as "go finish your profile" and would navigate
  // the whole page away from /network mid-card-open.
  it("does not request full stats or the follow relationship when the viewer's profile is not ready", async () => {
    vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
    auth.session = { user: { id: 'me' } }
    mockUseAppSession.mockReturnValue(appSession('profile_incomplete'))
    renderPage()
    await screen.findByTestId('globe')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'omer' } })
    fireEvent.click(await screen.findByText('Omer Levi'))
    expect(await screen.findByRole('heading', { name: 'Omer Levi' })).toBeInTheDocument()
    // The public career block still renders — only the signed-in-only requests are gated.
    expect(await screen.findByTestId('player-season-stats')).toBeInTheDocument()
    expect(playerStatsApi.fetchFullPlayerStats).not.toHaveBeenCalled()
    expect(playerStatsApi.fetchSocialProfile).not.toHaveBeenCalled()
  })

  it('opens the sign-in gate when a signed-out visitor picks a player, then opens that player', async () => {
    vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
    requireSignIn.mockResolvedValue(undefined)
    const { rerender } = renderPage()
    await screen.findByTestId('globe')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'omer' } })
    fireEvent.click(await screen.findByText('Omer Levi'))
    await waitFor(() => expect(requireSignIn).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Omer Levi' })).not.toBeInTheDocument()
    expect(focusPlayer).not.toHaveBeenCalled()

    auth.session = { user: { id: 'me' } }
    rerender()
    expect(await screen.findByRole('heading', { name: 'Omer Levi' })).toBeInTheDocument()
    expect(focusPlayer).toHaveBeenCalledWith('p1')
  })

  it('does nothing when the signed-out visitor dismisses the gate', async () => {
    vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
    requireSignIn.mockRejectedValue(new Error('USER_CANCELLED'))
    renderPage()
    await screen.findByTestId('globe')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'omer' } })
    fireEvent.click(await screen.findByText('Omer Levi'))
    await waitFor(() => expect(requireSignIn).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Omer Levi' })).not.toBeInTheDocument()
  })

  it('shows the error state with a retry that refetches', async () => {
    const spy = vi.spyOn(networkApi, 'fetchPlayerNetwork').mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText(/could not load/i)).toBeInTheDocument()
    spy.mockResolvedValue(graph)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByTestId('globe')).toBeInTheDocument()
  })

  it('shows the empty state for a network without players', async () => {
    vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue({ ...graph, nodes: [], links: [] })
    renderPage()
    expect(await screen.findByText(/nobody on the ball yet/i)).toBeInTheDocument()
  })

  it('Find me opens the sign-in gate when signed out and does nothing when it is dismissed', async () => {
    vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
    requireSignIn.mockRejectedValue(new Error('USER_CANCELLED'))
    renderPage()
    await screen.findByTestId('globe')
    fireEvent.click(screen.getByRole('button', { name: /find me/i }))
    await waitFor(() => expect(requireSignIn).toHaveBeenCalled())
    expect(focusPlayer).not.toHaveBeenCalled()
  })

  it('Find me focuses my own node when signed in', async () => {
    vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
    auth.session = { user: { id: 'me' } }
    renderPage()
    await screen.findByTestId('globe')
    fireEvent.click(screen.getByRole('button', { name: /find me/i }))
    await waitFor(() => expect(focusPlayer).toHaveBeenCalledWith('me'))
    expect(requireSignIn).not.toHaveBeenCalled()
  })

  // Covers every signed-in user who is not a node: no matches yet, and no player row at all.
  it('Find me tells a signed-in user who is not on the ball', async () => {
    vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
    auth.session = { user: { id: 'stranger' } }
    renderPage()
    await screen.findByTestId('globe')
    fireEvent.click(screen.getByRole('button', { name: /find me/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/not on the ball yet/i)
    expect(requireSignIn).not.toHaveBeenCalled()
  })

  it('keeps the loaded globe and hides the error state when a background refetch fails', async () => {
    const spy = vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
    const { qc } = renderPage()
    await screen.findByTestId('globe')

    spy.mockRejectedValue(new Error('boom'))
    await act(async () => {
      await qc.refetchQueries({ queryKey: ['player-network'] })
      // the query observer batches its React notification on its own macrotask;
      // flush it so the component has actually re-rendered with isError before we assert.
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const state = qc.getQueryState(['player-network'])
    expect(state?.status).toBe('error')
    expect(state?.data).toBeDefined()
    expect(screen.getByTestId('globe')).toBeInTheDocument()
    expect(screen.queryByText(/could not load/i)).not.toBeInTheDocument()
  })

  describe('?player= and the door it came from', () => {
    it('pins a known player once the graph knows them (signed in: the card opens)', async () => {
      vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
      auth.session = { user: { id: 'me' } }
      renderPage('/network?player=p1')
      await screen.findByTestId('globe')
      await waitFor(() => expect(focusPlayer).toHaveBeenCalledWith('p1'))
      expect(await screen.findByRole('heading', { name: 'Omer Levi' })).toBeInTheDocument()
      expect(requireSignIn).not.toHaveBeenCalled()
    })

    it('turns the ball to a known player for a signed-out visitor, with no sign-in prompt and no card', async () => {
      vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
      mockUseAppSession.mockReturnValue(appSession('signed_out'))
      renderPage('/network?player=p1')
      await screen.findByTestId('globe')
      await waitFor(() => expect(focusPlayer).toHaveBeenCalledWith('p1'))
      await new Promise((r) => setTimeout(r, 20))
      expect(requireSignIn).not.toHaveBeenCalled()
      expect(screen.queryByRole('heading', { name: 'Omer Levi' })).not.toBeInTheDocument()
      // only the pin's own echoes are silent: the visitor CLICKING that same node (a pointer-down
      // on the stage, then the scene's pick) is the sign-in moment
      requireSignIn.mockRejectedValue(new Error('USER_CANCELLED'))
      const node = screen.getByTestId('globe-node-p1')
      fireEvent.pointerDown(node)
      fireEvent.click(node)
      await waitFor(() => expect(requireSignIn).toHaveBeenCalledTimes(1))
    })

    // The session resolves asynchronously and often lands AFTER the graph. Deciding on the
    // first index would turn every signed-in share-link arrival into the signed-out one.
    it('waits for the session to settle before deciding whether the card opens', async () => {
      vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
      mockUseAppSession.mockReturnValue(appSession('loading'))
      const { rerender } = renderPage('/network?player=p1')
      await screen.findByTestId('globe')
      await new Promise((r) => setTimeout(r, 20))
      expect(focusPlayer).not.toHaveBeenCalled()

      auth.session = { user: { id: 'me' } }
      mockUseAppSession.mockReturnValue(appSession('ready'))
      rerender()
      await waitFor(() => expect(focusPlayer).toHaveBeenCalledWith('p1'))
      expect(await screen.findByRole('heading', { name: 'Omer Levi' })).toBeInTheDocument()
    })

    it('pins once: a later session change does not re-turn the ball', async () => {
      vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
      mockUseAppSession.mockReturnValue(appSession('signed_out'))
      const { rerender } = renderPage('/network?player=p1')
      await screen.findByTestId('globe')
      await waitFor(() => expect(focusPlayer).toHaveBeenCalledTimes(1))
      auth.session = { user: { id: 'me' } }
      mockUseAppSession.mockReturnValue(appSession('ready'))
      rerender()
      await new Promise((r) => setTimeout(r, 20))
      expect(focusPlayer).toHaveBeenCalledTimes(1)
    })

    it('ignores an unknown id and no id', async () => {
      vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
      auth.session = { user: { id: 'me' } }
      const first = renderPage('/network?player=nobody')
      await screen.findByTestId('globe')
      await new Promise((r) => setTimeout(r, 20))
      expect(focusPlayer).not.toHaveBeenCalled()
      first.unmount()
      renderPage('/network')
      await screen.findByTestId('globe')
      await new Promise((r) => setTimeout(r, 20))
      expect(focusPlayer).not.toHaveBeenCalled()
    })

    it('logs globe_open once per mount: navigation state first, then share_link, then direct', async () => {
      vi.spyOn(networkApi, 'fetchPlayerNetwork').mockResolvedValue(graph)
      const first = renderPage({ pathname: '/network', state: { source: 'ranking_row' } })
      expect(trackGlobeOpen).toHaveBeenCalledTimes(1)
      expect(trackGlobeOpen).toHaveBeenCalledWith('ranking_row')
      first.rerender()
      expect(trackGlobeOpen).toHaveBeenCalledTimes(1)
      first.unmount()

      vi.mocked(trackGlobeOpen).mockClear()
      const second = renderPage('/network?player=p1')
      expect(trackGlobeOpen).toHaveBeenCalledWith('share_link')
      second.unmount()

      vi.mocked(trackGlobeOpen).mockClear()
      const third = renderPage({ pathname: '/network', state: { source: 'not-ours' } })
      expect(trackGlobeOpen).toHaveBeenCalledWith('direct')
      third.unmount()
    })
  })
})
