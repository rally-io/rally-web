import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
      <SocialButton provider="apple" label={label('Apple')} icon={<AppleIcon />} onClick={() => handleOAuth('apple')} disabled={pending !== null} />
      <SocialButton provider="facebook" label={label('Facebook')} icon={<FacebookIcon />} onClick={() => handleOAuth('facebook')} disabled={pending !== null} />
      {error && <p role="alert" className="text-sm text-rally-error">{error}</p>}
    </div>
  )
}

// Brand marks: the four-colour Google "G" (same paths as rally-mobile's
// GoogleColorLogo), and the Apple and Facebook logos from Simple Icons. Apple
// and Facebook fill with currentColor so they take the button's white text.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#4285F4" d="M23 12.245c0-.905-.075-1.565-.236-2.25h-10.54v4.083h6.186c-.124 1.014-.797 2.542-2.294 3.569l-.021.136 3.332 2.53.23.022C21.779 18.417 23 15.593 23 12.245z" />
      <path fill="#34A853" d="M12.225 23c3.03 0 5.574-.978 7.433-2.665l-3.542-2.688c-.948.648-2.22 1.1-3.891 1.1a6.745 6.745 0 01-6.386-4.572l-.132.011-3.465 2.628-.045.124C4.043 20.531 7.835 23 12.225 23z" />
      <path fill="#FBBC05" d="M5.84 14.175A6.65 6.65 0 015.463 12c0-.758.138-1.491.361-2.175l-.006-.147-3.508-2.67-.115.054A10.831 10.831 0 001 12c0 1.772.436 3.447 1.197 4.938l3.642-2.763z" />
      <path fill="#EB4335" d="M12.225 5.253c2.108 0 3.529.892 4.34 1.638l3.167-3.031C17.787 2.088 15.255 1 12.225 1 7.834 1 4.043 3.469 2.197 7.062l3.63 2.763a6.77 6.77 0 016.398-4.572z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  )
}
