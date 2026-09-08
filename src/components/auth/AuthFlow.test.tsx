import { useContext } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import '@/i18n'
import { AuthGateContext, AuthGateProvider } from '@/contexts/AuthGateContext'
import { AuthGateModal } from './AuthGateModal'
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage'

const auth = vi.hoisted(() => ({
  session: null, isLoading: false,
  checkEmailExists: vi.fn(), signInWithEmail: vi.fn(), signUpWithEmail: vi.fn(),
  signInWithOAuth: vi.fn(), requestPasswordReset: vi.fn(), resendVerificationEmail: vi.fn(),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('@/services/api/auth', () => ({ requestPhoneOtp: vi.fn(), verifyPhoneOtp: vi.fn() }))

function Destination() { const location = useLocation(); return <div data-testid="destination">{location.pathname + location.search}</div> }
function OpenModal() {
  const gate = useContext(AuthGateContext)!
  return <button onClick={() => { void gate.requireSignIn().catch(() => {}) }}>Join tournament</button>
}
function renderPage(path = '/login?next=%2Ftournaments%2Ffinal') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
    <Route path="*" element={<Destination />} />
  </Routes></MemoryRouter>)
}
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear()
  auth.checkEmailExists.mockResolvedValue(true)
  auth.signInWithEmail.mockResolvedValue(undefined)
  auth.signUpWithEmail.mockResolvedValue({ hasSession: true })
})
async function enterEmail() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Continue with email' }))
  await user.type(screen.getByLabelText('Email'), 'PLAYER@Example.com')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  return user
}
describe('shared full-page and modal auth flow', () => {
  it('ignores a stale tournament return on a fresh direct login', async () => {
    sessionStorage.setItem('rally:auth-return', '/tournaments/old')
    renderPage('/login')
    const user = await enterEmail()
    await user.type(screen.getByLabelText('Password', { exact: true }), 'old-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByTestId('destination')).toHaveTextContent(/^\/$/)
    expect(sessionStorage.getItem('rally:auth-return')).toBeNull()
  })
  it('signs an existing player in and returns to the tournament', async () => {
    renderPage()
    const user = await enterEmail()
    expect(auth.checkEmailExists).toHaveBeenCalledWith('player@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'old-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(auth.signInWithEmail).toHaveBeenCalledWith('player@example.com', 'old-password')
    expect(await screen.findByTestId('destination')).toHaveTextContent('/tournaments/final')
  })
  it('derives signup from lookup and returns directly when signup has a session', async () => {
    auth.checkEmailExists.mockResolvedValue(false)
    renderPage()
    const user = await enterEmail()
    await user.type(screen.getByLabelText('Create a password'), 'Password1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(auth.signUpWithEmail).toHaveBeenCalledWith('player@example.com', 'Password1', '/tournaments/final')
    expect(await screen.findByTestId('destination')).toHaveTextContent('/tournaments/final')
  })
  it('allows password sign-in and explicit signup switching after lookup failure', async () => {
    auth.checkEmailExists.mockRejectedValue(new Error('offline'))
    renderPage()
    const user = await enterEmail()
    await user.click(screen.getByRole('button', { name: 'Continue with password' }))
    await user.type(screen.getByLabelText('Password', { exact: true }), 'Old1pass')
    await user.click(screen.getByRole('button', { name: 'Create one instead' }))
    expect(screen.getByLabelText('Create a password')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Sign in instead' }))
    await user.type(screen.getByLabelText('Password', { exact: true }), 'Old1pass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByTestId('destination')).toHaveTextContent('/tournaments/final')
  })
  it('clears errors and passwords on a wrong-branch switch and remembers email on back', async () => {
    auth.signInWithEmail.mockRejectedValue({ code: 'invalid_credentials' })
    renderPage()
    const user = await enterEmail()
    await user.type(screen.getByLabelText('Password', { exact: true }), 'Wrong1pass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password')
    await user.click(screen.getByRole('button', { name: 'Create one instead' }))
    expect(screen.getByLabelText('Create a password')).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    const backButtons = screen.getAllByRole('button', { name: 'Back' })
    await user.click(backButtons[backButtons.length - 1])
    expect(screen.getByLabelText('Email')).toHaveValue('player@example.com')
  })
  it('opens the real modal with the same flow and returns verification to the tournament', async () => {
    auth.checkEmailExists.mockResolvedValue(false)
    auth.signUpWithEmail.mockResolvedValue({ hasSession: false })
    render(<MemoryRouter initialEntries={['/tournaments/final']}><Routes>
      <Route path="/tournaments/final" element={<AuthGateProvider><OpenModal /><AuthGateModal /></AuthGateProvider>} />
      <Route path="*" element={<Destination />} />
    </Routes></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Join tournament' }))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Continue your tournament registration')
    const user = await enterEmail()
    await user.type(screen.getByLabelText('Create a password'), 'Password1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    const dest = await screen.findByTestId('destination')
    expect(dest).toHaveTextContent('/auth/verify-email?email=player%40example.com&next=%2Ftournaments%2Ffinal')
  })
  it.each(['Google', 'Apple', 'Facebook'])('passes tournament next explicitly to %s OAuth', async provider => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: `Sign in with ${provider}` }))
    expect(auth.signInWithOAuth).toHaveBeenCalledWith(provider.toLowerCase(), '/tournaments/final')
  })
  it('shows reset transport failures, allows retry and retains next on back', async () => {
    auth.requestPasswordReset.mockRejectedValueOnce({ code: 'NETWORK_ERROR' }).mockResolvedValue(undefined)
    renderPage('/auth/forgot-password?email=player%40example.com&next=%2Ftournaments%2Ffinal')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection problem')
    expect(screen.queryByText(/If an account exists/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('player@example.com', '/tournaments/final')
    await user.click(screen.getByRole('button', { name: 'Back to login' }))
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveValue('player@example.com'))
    expect(sessionStorage.getItem('rally:auth-return')).toBe('/tournaments/final')
  })
})
