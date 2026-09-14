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
function renderModal(path = '/tournaments/final') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path={path} element={<AuthGateProvider><OpenModal /><AuthGateModal /></AuthGateProvider>} />
    <Route path="*" element={<Destination />} />
  </Routes></MemoryRouter>)
}
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear()
  auth.checkEmailExists.mockResolvedValue(true)
  auth.signInWithEmail.mockResolvedValue(undefined)
  auth.signUpWithEmail.mockResolvedValue({ hasSession: true })
})
const tab = (name: 'Sign up' | 'Sign in') => screen.getByRole('tab', { name })
const openEmail = (user: ReturnType<typeof userEvent.setup>, mode: 'signin' | 'signup' = 'signin') =>
  user.click(screen.getByRole('button', { name: mode === 'signin' ? 'Sign in with email' : 'Create account with email' }))
async function signIn(user = userEvent.setup(), password = 'old-password') {
  await openEmail(user)
  await user.type(screen.getByLabelText('Email'), 'PLAYER@Example.com')
  await user.type(screen.getByLabelText('Password', { exact: true }), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  return user
}

describe('tabbed sign-up / sign-in flow (full page and modal)', () => {
  it('opens on the sign-in tab, providers first, email behind an expander', async () => {
    renderPage()
    expect(tab('Sign in')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Sign up')).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    // Providers lead; the email form waits behind "Sign in with email".
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Password', { exact: true })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in with email' }))
    expect(screen.getByLabelText('Password', { exact: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeInTheDocument()
  })

  it('ignores a stale tournament return on a fresh direct login', async () => {
    sessionStorage.setItem('rally:auth-return', '/tournaments/old')
    renderPage('/login')
    await signIn()
    expect(await screen.findByTestId('destination')).toHaveTextContent(/^\/$/)
    expect(sessionStorage.getItem('rally:auth-return')).toBeNull()
  })

  it('signs an existing player in and returns to the tournament', async () => {
    renderPage()
    await signIn()
    expect(auth.checkEmailExists).toHaveBeenCalledWith('player@example.com')
    expect(auth.signInWithEmail).toHaveBeenCalledWith('player@example.com', 'old-password')
    expect(await screen.findByTestId('destination')).toHaveTextContent('/tournaments/final')
  })

  it('the sign-up tab creates the account and returns directly when a session comes back', async () => {
    auth.checkEmailExists.mockResolvedValue(false)
    renderPage()
    const user = userEvent.setup()
    await user.click(tab('Sign up'))
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign up with Google' })).toBeInTheDocument()
    await openEmail(user, 'signup')
    await user.type(screen.getByLabelText('Email'), 'PLAYER@Example.com')
    await user.type(screen.getByLabelText('Create a password'), 'Password1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(auth.signUpWithEmail).toHaveBeenCalledWith('player@example.com', 'Password1', '/tournaments/final')
    expect(await screen.findByTestId('destination')).toHaveTextContent('/tournaments/final')
  })

  it('an unknown email on the sign-in tab still submits, then offers the sign-up tab', async () => {
    // The hint is a shortcut, never a gate: `checkEmailExists` reads rally_users,
    // not Supabase, so a player it does not know can still have a real account.
    // Supabase is the authority — here it declines, so the player sees both.
    auth.checkEmailExists.mockResolvedValue(false)
    auth.signInWithEmail.mockRejectedValue({ code: 'invalid_credentials' })
    renderPage()
    const user = await signIn()
    expect(auth.signInWithEmail).toHaveBeenCalledWith('player@example.com', 'old-password')
    expect(await screen.findByRole('status')).toHaveTextContent("We couldn't find a Rally account for player@example.com.")
    await user.click(screen.getByRole('button', { name: 'Create one instead' }))
    expect(tab('Sign up')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Email')).toHaveValue('PLAYER@Example.com')
    expect(screen.getByLabelText('Create a password')).toHaveValue('')
  })

  it('a known email on the sign-up tab still submits, then offers the sign-in tab', async () => {
    renderPage()
    const user = userEvent.setup()
    auth.signUpWithEmail.mockRejectedValue({ code: 'user_already_exists' })
    await user.click(tab('Sign up'))
    await openEmail(user, 'signup')
    await user.type(screen.getByLabelText('Email'), 'player@example.com')
    await user.type(screen.getByLabelText('Create a password'), 'Password1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(auth.signUpWithEmail).toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent('player@example.com already has a Rally account.')
    await user.click(screen.getByRole('button', { name: 'Sign in instead' }))
    expect(tab('Sign in')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Email')).toHaveValue('player@example.com')
  })

  it('a signup whose email the lookup claims exists is still attempted', async () => {
    // The rally_users lookup is not Supabase. A player with a rally_users row and
    // no auth user was blocked here, and every recovery path was shut to them:
    // sign-in gives invalid credentials, forgot-password reports success and
    // sends nothing. Two such rows exist on dev.
    auth.checkEmailExists.mockResolvedValue(true)
    renderPage()
    const user = userEvent.setup()
    await user.click(tab('Sign up'))
    await openEmail(user, 'signup')
    await user.type(screen.getByLabelText('Email'), 'orphan@example.com')
    await user.type(screen.getByLabelText('Create a password'), 'Password1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(auth.signUpWithEmail).toHaveBeenCalledWith('orphan@example.com', 'Password1', '/tournaments/final')
    expect(await screen.findByTestId('destination')).toHaveTextContent('/tournaments/final')
  })

  it('a failed lookup still lets the password through', async () => {
    auth.checkEmailExists.mockRejectedValue(new Error('offline'))
    renderPage()
    await signIn(undefined, 'Old1pass')
    expect(auth.signInWithEmail).toHaveBeenCalledWith('player@example.com', 'Old1pass')
    expect(await screen.findByTestId('destination')).toHaveTextContent('/tournaments/final')
  })

  it('a wrong password shows the error; switching tabs clears it and the password', async () => {
    auth.signInWithEmail.mockRejectedValue({ code: 'invalid_credentials' })
    renderPage()
    const user = await signIn(undefined, 'Wrong1pass')
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password')
    await user.click(tab('Sign up'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Create a password')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('PLAYER@Example.com')
  })

  it('forgot password leaves with the typed email and the tournament next', async () => {
    renderPage()
    const user = userEvent.setup()
    await openEmail(user)
    await user.type(screen.getByLabelText('Email'), 'player@example.com')
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument())
    expect(sessionStorage.getItem('rally:auth-return')).toBe('/tournaments/final')
  })

  it('the phone recovery is a sub-step of sign in, with a way back', async () => {
    renderPage()
    const user = userEvent.setup()
    // Visible beside the providers, NOT behind the email form: a legacy
    // phone-only player has no email to open that form with.
    await user.click(screen.getByRole('button', { name: 'Existing player? Recover with phone' }))
    expect(screen.getByLabelText('Phone number')).toBeInTheDocument()
    // The tabs leave with the form — a tablist pointing at a panel that is not
    // rendered is a lie to a screen reader.
    expect(screen.queryByRole('tab', { name: 'Sign in' })).not.toBeInTheDocument()
    // The login page has its own Back arrow; the phone step's is the last one.
    const backButtons = screen.getAllByRole('button', { name: 'Back' })
    await user.click(backButtons[backButtons.length - 1])
    expect(screen.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true')
    await openEmail(user)
    expect(screen.getByLabelText('Password', { exact: true })).toBeInTheDocument()
  })

  it('opens the real modal with the same flow and returns verification to the tournament', async () => {
    auth.checkEmailExists.mockResolvedValue(false)
    auth.signUpWithEmail.mockResolvedValue({ hasSession: false })
    renderModal()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Join tournament' }))
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Continue your tournament registration')
    expect(tab('Sign in')).toHaveAttribute('aria-selected', 'true')
    await user.click(tab('Sign up'))
    await openEmail(user, 'signup')
    await user.type(screen.getByLabelText('Email'), 'PLAYER@Example.com')
    await user.type(screen.getByLabelText('Create a password'), 'Password1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    const dest = await screen.findByTestId('destination')
    expect(dest).toHaveTextContent('/auth/verify-email?email=player%40example.com&next=%2Ftournaments%2Ffinal')
  })

  it('the modal opens on the sign-up tab from a corporate /join link', async () => {
    renderModal('/join/acme')
    await userEvent.click(screen.getByRole('button', { name: 'Join tournament' }))
    expect(tab('Sign up')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
  })

  it.each(['Google', 'Apple', 'Facebook'])('passes tournament next explicitly to %s OAuth on either tab', async (provider) => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: `Sign in with ${provider}` }))
    expect(auth.signInWithOAuth).toHaveBeenCalledWith(provider.toLowerCase(), '/tournaments/final')
    auth.signInWithOAuth.mockClear()
    await user.click(tab('Sign up'))
    await user.click(screen.getByRole('button', { name: `Sign up with ${provider}` }))
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
