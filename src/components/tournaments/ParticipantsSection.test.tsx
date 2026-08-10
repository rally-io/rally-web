import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ParticipantsSection } from './ParticipantsSection'
import type { TournamentParticipants } from '@/types/api'
import type { AppSessionStatus } from '@/contexts/AppSessionContext'

const mockData: { current: TournamentParticipants | null } = { current: null }
const mockParticipantsHook = vi.fn((_tournamentId: string, _enabled?: boolean) => ({
  data: mockData.current,
}))
vi.mock('@/hooks/useTournamentParticipants', () => ({
  useTournamentParticipants: (...args: [string, boolean?]) => mockParticipantsHook(...args),
}))

const mockSessionState: { status: AppSessionStatus } = { status: 'ready' }
vi.mock('@/hooks/useAppSession', () => ({
  useAppSession: () => ({
    status: mockSessionState.status,
    onboardingStatus: null,
    playerProfile: null,
    refetchOnboarding: vi.fn(),
    clearSession: vi.fn(),
  }),
}))

const mockRequireSignIn = vi.fn()
vi.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ requireSignIn: mockRequireSignIn }),
}))

function pair(i: number) {
  return {
    registration_id: `reg-${i}`,
    team_name: null,
    player_1: { id: `p${i}a`, first_name: `First${i}`, last_name: 'A', avatar_url: null, skill_level: 3.5, is_guest: false },
    // Non-null on purpose: proves the guard hides the numeral because the
    // player is a guest, not merely because skill_level happens to be null.
    player_2: { id: `p${i}b`, first_name: `Second${i}`, last_name: 'B', avatar_url: null, skill_level: 4.0, is_guest: true },
  }
}

function data(n: number): TournamentParticipants {
  return {
    tournament_id: 't1', format: 'doubles', confirmed_count: n,
    items: Array.from({ length: n }, (_, i) => pair(i)),
  }
}

