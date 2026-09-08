import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Apple, Facebook } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { SocialButton } from './SocialButton'
import type { OAuthProvider } from '@/contexts/AuthContext'
import { authErrorKey } from './authError'
import { trackFunnel } from '@/lib/analytics'

export type AuthMode = 'signin' | 'signup'

interface AuthOptionsStepProps {
  onContinueWithEmail: () => void
  onContinueWithPhone: () => void
  next: string
}

export function AuthOptionsStep({ onContinueWithEmail, onContinueWithPhone, next }: AuthOptionsStepProps) {
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

  return (
    <div className="space-y-3">
      <SocialButton
        provider="google"
        label={t('auth.continue_google') || 'Continue with Google'}
        icon={<GoogleIcon />}
        onClick={() => handleOAuth('google')}
        disabled={pending !== null}
      />
      <SocialButton provider="apple" label={t('auth.continue_apple')} icon={<Apple size={18} />} onClick={() => handleOAuth('apple')} disabled={pending !== null} />
      <SocialButton provider="facebook" label={t('auth.continue_facebook')} icon={<Facebook size={18} />} onClick={() => handleOAuth('facebook')} disabled={pending !== null} />

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
        <div className="relative flex justify-center"><span className="bg-slate-900 px-3 text-xs text-slate-500">{t('auth.or') || 'or'}</span></div>
      </div>

      <button
        type="button"
        onClick={onContinueWithEmail}
        disabled={pending !== null}
        className="w-full flex items-center justify-center gap-3 rounded-md bg-rally-accent px-4 py-2.5 text-sm font-semibold text-rally-accent-text hover:bg-rally-accent-hover transition-colors disabled:opacity-50"
      >
        <Mail size={18} />
        <span>{t('auth.continue_email')}</span>
      </button>

      <button
        type="button"
        onClick={onContinueWithPhone}
        disabled={pending !== null}
        className="w-full flex items-center justify-center gap-3 rounded-md border border-white/10 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-50 hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        <span>{t('auth.phone.recover')}</span>
      </button>

      {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
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
