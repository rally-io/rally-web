import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail } from 'lucide-react'
import { AuthTabs, type AuthMode } from './AuthTabs'
import { AuthCredentialsForm } from './AuthCredentialsForm'
import { SocialSignIn } from './SocialSignIn'
import { AuthPhoneStep } from './AuthPhoneStep'
import { authPath, clearAuthReturnTo, rememberAuthReturnTo, safeReturnTo } from '@/lib/authReturn'
import { trackFunnel } from '@/lib/analytics'

/**
 * Sign up | Sign in as two tabs over one card. On both tabs the providers
 * (Google / Apple / Facebook) are the headline actions; the email form sits
 * behind "continue with email" so it never competes with them, and opens on
 * its own when the player arrives with an email (back from a reset link) or is
 * sent to the other tab by the wrong-door hint. The phone recovery lives under
 * the email form on Sign in as a sub-step.
 */
export function AuthFlow({ next, onSuccess, onLeave = () => {}, initialEmail = '', initialMode = 'signin' }: {
  next: string
  onSuccess: () => void
  onLeave?: () => void
  initialEmail?: string
  initialMode?: AuthMode
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [step, setStep] = useState<'form' | 'phone'>('form')
  const [email, setEmail] = useState(initialEmail)
  const [emailOpen, setEmailOpen] = useState(initialEmail.length > 0)
  // Focus belongs to the act that opened the form, never to a bare tab click.
  const [focusOnOpen, setFocusOnOpen] = useState(false)
  const openEmailForm = () => {
    if (emailOpen) return
    setEmailOpen(true)
    setFocusOnOpen(true)
    trackFunnel('auth_started', { method: 'email' })
  }
  const returnTo = safeReturnTo(next)

  const switchMode = (nextMode: AuthMode, { openEmail = false } = {}) => {
    setMode(nextMode)
    setStep('form')
    if (openEmail) {
      setEmailOpen(true)
      setFocusOnOpen(true)
    }
    trackFunnel('auth_step', { step: nextMode })
  }
  const leave = (path: string, address = email) => {
    rememberAuthReturnTo(returnTo)
    onLeave()
    navigate(authPath(path, returnTo, { email: address }))
  }
  const complete = (method: 'email' | 'phone') => {
    clearAuthReturnTo()
    trackFunnel('auth_completed', { method })
    onSuccess()
  }

  return (
    <div className="space-y-5">
      {step === 'form' && <AuthTabs mode={mode} onChange={switchMode} />}
      {step === 'form' && (
        <div id="auth-panel" role="tabpanel" aria-labelledby={`auth-tab-${mode}`} className="space-y-5">
          <h2 className="font-display text-xl sm:text-2xl font-black text-rally-text text-center">
            {t(mode === 'signin' ? 'auth.signin_title' : 'auth.signup_title')}
          </h2>
          {/* keyed by mode: a provider left pending on one tab must not disable the other. */}
          <SocialSignIn key={`social-${mode}`} mode={mode} next={returnTo} />
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-rally-border" /></div>
            <div className="relative flex justify-center"><span className="bg-rally-surface px-3 text-xs text-rally-text-muted">{t('auth.or')}</span></div>
          </div>
          {emailOpen ? (
            // keyed by mode: a fresh form per tab — password, errors and the wrong-door hint never leak across.
            <AuthCredentialsForm
              key={`form-${mode}`}
              mode={mode}
              email={email}
              onEmailChange={setEmail}
              next={returnTo}
              autoFocus={focusOnOpen}
              onSwitchMode={() => switchMode(mode === 'signin' ? 'signup' : 'signin', { openEmail: true })}
              onForgotPassword={(address) => leave('/auth/forgot-password', address)}
              onVerifyEmail={() => leave('/auth/verify-email', email.trim().toLowerCase())}
              onSignUpSucceededWithSession={() => complete('email')}
              onSignUpNeedsVerification={(address) => leave('/auth/verify-email', address)}
              onSignInSucceeded={() => complete('email')}
            />
          ) : (
            <button
              type="button"
              onClick={openEmailForm}
              className="w-full flex items-center justify-center gap-2 rounded-full border border-rally-border px-4 py-2.5 text-sm font-medium text-rally-text-2 hover:text-rally-text hover:border-rally-border-strong transition-colors"
            >
              <Mail size={16} />
              {t(mode === 'signin' ? 'auth.signin_with_email' : 'auth.signup_with_email')}
            </button>
          )}
          {/* A legacy phone-only player is the whole audience for this, and they
              have no email to open the form with -- so it sits beside the
              providers, not behind them. */}
          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => { trackFunnel('auth_started', { method: 'phone' }); setStep('phone') }}
              className="block w-full text-center text-sm text-rally-text-2 underline underline-offset-4 hover:text-rally-accent"
            >
              {t('auth.phone.recover')}
            </button>
          )}
        </div>
      )}
      {step === 'phone' && <AuthPhoneStep onBack={() => setStep('form')} onSuccess={() => complete('phone')} />}
    </div>
  )
}
