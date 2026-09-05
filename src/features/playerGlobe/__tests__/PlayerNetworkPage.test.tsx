import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { AppSessionStatus } from '@/contexts/AppSessionContext'
import { useAppSession } from '@/hooks/useAppSession'
import PlayerNetworkPage from '../pages/PlayerNetworkPage'
import * as networkApi from '../api/network'
import * as playerStatsApi from '../api/playerStats'
import type { GlobeGraph, GlobeNode } from '../types'

const mockUseAppSession = vi.mocked(useAppSession)
function appSession(status: AppSessionStatus) {
  return { status, onboardingStatus: null, playerProfile: null, refetchOnboarding: vi.fn(), clearSession: vi.fn() }
}

const requireSignIn = vi.fn()
// "Find me" looks up the Supabase auth uid — a network node's id IS that uid.
const auth: { session: { user: { id: string } } | null } = { session: null }
vi.mock('@/hooks/useAuthGate', () => ({ useAuthGate: () => ({ requireSignIn }) }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: auth.session }) }))
vi.mock('@/hooks/useAppSession', () => ({ useAppSession: vi.fn() }))
// WebGL does not exist in jsdom: the globe is a labelled box that reports the ids it gets.
const focusPlayer = vi.fn()
vi.mock('../components/PlayerGlobe', async () => {
  const React = await import('react')
  return {
    PlayerGlobe: React.forwardRef(function Stub(_props: unknown, ref: React.Ref<unknown>) {
      React.useImperativeHandle(ref, () => ({ focusPlayer, clearSelection: vi.fn(), resetView: vi.fn() }))
      return <div data-testid="globe" />
    }),
  }
})

const node = (id: string, name: string): GlobeNode => ({
  id, name, avatarUrl: null, skillLevel: null, skillTier: null, club: null, matches: 0, winRate: 0, since: 2024,
})
const graph: GlobeGraph = {
  generatedAt: 'now',
  nodes: [node('me', 'Yoav Ashkenazi'), node('p1', 'Omer Levi')],
  links: [{ source: 'me', target: 'p1', type: 'partner', games: 3, lastPlayedAt: null }],
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const tree = () => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/network']}>
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
})
