import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileRing } from './ProfileRing'

const appSession = vi.hoisted(() => ({
  current: {
    onboardingStatus: null as { completion_percent: number; missing_steps: string[] } | null,
    playerProfile: null as { first_name: string; last_name: string } | null,
  },
}))

vi.mock('@/hooks/useAppSession', () => ({ useAppSession: () => appSession.current }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'dana@example.com', user_metadata: { full_name: 'Dana Levi' } } }),
}))

/**
 * The bug this pins: ProfileRing used to `return null` whenever the onboarding
 * status was missing. The Navbar swaps the login link for this component the
 * moment a session exists, so a null render left a signed-in visitor with NO
 * account control in the header at all — reported as "the login button
 * disappears after a couple of seconds". The status is missing for a real and
 * common window: it is fetched after the session restores, and it stays null
 * if that fetch fails.
 */
describe('ProfileRing without an onboarding status', () => {
  it('still renders the initials, so the header never loses its account control', () => {
    appSession.current = { onboardingStatus: null, playerProfile: null }

    const { container } = render(<ProfileRing />)

    expect(screen.getByText('DL')).toBeInTheDocument()
    // The ring itself still draws, just with no progress swept.
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('sweeps the ring once the status arrives', () => {
    appSession.current = {
      onboardingStatus: { completion_percent: 60, missing_steps: ['avatar'] },
      playerProfile: { first_name: 'Dana', last_name: 'Levi' },
    }

    const { container } = render(<ProfileRing />)

    expect(screen.getByText('DL')).toBeInTheDocument()
    const arc = [...container.querySelectorAll('circle')].find(c =>
      c.getAttribute('stroke-dasharray'),
    )
    expect(arc?.getAttribute('stroke-dasharray')).toBe('60 100')
  })
})
