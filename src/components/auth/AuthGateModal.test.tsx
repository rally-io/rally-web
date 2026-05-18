import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext'
import { AuthGateProvider } from '@/contexts/AuthGateContext'
import { AuthGateModal } from './AuthGateModal'

function makeAuthValue(): AuthContextValue {
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
  }
}

function wrap(ui: ReactNode) {
  const qc = new QueryClient()
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthContext.Provider value={makeAuthValue()}>
          <AuthGateProvider>{ui}</AuthGateProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AuthGateModal', () => {
  it('is not in the DOM when closed', () => {
    render(wrap(<AuthGateModal />))
    expect(screen.queryByText('Sign in to continue')).not.toBeInTheDocument()
  })
})
