import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@/i18n'
import { Navbar } from './Navbar'

const signOut = vi.fn()
const clearSession = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'u1' } },
    user: { id: 'u1', email: 'dana@example.com', user_metadata: {} },
    signOut,
  }),
}))

vi.mock('@/hooks/useAppSession', () => ({
  useAppSession: () => ({
    status: 'ready',
    onboardingStatus: { completion_percent: 100, has_player_profile: true, missing_steps: [], completed_steps: [], is_authenticated: true },
    playerProfile: { first_name: 'Dana', last_name: 'Levi', avatar_url: null, skill_tier: null, skill_level: null },
    clearSession,
  }),
}))

const originalLocation = window.location

beforeEach(() => {
  vi.clearAllMocks()
  signOut.mockResolvedValue(undefined)
  // jsdom throws on a real navigation — swap in a plain writable stub.
  // @ts-expect-error simplified stub for the test
  delete window.location
  ;(window as unknown as { location: Location }).location = { ...originalLocation, href: '' }
})

afterEach(() => {
  ;(window as unknown as { location: Location }).location = originalLocation
})

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  )
}

describe('Navbar sign out', () => {
  it('clears the session and does a full page reload to "/" instead of a client-side navigate', async () => {
    renderNavbar()
    fireEvent.click(screen.getByLabelText('User menu'))
    fireEvent.click(await screen.findByText(/sign out/i))

    expect(clearSession).toHaveBeenCalledTimes(1)
    expect(signOut).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(window.location.href).toBe('/'))
  })

  it('still reloads to "/" even if signOut() itself throws', async () => {
    signOut.mockRejectedValue(new Error('network error'))
    renderNavbar()
    fireEvent.click(screen.getByLabelText('User menu'))
    fireEvent.click(await screen.findByText(/sign out/i))

    await vi.waitFor(() => expect(window.location.href).toBe('/'))
  })
})
