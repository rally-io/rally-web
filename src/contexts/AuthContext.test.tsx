import { StrictMode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from './AuthContext'
import { useAuth } from '@/hooks/useAuth'

const onAuthStateChangeMock = vi.fn()
const getSessionMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
      getSession: (...args: unknown[]) => getSessionMock(...args),
      signOut: vi.fn(),
    },
  },
}))

function SessionProbe() {
  const { session } = useAuth()
  return <div data-testid="session-probe">{session ? 'signed-in' : 'signed-out'}</div>
}

beforeEach(() => {
  getSessionMock.mockResolvedValue({ data: { session: null }, error: null })
})

describe('AuthProvider — onAuthStateChange subscription survives StrictMode', () => {
  it('still reacts to a sign-in event after React 18 StrictMode double-mounts the effect', async () => {
    // Track every listener registered so we can tell whether the SECOND
    // (StrictMode remount) registration actually happened, and drive whichever
    // one is still alive the same way Supabase itself would.
    const listeners: Array<(event: string, session: unknown) => void> = []
    const unsubscribeMocks: ReturnType<typeof vi.fn>[] = []
    onAuthStateChangeMock.mockImplementation((cb: (event: string, session: unknown) => void) => {
      listeners.push(cb)
      const unsubscribe = vi.fn()
      unsubscribeMocks.push(unsubscribe)
      return { data: { subscription: { unsubscribe } } }
    })

    render(
      <StrictMode>
        <AuthProvider>
          <SessionProbe />
        </AuthProvider>
      </StrictMode>,
    )

    await screen.findByText('signed-out')

    // StrictMode's dev-only mount→cleanup→mount means at least one listener
    // registration's subscription got torn down; find the one that is still
    // live (unsubscribe not yet called) and fire a sign-in through it —
    // that's exactly what Supabase does internally on a real sign-in.
    const liveIndex = unsubscribeMocks.findIndex((u) => u.mock.calls.length === 0)
    expect(liveIndex).toBeGreaterThanOrEqual(0)

    listeners[liveIndex]('SIGNED_IN', { user: { id: 'u1' } })

    await waitFor(() => {
      expect(screen.getByTestId('session-probe').textContent).toBe('signed-in')
    })
  })
})
