import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import i18n from '@/i18n'
import { Navbar } from './Navbar'

const signOut = vi.fn()
const clearSession = vi.fn()
const mockVoting = vi.hoisted(() => ({ open: true }))

vi.mock('@/features/elections/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/elections/config')>()),
  isVotingOpen: () => mockVoting.open,
}))

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
    needsDetails: false,
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

describe('nav order and names', () => {
  afterEach(async () => {
    mockVoting.open = true
    await i18n.changeLanguage('he')
  })

  // The flag is decoration (aria-hidden), so compare the names a screen reader reads.
  const linkNames = (nav: HTMLElement) =>
    within(nav).getAllByRole('link').map((a) => a.textContent?.replace(/\p{Regional_Indicator}/gu, '').trim())

  it.each([
    ['he', ['אפליקציה', 'טורנירים', 'דירוג', 'הכדור של Rally', 'בחירות 2026', 'מערכת למועדונים', 'הצטרפו כמאמנים', 'צור קשר']],
    ['en', ['App', 'Tournaments', 'Ranking', 'The Rally ball', 'Elections', 'Club System', 'Join as a Coach', 'Contact']],
  ])('lists the links player-first in %s, elections last of the player ones while voting is open', async (lng, labels) => {
    await i18n.changeLanguage(lng)
    renderNavbar()
    const nav = screen.getAllByRole('navigation')[0]
    expect(linkNames(nav)).toEqual(labels)
    const ball = within(nav).getByRole('link', { name: labels[3] })
    expect(ball).toHaveAttribute('href', '/network')
  })

  it('the elections tab leads with the Israeli flag in the bar and wears it as the icon in the drawer', () => {
    renderNavbar()
    const bar = within(screen.getAllByRole('navigation')[0]).getByRole('link', { name: 'בחירות 2026' })
    expect(bar).toHaveAttribute('href', '/elections')
    expect(bar.firstElementChild).toHaveTextContent('🇮🇱')
    expect(bar.firstElementChild).toHaveAttribute('aria-hidden', 'true')

    fireEvent.click(screen.getByLabelText('Toggle menu'))
    const drawer = within(screen.getAllByRole('navigation')[1]).getByRole('link', { name: 'בחירות 2026' })
    expect(drawer).toHaveAttribute('href', '/elections')
    expect(drawer.firstElementChild).toHaveTextContent('🇮🇱')
    expect(drawer.querySelector('svg')).toBeNull()
  })

  it('drops the elections tab once the polls close, back to seven links', () => {
    mockVoting.open = false
    renderNavbar()
    fireEvent.click(screen.getByLabelText('Toggle menu'))
    const [bar, drawer] = screen.getAllByRole('navigation')
    expect(linkNames(bar)).toEqual(['אפליקציה', 'טורנירים', 'דירוג', 'הכדור של Rally', 'מערכת למועדונים', 'הצטרפו כמאמנים', 'צור קשר'])
    expect(within(drawer).queryByRole('link', { name: 'בחירות 2026' })).toBeNull()
  })

  it('the drawer draws the ball with its own mark, not a generic graph glyph', () => {
    renderNavbar()
    fireEvent.click(screen.getByLabelText('Toggle menu'))
    const drawer = screen.getAllByRole('navigation')[1]
    const ball = within(drawer).getByRole('link', { name: /הכדור של Rally/ })
    expect(ball.querySelector('[data-part="seam"]')).toBeInTheDocument()
  })

  it('has no leftover "network" nav key in either locale', () => {
    for (const lng of ['he', 'en']) {
      expect(i18n.getResource(lng, 'translation', 'nav.network')).toBeUndefined()
      expect(i18n.getResource(lng, 'translation', 'nav.ball')).toBeTruthy()
    }
  })

  it('the ball link carries source=nav in navigation state, so a nav open is not logged as direct', () => {
    function Probe() {
      const { state } = useLocation()
      return <div data-testid="probe">{(state as { source?: string } | null)?.source ?? 'none'}</div>
    }
    render(
      <MemoryRouter>
        <Navbar />
        <Routes>
          <Route path="/network" element={<Probe />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    )
    const nav = screen.getAllByRole('navigation')[0]
    fireEvent.click(within(nav).getByRole('link', { name: /הכדור של Rally/ }))
    expect(screen.getByTestId('probe')).toHaveTextContent('nav')
  })

  it('the other nav links carry no state', () => {
    function Probe() {
      const { state } = useLocation()
      return <div data-testid="probe">{state == null ? 'none' : 'some'}</div>
    }
    render(
      <MemoryRouter>
        <Navbar />
        <Routes>
          <Route path="/ranking" element={<Probe />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    )
    const nav = screen.getAllByRole('navigation')[0]
    fireEvent.click(within(nav).getByRole('link', { name: /דירוג/ }))
    expect(screen.getByTestId('probe')).toHaveTextContent('none')
  })
})
