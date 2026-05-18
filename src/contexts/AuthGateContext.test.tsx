import { describe, it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext'
import { AuthGateProvider, useAuthGateInternals } from './AuthGateContext'
import { useAuthGate } from '@/hooks/useAuthGate'

type FakeSession = AuthContextValue['session']

function makeAuthValue(session: FakeSession): AuthContextValue {
  return {
    session,
    user: session?.user ?? null,
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

function Harness({ initialSession, children }: { initialSession: FakeSession; children: ReactNode }) {
  const [session, setSession] = useState<FakeSession>(initialSession)
  ;(globalThis as any).__setSession = setSession
  return (
    <AuthContext.Provider value={makeAuthValue(session)}>
      <AuthGateProvider>{children}</AuthGateProvider>
    </AuthContext.Provider>
  )
}

describe('AuthGateContext', () => {
  it('requireSignIn resolves immediately when already signed in', async () => {
    const fakeSession = { user: { id: 'u1' } } as unknown as FakeSession
    const { result } = renderHook(() => useAuthGate(), {
      wrapper: ({ children }) => <Harness initialSession={fakeSession}>{children}</Harness>,
    })
    await expect(result.current.requireSignIn()).resolves.toBeUndefined()
  })

  it('opens the modal when signed out and resolves when session arrives', async () => {
    const { result } = renderHook(
      () => ({ gate: useAuthGate(), internals: useAuthGateInternals() }),
      { wrapper: ({ children }) => <Harness initialSession={null}>{children}</Harness> },
    )

    let promise!: Promise<void>
    act(() => {
      promise = result.current.gate.requireSignIn()
    })
    expect(result.current.internals.open).toBe(true)

    act(() => {
      ;(globalThis as any).__setSession({ user: { id: 'u1' } })
    })

    await expect(promise).resolves.toBeUndefined()
    expect(result.current.internals.open).toBe(false)
  })

  it('rejects with USER_CANCELLED when the user dismisses the modal', async () => {
    const { result } = renderHook(
      () => ({ gate: useAuthGate(), internals: useAuthGateInternals() }),
      { wrapper: ({ children }) => <Harness initialSession={null}>{children}</Harness> },
    )

    let promise!: Promise<void>
    act(() => {
      promise = result.current.gate.requireSignIn()
    })

    act(() => {
      result.current.internals.cancel()
    })

    await expect(promise).rejects.toThrow('USER_CANCELLED')
    expect(result.current.internals.open).toBe(false)
  })
})
