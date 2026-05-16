import { createContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { isAuthError } from '@/lib/auth'
import { checkEmailExists as apiCheckEmailExists, resendVerificationEmail } from '@/services/api/auth'

export type OAuthProvider = 'google' | 'apple' | 'facebook'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  isLoading: boolean

  checkEmailExists: (email: string) => Promise<boolean>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<{ hasSession: boolean }>
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  resendVerificationEmail: (email: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function isSupabaseAuthError(e: unknown): e is AuthError {
  return !!e && typeof e === 'object' && 'name' in e && (e as AuthError).name === 'AuthApiError'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const didInit = useRef(false)

  // Initial bootstrap + subscription.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

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

    async signUpWithEmail(email, password) {
      // Mobile-parity: empty name fields at signup. Name is collected during the
      // blocking ProfileCompletionModal triggered by the first gated action.
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: '', first_name: '', last_name: '', name: '' },
        },
      })
      if (error) throw error
      return { hasSession: !!data.session }
    },

    async signInWithOAuth(provider) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
      // Browser will navigate away to the provider; control returns at /auth/callback.
    },

    async signOut() {
      await supabase.auth.signOut()
    },

    async requestPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/set-password?type=recovery`,
      })
      // Anti-enumeration: do not surface "user not found" — UI always shows generic success.
      if (error && !isSupabaseAuthError(error)) throw error
    },

    async updatePassword(newPassword) {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    },

    resendVerificationEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
