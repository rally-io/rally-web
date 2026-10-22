import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/* The page's job is the gates and where each way out leads; the deck has its own tests and is
   a recorder here. */

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deck: null as Record<string, any> | null,
}))

vi.mock('@/hooks/useAppSession', () => ({ useAppSession: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@/hooks/useAuthGate', () => ({ useAuthGate: vi.fn() }))
vi.mock('@/constants/corporateEvents', () => ({
  eventPagePathForTournament: (id: string | undefined) => (id === 'corp-1' ? '/join/corp' : null),
}))
vi.mock('@/components/partners/PartnerDeck', () => ({
  PartnerDeck: (p: Record<string, unknown>) => {
    h.deck = p
    return <div data-testid="deck" />
  },
}))

import { useAppSession } from '@/hooks/useAppSession'
import { useAuth } from '@/hooks/useAuth'
import { useAuthGate } from '@/hooks/useAuthGate'
import PartnerDeckPage from './PartnerDeckPage'

const PROFILE = {
  player_id: 'me',
  first_name: 'Dana',
  last_name: 'Levi',
  contact_number: null,
  skill_level: 3.5,
  avatar_url: null,
  avatar_clean_url: 'https://cdn/a-clean.jpg',
  player_preferences: { court_side: 'left_side' },
}
const requireSignIn = vi.fn()
const refetchOnboarding = vi.fn()

function session(status: string, over: Record<string, unknown> = {}) {
  vi.mocked(useAppSession).mockReturnValue({
    status,
    playerProfile: status === 'ready' ? PROFILE : null,
    needsDetails: false,
    refetchOnboarding,
    onboardingStatus: null,
    clearSession: vi.fn(),
    ...over,
  } as never)
}

/** Where the page sent the player, and with what router state. */
function Probe() {
  const location = useLocation()
  return <div data-testid="probe">{`${location.pathname}${location.search} ${JSON.stringify(location.state)}`}</div>
}

function renderPage(id = 't-1') {
  return render(
    <MemoryRouter initialEntries={[`/tournaments/${id}/partners`]}>
      <Routes>
        <Route path="/tournaments/:id/partners" element={<PartnerDeckPage />} />
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
}

const probe = () => screen.getByTestId('probe').textContent

beforeEach(() => {
  vi.clearAllMocks()
  h.deck = null
  sessionStorage.clear()
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, session: null } as never)
  vi.mocked(useAuthGate).mockReturnValue({ requireSignIn })
  requireSignIn.mockResolvedValue(undefined)
  refetchOnboarding.mockResolvedValue(undefined)
  session('ready')
})

describe('PartnerDeckPage — gates', () => {
  it('a spinner while the session loads, under the title and the way back', () => {
    session('loading')
    renderPage()
    expect(screen.getByTestId('partner-page-loading')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Find a partner' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/tournaments/t-1')
    expect(screen.queryByTestId('deck')).toBeNull()
  })

  it('signed out: asks to sign in, then reloads the session', async () => {
    session('signed_out')
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in / Create account' }))
    await waitFor(() => expect(refetchOnboarding).toHaveBeenCalledTimes(1))
    expect(requireSignIn).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('deck')).toBeNull()
  })

  it('signed out and the sign-in is cancelled: the panel stays', async () => {
    session('signed_out')
    requireSignIn.mockRejectedValue(new Error('USER_CANCELLED'))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in / Create account' }))
    await waitFor(() => expect(requireSignIn).toHaveBeenCalled())
    expect(refetchOnboarding).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Sign in / Create account' })).toBeInTheDocument()
  })

  it.each([
    ['details missing', 'ready', { needsDetails: true }],
    ['no player profile yet', 'profile_incomplete', {}],
  ])('%s: sends them to the profile and back to the deck', (_label, status, over) => {
    session(status, over)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Complete Profile' }))
    expect(probe()).toBe('/profile/edit?purpose=tournament&returnTo=%2Ftournaments%2Ft-1%2Fpartners null')
  })

  it('the profile failed to load: Retry reloads the session', () => {
    session('profile_error')
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetchOnboarding).toHaveBeenCalledTimes(1)
  })

  it('a tournament registered on its event page has no deck', () => {
    renderPage('corp-1')
    expect(probe()).toBe('/join/corp null')
  })
})

describe('PartnerDeckPage — the deck', () => {
  it('ready: the deck for this tournament, with you on the court', () => {
    renderPage()
    expect(screen.getByTestId('deck')).toBeInTheDocument()
    expect(h.deck?.tournamentId).toBe('t-1')
    expect(h.deck?.viewer).toEqual({ side: 'left_side', name: 'Dana Levi', avatarUrl: 'https://cdn/a-clean.jpg' })
  })

  it('Register together picks the partner for the tournament and goes back to its partner section', () => {
    renderPage()
    const partner = { type: 'existing', id: 'p-1', displayName: 'Noa Levi', avatarUrl: null }
    act(() => h.deck?.onRegisterTogether(partner))
    expect(probe()).toBe('/tournaments/t-1 {"scrollTo":"partner-section"}')
    const draft = JSON.parse(sessionStorage.getItem('rally:tournament-partner')!)
    expect(draft).toMatchObject({ owner: 'u1', tournament: 't-1', partner })
  })

  it('Back to tournament goes there; Edit profile comes back to the deck', () => {
    const { unmount } = renderPage()
    act(() => h.deck?.onOpenTournament())
    expect(probe()).toBe('/tournaments/t-1 null')
    unmount()
    renderPage()
    act(() => h.deck?.onEditProfile())
    expect(probe()).toBe('/profile/edit?returnTo=%2Ftournaments%2Ft-1%2Fpartners null')
  })
})
