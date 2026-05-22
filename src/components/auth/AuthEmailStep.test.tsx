import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext'
import { AuthEmailStep } from './AuthEmailStep'

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    session: null,
    user: null,
    isLoading: false,
    checkEmailExists: vi.fn().mockResolvedValue(false),
    signInWithEmail: vi.fn().mockResolvedValue(undefined),
    signUpWithEmail: vi.fn().mockResolvedValue({ hasSession: false }),
    signInWithOAuth: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    resendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function wrap(ui: ReactNode, auth = makeAuthValue()) {
  const qc = new QueryClient()
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthContext.Provider value={auth}>{ui}</AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AuthEmailStep', () => {
  it('shows signup subtitle in signup mode and hides forgot-password link', () => {
    render(
      wrap(
        <AuthEmailStep
          mode="signup"
          onBack={vi.fn()}
          onContinue={vi.fn()}
          onForgotPassword={vi.fn()}
        />,
      ),
    )
    expect(screen.getByText(/set up your account/i)).toBeInTheDocument()
    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument()
  })

  it('shows signin subtitle in signin mode and reveals forgot-password link', () => {
    render(
      wrap(
        <AuthEmailStep
          mode="signin"
          onBack={vi.fn()}
          onContinue={vi.fn()}
          onForgotPassword={vi.fn()}
        />,
      ),
    )
    expect(screen.getByText(/tied to your Rally account/i)).toBeInTheDocument()
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })

  it('passes the userExists result through to onContinue', async () => {
    const onContinue = vi.fn()
    const auth = makeAuthValue({
      checkEmailExists: vi.fn().mockResolvedValue(true),
    })
    render(
      wrap(
        <AuthEmailStep
          mode="signup"
          onBack={vi.fn()}
          onContinue={onContinue}
          onForgotPassword={vi.fn()}
        />,
        auth,
      ),
    )

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(onContinue).toHaveBeenCalledWith('existing@example.com', true)
  })
})
