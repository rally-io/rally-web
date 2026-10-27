import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/hooks/useAuth'

export interface AuthGateContextValue {
  requireSignIn: () => Promise<void>
}

interface AuthGateInternals {
  open: boolean
  cancel: () => void
  // The modal's flow continues on a full auth page (email verification, forgot
  // password): the modal closes and requireSignIn() rejects with
  // LEFT_FOR_AUTH_PAGE, not USER_CANCELLED, so a caller can keep what the round
  // trip needs (the /elections ballot, cast when the verification link returns).
  leave: () => void
  // Called when the modal's own sign-in/sign-up flow just succeeded — resolves
  // the pending requireSignIn() promise directly instead of waiting on the
  // `open && session` effect below, which can lose the race against a modal
  // step that closes itself in the same synchronous callback (see cancel()).
  confirmSignIn: () => void
}

export const AuthGateContext = createContext<AuthGateContextValue | null>(null)
const AuthGateInternalsContext = createContext<AuthGateInternals | null>(null)

export function useAuthGateInternals(): AuthGateInternals {
  const ctx = useContext(AuthGateInternalsContext)
  if (!ctx) throw new Error('useAuthGateInternals must be used inside <AuthGateProvider>')
  return ctx
}

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const pendingRef = useRef<{ resolve: () => void; reject: (e: unknown) => void } | null>(null)

  useEffect(() => {
    if (open && session) {
      setOpen(false)
      pendingRef.current?.resolve()
      pendingRef.current = null
    }
  }, [open, session])

  const requireSignIn = useCallback((): Promise<void> => {
    if (session) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      pendingRef.current?.reject(new Error('SUPERSEDED'))
      pendingRef.current = { resolve, reject }
      setOpen(true)
    })
  }, [session])

  const cancel = useCallback(() => {
    setOpen(false)
    pendingRef.current?.reject(new Error('USER_CANCELLED'))
    pendingRef.current = null
  }, [])

  const leave = useCallback(() => {
    setOpen(false)
    pendingRef.current?.reject(new Error('LEFT_FOR_AUTH_PAGE'))
    pendingRef.current = null
  }, [])

  const confirmSignIn = useCallback(() => {
    setOpen(false)
    pendingRef.current?.resolve()
    pendingRef.current = null
  }, [])

  const value = useMemo<AuthGateContextValue>(() => ({ requireSignIn }), [requireSignIn])
  const internals = useMemo<AuthGateInternals>(
    () => ({ open, cancel, leave, confirmSignIn }),
    [open, cancel, leave, confirmSignIn],
  )

  return (
    <AuthGateContext.Provider value={value}>
      <AuthGateInternalsContext.Provider value={internals}>
        {children}
      </AuthGateInternalsContext.Provider>
    </AuthGateContext.Provider>
  )
}
