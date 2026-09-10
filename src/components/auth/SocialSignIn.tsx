import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Apple, Facebook } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { OAuthProvider } from '@/contexts/AuthContext'
import { SocialButton } from './SocialButton'
import { authErrorKey } from './authError'
import { trackFunnel } from '@/lib/analytics'
import type { AuthMode } from './AuthTabs'

/**
 * The three providers, stacked and full width — they are the primary way in
 * on both tabs. The same OAuth call serves sign up and sign in (Supabase
 * creates the account on first use), so only the label changes with the mode.
 */
export function SocialSignIn({ mode, next }: { mode: AuthMode; next: string }) {
  const { t } = useTranslation()
  const { signInWithOAuth } = useAuth()
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleOAuth = async (provider: OAuthProvider) => {
    if (pending) return
    setError(null)
    setPending(provider)
    try {
      trackFunnel('auth_started', { method: provider })
      await signInWithOAuth(provider, next)
    } catch (e: unknown) {
      setError(t(authErrorKey(e)))
      trackFunnel('auth_error', { method: provider, step: 'oauth' })
      setPending(null)
    }
  }

  const label = (provider: string) =>
    t(mode === 'signin' ? 'auth.signin_with_provider' : 'auth.signup_with_provider', { provider })

  return (
    <div className="space-y-2">
      <SocialButton provider="google" label={label('Google')} icon={<GoogleIcon />} onClick={() => handleOAuth('google')} disabled={pending !== null} />
      <SocialButton provider="apple" label={label('Apple')} icon={<Apple size={18} />} onClick={() => handleOAuth('apple')} disabled={pending !== null} />
      <SocialButton provider="facebook" label={label('Facebook')} icon={<Facebook size={18} />} onClick={() => handleOAuth('facebook')} disabled={pending !== null} />
      {error && <p role="alert" className="text-sm text-rally-error">{error}</p>}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M12 10v3.8h5.4c-.2 1.3-1.5 3.7-5.4 3.7-3.3 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.8 0 3.1.8 3.8 1.5l2.6-2.5C16.6 3 14.5 2 12 2 6.9 2 2.8 6.1 2.8 11.5S6.9 21 12 21c6.9 0 9.2-4.8 9.2-7.3 0-.5-.1-.9-.1-1.3H12z"/>
    </svg>
  )
}
