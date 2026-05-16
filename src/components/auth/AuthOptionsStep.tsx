import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { SocialButton } from './SocialButton'
import type { OAuthProvider } from '@/contexts/AuthContext'

interface AuthOptionsStepProps {
  onContinueWithEmail: () => void
}

export function AuthOptionsStep({ onContinueWithEmail }: AuthOptionsStepProps) {
  const { t } = useTranslation()
  const { signInWithOAuth } = useAuth()
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleOAuth = async (provider: OAuthProvider) => {
    setError(null)
    setPending(provider)
    try {
      await signInWithOAuth(provider)
      // Browser navigates away; if it doesn't, we re-enable the buttons.
    } catch (e: any) {
      setError(e?.message ?? 'Sign-in failed')
      setPending(null)
    }
  }

  return (
    <div className="space-y-3">
      <SocialButton
        provider="google"
        label={t('auth.continue_google') || 'Continue with Google'}
        icon={<GoogleIcon />}
        onClick={() => handleOAuth('google')}
        disabled={pending !== null}
      />
      <SocialButton
        provider="apple"
        label={t('auth.continue_apple') || 'Continue with Apple'}
        icon={<AppleIcon />}
        onClick={() => handleOAuth('apple')}
        disabled={pending !== null}
      />
      <SocialButton
        provider="facebook"
        label={t('auth.continue_facebook') || 'Continue with Facebook'}
        icon={<FacebookIcon />}
        onClick={() => handleOAuth('facebook')}
        disabled={pending !== null}
      />

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
        <div className="relative flex justify-center"><span className="bg-slate-900 px-3 text-xs text-slate-500">{t('auth.or') || 'or'}</span></div>
      </div>

      <button
        type="button"
        onClick={onContinueWithEmail}
        disabled={pending !== null}
        className="w-full flex items-center justify-center gap-3 rounded-md border border-white/10 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-50 hover:bg-slate-700 disabled:opacity-50"
      >
        <Mail size={18} />
        <span>{t('auth.continue_email') || 'Continue with email'}</span>
      </button>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}

// Minimal inline icons. Replace with branded SVGs later if needed.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M12 10v3.8h5.4c-.2 1.3-1.5 3.7-5.4 3.7-3.3 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.8 0 3.1.8 3.8 1.5l2.6-2.5C16.6 3 14.5 2 12 2 6.9 2 2.8 6.1 2.8 11.5S6.9 21 12 21c6.9 0 9.2-4.8 9.2-7.3 0-.5-.1-.9-.1-1.3H12z"/>
    </svg>
  )
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.4c0-2.8 2.3-4.1 2.4-4.2-1.3-1.9-3.3-2.2-4-2.2-1.7-.2-3.3 1-4.2 1-.8 0-2.2-1-3.6-1-1.9 0-3.6 1.1-4.6 2.8-2 3.4-.5 8.5 1.4 11.3.9 1.4 2 2.9 3.4 2.8 1.4-.1 1.9-.9 3.6-.9 1.7 0 2.1.9 3.6.9 1.5 0 2.4-1.4 3.3-2.7 1.1-1.6 1.5-3.1 1.5-3.2 0-.1-2.8-1.1-2.8-4.6zM13.7 4.1c.8-.9 1.3-2.2 1.1-3.5-1.1.1-2.5.8-3.3 1.7-.7.8-1.4 2.1-1.2 3.4 1.2.1 2.5-.6 3.4-1.6z"/>
    </svg>
  )
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12c0 5 3.7 9.1 8.4 9.9V15h-2.5v-3h2.5v-2.2c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 3h-2.4v6.9C18.3 21.1 22 17 22 12z"/>
    </svg>
  )
}
