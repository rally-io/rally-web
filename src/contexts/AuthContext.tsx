import { createContext, useEffect, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { isAuthError } from '@/lib/auth'
import { checkEmailExists as apiCheckEmailExists, resendVerificationEmail, updateAccountPassword } from '@/services/api/auth'
import { authPath, getAuthReturnTo } from '@/lib/authReturn'

export type OAuthProvider = 'google' | 'apple' | 'facebook'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  isLoading: boolean

  checkEmailExists: (email: string) => Promise<boolean>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, next?: string) => Promise<{ hasSession: boolean }>
  signInWithOAuth: (provider: OAuthProvider, next?: string) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string, next?: string) => Promise<void>
  updatePassword: (newPassword: string, expectedUserId?: string) => Promise<void>
  resendVerificationEmail: (email: string, next?: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initial bootstrap + subscription. Deliberately no "run once" ref guard here:
  // under React 18 StrictMode, dev mounts this effect, runs its cleanup, then
  // mounts it again. A guard that skips the second run also skips resubscribing
  // — the first subscription was already torn down by the cleanup in between,
  // so the app is left with NO onAuthStateChange listener at all: sign-in still
  // succeeds against Supabase, but nothing in the UI ever reflects it again.
  // Subscribing fresh on every effect run is safe — cleanup unsubscribes the
  // previous one each time — so there is exactly one live subscription always.
  useEffect(() => {
    // Subscribe first so detectSessionInUrl's SIGNED_IN event is never missed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    ;(async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error && isAuthError(error.message)) {
          await supabase.auth.signOut({ scope: 'local' })
          setSession(null)
        } else {
          setSession(data.session)
        }
      } finally {
        setIsLoading(false)
      }
    })()

    return () => { subscription.unsubscribe() }
  }, [])

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    isLoading,

    checkEmailExists: (email) => apiCheckEmailExists(email),

    async signInWithEmail(email, password) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) throw error
    },

    async signUpWithEmail(email, password, next = getAuthReturnTo()) {
      // Mobile-parity: empty name fields at signup. Name is collected on the
      // /profile/edit page after the user lands in the app.
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: window.location.origin + authPath('/auth/callback', next),
          data: { full_name: '', first_name: '', last_name: '', name: '' },
        },
      })
      if (error) throw error
      return { hasSession: !!data.session }
    },

    async signInWithOAuth(provider, next = getAuthReturnTo()) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + authPath('/auth/callback', next, { method: provider }) },
      })
      if (error) throw error
      // Browser will navigate away to the provider; control returns at /auth/callback.
    },

    async signOut() {
      await supabase.auth.signOut()
      // Force the batched setSession(null) (queued by onAuthStateChange during
      // signOut) to flush synchronously. Without this, React 18 defers the state
      // update, so navigate('/') in the caller renders the Navbar with the old
      // session still intact.
      flushSync(() => setSession(null))
    },

    async requestPasswordReset(email, next = getAuthReturnTo()) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin + authPath('/auth/callback', next, { type: 'recovery' }),
      })
      // Anti-enumeration: do not surface "user not found" — UI always shows generic success.
      if (error && error.code !== 'user_not_found') throw error
    },

    updatePassword: updateAccountPassword,

    resendVerificationEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
