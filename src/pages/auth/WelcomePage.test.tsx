import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext'
import WelcomePage from './WelcomePage'

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

function wrap(ui: ReactNode, auth: AuthContextValue, initialPath = '/auth/welcome') {
  const qc = new QueryClient()
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthContext.Provider value={auth}>
          <Routes>
            <Route path="/auth/welcome" element={ui} />
            <Route path="/login" element={<div data-testid="login-route">login</div>} />
            <Route path="/" element={<div data-testid="home-route">home</div>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('WelcomePage', () => {
  it('redirects to /login when no session is present', async () => {
    render(wrap(<WelcomePage />, makeAuthValue()))
    await waitFor(() => {
      expect(screen.getByTestId('login-route')).toBeInTheDocument()
    })
  })

  it('navigates to / when CTA is clicked with an active session', async () => {
    const session = { user: { id: 'u1', email: 'x@example.com' } } as any
    render(wrap(<WelcomePage />, makeAuthValue({ session, user: session.user })))

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /continue to rally/i }))

    await waitFor(() => {
      expect(screen.getByTestId('home-route')).toBeInTheDocument()
    })
  })
})
