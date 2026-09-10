import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import '@/i18n'
import AuthCallbackPage from './AuthCallbackPage'
import SetPasswordPage from './SetPasswordPage'

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), updatePassword: vi.fn(), user: { id: 'account-a' } }))
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: mocks.getSession } } }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ updatePassword: mocks.updatePassword, user: mocks.user, isLoading: false }) }))
function Destination() {
  const location = useLocation()
  return <div data-testid="destination">{location.pathname + location.search}{location.state?.recoveryUserId ? ' verified' : ''}</div>
}
function renderCallback(query: string, fragment: string) {
  const path = `/auth/callback${query}${fragment}`
  window.history.replaceState({}, '', path)
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route path="*" element={<Destination />} />
  </Routes></MemoryRouter>)
}
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear()
  window.history.replaceState({}, '', '/')
  mocks.user = { id: 'account-a' }
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'fresh', user: { id: 'account-a' } } }, error: null })
})
describe('implicit auth callbacks', () => {
  it.each([
    ['?next=%2Ftournaments%2Ffinal&error_description=100%25+denied', ''],
    ['?next=%2Ftournaments%2Ffinal', '#error=access_denied&error_description=100%25+denied'],
  ])('handles query and fragment errors once and never reuses a stale session', async (query, fragment) => {
    renderCallback(query, fragment)
    expect(await screen.findByRole('alert')).toHaveTextContent('failed or expired')
    expect(mocks.getSession).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Back to login' }))
    expect(screen.getByTestId('destination')).toHaveTextContent('/login?next=%2Ftournaments%2Ffinal')
  })
  it('returns confirmed sign-in to explicit next in a new tab without storage', async () => {
    renderCallback('?next=%2Ftournaments%2Ffinal', '#access_token=fresh&type=signup')
    expect(await screen.findByTestId('destination')).toHaveTextContent('/tournaments/final')
  })
  it('prefers the explicit next over a stashed destination from another flow', async () => {
    sessionStorage.setItem('rally:auth-return', '/join/acme')
    renderCallback('?next=%2Ftournaments%2Ffinal', '#access_token=fresh&type=signup')
    expect(await screen.findByTestId('destination')).toHaveTextContent('/tournaments/final')
  })
  it('falls back to the stashed destination when the link carries no next', async () => {
    // The unlisted /join/<slug> pages depend on this: a Supabase redirect
    // allowlist that drops the query variant returns a bare /auth/callback.
    sessionStorage.setItem('rally:auth-return', '/join/acme')
    renderCallback('', '#access_token=fresh&type=signup')
    expect(await screen.findByTestId('destination')).toHaveTextContent('/join/acme')
  })
  it('sends an off-origin next home and never falls back to the stash', async () => {
    sessionStorage.setItem('rally:auth-return', '/join/acme')
    renderCallback('?next=https%3A%2F%2Fevil.test', '#access_token=fresh&type=signup')
    expect((await screen.findByTestId('destination')).textContent).toBe('/')
  })
  it('routes recovery links to the password form with the same destination', async () => {
    renderCallback('?next=%2Ftournaments%2Ffinal', '#access_token=fresh&type=recovery')
    expect(await screen.findByTestId('destination')).toHaveTextContent('/set-password?type=recovery&next=%2Ftournaments%2Ffinal verified')
  })
  it('rejects a bare callback or unsupported code instead of accepting an older session', async () => {
    renderCallback('?next=%2Ftournaments%2Ffinal&code=invalid', '')
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't finish")
    expect(mocks.getSession).not.toHaveBeenCalled()
  })
  it('rejects a token link when the SDK still has the old session', async () => {
    renderCallback('?next=%2Ftournaments%2Ffinal', '#access_token=unaccepted')
    expect(await screen.findByRole('alert')).toHaveTextContent('failed or expired')
  })
  it('fails closed on an expired direct reset link even with a saved session', async () => {
    const path = '/set-password?next=%2Ftournaments%2Ffinal#error=access_denied'
    window.history.replaceState({}, '', path)
    render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/set-password" element={<SetPasswordPage />} /><Route path="*" element={<Destination />} /></Routes></MemoryRouter>)
    expect(await screen.findByText('Link expired or already used')).toBeInTheDocument()
    expect(mocks.getSession).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Request new link' }))
    expect(screen.getByTestId('destination')).toHaveTextContent('/auth/forgot-password?next=%2Ftournaments%2Ffinal')
  })
  it('updates a password after a verified recovery callback and returns to the tournament', async () => {
    const path = '/set-password?next=%2Ftournaments%2Ffinal'
    window.history.replaceState({}, '', path)
    render(<MemoryRouter initialEntries={[{ pathname: '/set-password', search: '?next=%2Ftournaments%2Ffinal', state: { recoveryUserId: 'account-a' } }]}><Routes><Route path="/set-password" element={<SetPasswordPage />} /><Route path="*" element={<Destination />} /></Routes></MemoryRouter>)
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('New password'), 'Password1')
    await user.type(screen.getByLabelText('Confirm password'), 'Password1')
    await user.click(screen.getByRole('button', { name: 'Update password' }))
    expect(mocks.updatePassword).toHaveBeenCalledWith('Password1', 'account-a')
    expect(await screen.findByTestId('destination')).toHaveTextContent('/tournaments/final')
  })
  it('expires an open recovered password form when another account signs in', async () => {
    window.history.replaceState({}, '', '/set-password?next=%2Ftournaments%2Ffinal')
    const page = <MemoryRouter initialEntries={[{ pathname: '/set-password', search: '?next=%2Ftournaments%2Ffinal', state: { recoveryUserId: 'account-a' } }]}><SetPasswordPage /></MemoryRouter>
    const view = render(page)
    await userEvent.type(await screen.findByLabelText('New password'), 'Password1')
    mocks.user = { id: 'account-b' }
    view.rerender(<MemoryRouter initialEntries={[{ pathname: '/set-password', search: '?next=%2Ftournaments%2Ffinal', state: { recoveryUserId: 'account-a' } }]}><SetPasswordPage /></MemoryRouter>)
    expect(await screen.findByText('Link expired or already used')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Update password' })).not.toBeInTheDocument()
    expect(mocks.updatePassword).not.toHaveBeenCalled()
  })
  it('rejects an account change between callback and password form initialization', async () => {
    window.history.replaceState({}, '', '/set-password?next=%2Ftournaments%2Ffinal')
    mocks.user = { id: 'account-b' }
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'other', user: mocks.user } }, error: null })
    render(<MemoryRouter initialEntries={[{ pathname: '/set-password', search: '?next=%2Ftournaments%2Ffinal', state: { recoveryUserId: 'account-a' } }]}><SetPasswordPage /></MemoryRouter>)
    expect(await screen.findByText('Link expired or already used')).toBeInTheDocument()
    expect(mocks.updatePassword).not.toHaveBeenCalled()
  })
})
