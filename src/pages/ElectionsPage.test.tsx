import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import ElectionsPage from './ElectionsPage'
import { getMyVote, submitVote } from '@/services/api/elections'
import { pendingVote } from '@/features/elections/pendingVote'

vi.mock('@/services/api/elections')
vi.mock('@/lib/analytics', () => ({ trackElections: vi.fn(), trackLead: vi.fn() }))

const requireSignIn = vi.fn()
const auth: { user: { id: string; email: string } | null } = { user: null }

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: auth.user, session: auth.user ? { user: auth.user } : null }),
}))
vi.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ requireSignIn }),
}))

const CLUB = 'padel-time-club-holon'
const ok = <T,>(data: T) => ({ success: true as const, data, meta: null, error: null })

function renderPage(path = '/elections') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <ElectionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  auth.user = null
  requireSignIn.mockResolvedValue(undefined)
  vi.mocked(getMyVote).mockResolvedValue(ok(null))
  vi.mocked(submitVote).mockImplementation(async (_e, _u, vote) => ok(vote))
})

describe('ElectionsPage', () => {
  it('lets a signed-out visitor fill both ballots and asks to sign in only at the end', async () => {
    const user = userEvent.setup()
    renderPage()

    // Two CTAs: the mobile sticky one and the desktop inline one (CSS picks which shows).
    await user.click(screen.getAllByRole('button', { name: 'To the ballot' })[0])
    expect(screen.getByRole('heading', { name: "Israel's Club" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pick a club' })).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: /פאדל טיים קלאב חולון/ }))
    await user.click(screen.getByRole('button', { name: 'Next ballot: the chain' }))

    await user.click(screen.getByRole('radio', { name: /פאדל ישראל/ }))
    await user.click(screen.getByRole('button', { name: 'Review' }))

    expect(requireSignIn).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Cast my vote' }))

    expect(requireSignIn).toHaveBeenCalledTimes(1)
    expect(pendingVote.get()).toEqual({ club_id: CLUB, chain_id: 'padel-israel' })
    // Still signed out: nothing is submitted until a session exists.
    expect(submitVote).not.toHaveBeenCalled()
  })

  it('drops the parked ballot when the visitor closes the sign-in modal', async () => {
    requireSignIn.mockRejectedValue(new Error('USER_CANCELLED'))
    pendingVote.set({ club_id: CLUB, chain_id: null })
    const user = userEvent.setup()
    renderPage('/elections?step=review')

    await user.click(screen.getByRole('button', { name: 'Cast my vote' }))
    await waitFor(() => expect(pendingVote.get()).toBeNull())
  })

  it('keeps the parked ballot when sign-up continues on the email-verification page', async () => {
    requireSignIn.mockRejectedValue(new Error('LEFT_FOR_AUTH_PAGE'))
    pendingVote.set({ club_id: CLUB, chain_id: null })
    const user = userEvent.setup()
    renderPage('/elections?step=review')

    await user.click(screen.getByRole('button', { name: 'Cast my vote' }))
    await waitFor(() => expect(requireSignIn).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(pendingVote.get()).toEqual({ club_id: CLUB, chain_id: null })
  })

  it('casts the parked ballot once when the voter comes back signed in', async () => {
    auth.user = { id: 'u1', email: 'dana@example.com' }
    pendingVote.set({ club_id: CLUB, chain_id: 'padel-israel' })
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'You voted!' }, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(submitVote).toHaveBeenCalledTimes(1)
    expect(vi.mocked(submitVote).mock.calls[0][2]).toEqual({
      club_id: CLUB,
      chain_id: 'padel-israel',
    })
    expect(pendingVote.get()).toBeNull()
    expect(screen.getByRole('link', { name: /Join the community/ })).toHaveAttribute(
      'href',
      expect.stringContaining('chat.whatsapp.com'),
    )
  })

  it('shows the recorded vote instead of the ballot to someone who already voted', async () => {
    auth.user = { id: 'u1', email: 'dana@example.com' }
    vi.mocked(getMyVote).mockResolvedValue(ok({ club_id: CLUB, chain_id: null }))
    pendingVote.set({ club_id: 'padelia-ashdod', chain_id: null })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'You already voted' })).toBeInTheDocument()
    expect(screen.getByText('פאדל טיים קלאב חולון')).toBeInTheDocument()
    expect(submitVote).not.toHaveBeenCalled()
    expect(pendingVote.get()).toBeNull()
  })

  it('treats a 409 from the server as already voted', async () => {
    auth.user = { id: 'u1', email: 'dana@example.com' }
    vi.mocked(submitVote).mockRejectedValue({ status: 409, code: 'ALREADY_VOTED' })
    vi.mocked(getMyVote)
      .mockResolvedValueOnce(ok(null))
      .mockResolvedValue(ok({ club_id: CLUB, chain_id: null }))
    pendingVote.set({ club_id: CLUB, chain_id: null })
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'You already voted' }, { timeout: 3000 }),
    ).toBeInTheDocument()
  })
})

describe('pendingVote', () => {
  it('ignores ids that are not on the ballot and expired entries', () => {
    pendingVote.set({ club_id: 'not-a-club', chain_id: null })
    expect(pendingVote.get()).toBeNull()

    localStorage.setItem(
      'rally.elections.pendingVote',
      JSON.stringify({ club_id: CLUB, chain_id: null, savedAt: Date.now() - 4 * 86_400_000 }),
    )
    expect(pendingVote.get()).toBeNull()

    pendingVote.set({ club_id: CLUB, chain_id: 'bogus' })
    expect(pendingVote.get()).toEqual({ club_id: CLUB, chain_id: null })
  })
})