// ParticipantsSection calls useNavigate() (complete-your-profile CTA), so it
// needs a Router. A real route to /profile/edit lets the navigate-on-click
// test assert on where the app actually lands, not just a mocked call.
function renderSection(tournamentId = 't1') {
  return render(
    <MemoryRouter initialEntries={['/tournaments/t1']}>
      <Routes>
        <Route path="/tournaments/:id" element={<ParticipantsSection tournamentId={tournamentId} />} />
        <Route path="/profile/edit" element={<div>PROFILE_EDIT_PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockSessionState.status = 'ready' // signed in + onboarded, by default
  mockRequireSignIn.mockReset()
  mockRequireSignIn.mockResolvedValue(undefined)
  mockParticipantsHook.mockClear()
})

describe('ParticipantsSection', () => {
  it('renders nothing while data is null (error/404/loading)', () => {
    mockData.current = null
    const { container } = renderSection()
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when zero confirmed', () => {
    mockData.current = data(0)
    const { container } = renderSection()
    expect(container.firstChild).toBeNull()
  })

  it('renders pair rows with both players', () => {
    mockData.current = data(2)
    renderSection()
    expect(screen.getByText('First0 A')).toBeInTheDocument()
    expect(screen.getByText('Second0 B')).toBeInTheDocument()
  })

  it('numbers pair badges by absolute position, stable across expand (not renumbered per page)', () => {
    mockData.current = data(10)
    renderSection()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByText('4')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button')) // expand
    expect(screen.getByText('1')).toBeInTheDocument() // first pair's badge unchanged
    expect(screen.getByText('10')).toBeInTheDocument() // last pair now visible, numbered 10
  })

  it('collapses to exactly 3 pairs by default', () => {
    mockData.current = data(10)
    renderSection()
    expect(screen.getByText('First2 A')).toBeInTheDocument()
    expect(screen.queryByText('First3 A')).not.toBeInTheDocument()
    expect(screen.queryByText('First9 A')).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveTextContent('Show all (10)')
  })

  it('no toggle button when the pair count is at or below the collapse limit', () => {
    mockData.current = data(3)
    renderSection()
    expect(screen.getByText('First2 A')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('expands to show all pairs, then collapses back to 3 and scrolls the section into view', () => {
    mockData.current = data(10)
    const { container } = renderSection()
    const section = container.querySelector('section') as HTMLElement

    // Whether scrollIntoView fires "after the click" doesn't distinguish the
    // fix from the bug — RTL's fireEvent flushes effects inside act() either
    // way, so a synchronous in-handler call and a post-commit effect call
    // both land before fireEvent returns. What differs is the DOM at the
    // *moment* scrollIntoView runs: the old, buggy version called it while
    // the expanded rows (First9 A) were still mounted; the fix calls it only
    // once the collapse has actually committed and First9 A is gone. Capture
    // that at call time — reverting the useEffect fix back to a synchronous
    // call inside handleToggle makes this assertion fail.
    let expandedAtScrollTime: boolean | null = null
    section.scrollIntoView = vi.fn(() => {
      expandedAtScrollTime = screen.queryByText('First9 A') !== null
    })

    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('First9 A')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveTextContent('Show less')
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
    expect(section.scrollIntoView).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('First9 A')).not.toBeInTheDocument()
    expect(screen.getByText('First2 A')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveTextContent('Show all (10)')
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
    expect(section.scrollIntoView).toHaveBeenCalledTimes(1)
    expect(expandedAtScrollTime).toBe(false)
  })

  it('guest gets no skill numeral, even when skill_level is set', () => {
    mockData.current = data(1)
    renderSection()
    expect(screen.getByText('3.5')).toBeInTheDocument() // player_1's numeral
    expect(screen.queryByText('4.0')).not.toBeInTheDocument() // guest player_2's, suppressed
  })

  it('renders nothing when items is empty despite a positive confirmed_count (malformed payload)', () => {
    mockData.current = { tournament_id: 't1', format: 'doubles', confirmed_count: 5, items: [] }
    const { container } = renderSection()
    expect(container.firstChild).toBeNull()
  })

  describe('signed out', () => {
    it('renders the sign-in prompt and no participant names, even if a roster happens to be cached', () => {
      mockSessionState.status = 'signed_out'
      mockData.current = data(2) // proves the component doesn't merely forget to render — it refuses to.
      renderSection()
      expect(screen.getByText("Sign in to see who's playing")).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign in / Create account' })).toBeInTheDocument()
      expect(screen.queryByText('First0 A')).not.toBeInTheDocument()
      expect(screen.queryByText('Second0 B')).not.toBeInTheDocument()
    })

    it('does not fetch the roster at all', () => {
      mockSessionState.status = 'signed_out'
      mockData.current = data(2)
      renderSection()
      expect(mockParticipantsHook).toHaveBeenCalledWith('t1', false)
    })

    it('CTA click calls requireSignIn from the shared auth gate', () => {
      mockSessionState.status = 'signed_out'
      renderSection()
      fireEvent.click(screen.getByRole('button', { name: 'Sign in / Create account' }))
      expect(mockRequireSignIn).toHaveBeenCalledTimes(1)
    })
  })

  // Signed in, but no Player row yet (AppSessionContext's other gated
  // population). get_consumer_user — the roster endpoint's auth dependency —
  // 403s for this population exactly like it does for a signed-out visitor,
  // so it needs the same "withhold the fetch" treatment, not just a bare
  // session-truthiness check.
  describe('profile incomplete', () => {
    it('renders the complete-profile prompt, no participant names, and does not fetch the roster', () => {
      mockSessionState.status = 'profile_incomplete'
      mockData.current = data(2) // proves the component doesn't merely forget to render — it refuses to.
      renderSection()
      expect(screen.getByText("Complete your profile to see who's playing")).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Complete Profile' })).toBeInTheDocument()
      expect(screen.queryByText('First0 A')).not.toBeInTheDocument()
      expect(screen.queryByText('Second0 B')).not.toBeInTheDocument()
      expect(mockParticipantsHook).toHaveBeenCalledWith('t1', false)
    })

    it('CTA click navigates to /profile/edit, not the sign-in gate', () => {
      mockSessionState.status = 'profile_incomplete'
      renderSection()
      fireEvent.click(screen.getByRole('button', { name: 'Complete Profile' }))
      expect(screen.getByText('PROFILE_EDIT_PAGE')).toBeInTheDocument()
      expect(mockRequireSignIn).not.toHaveBeenCalled()
    })
  })

  describe('profile_error (onboarding status failed to load)', () => {
    it('renders nothing and does not fetch the roster', () => {
      mockSessionState.status = 'profile_error'
      mockData.current = data(2)
      const { container } = renderSection()
      expect(container.firstChild).toBeNull()
      expect(mockParticipantsHook).toHaveBeenCalledWith('t1', false)
    })
  })

  describe('signed in', () => {
    it('fetches the roster with enabled=true', () => {
      mockData.current = data(2)
      renderSection()
      expect(mockParticipantsHook).toHaveBeenCalledWith('t1', true)
    })
  })
})
