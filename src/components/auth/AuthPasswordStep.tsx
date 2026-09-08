import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isValidNewPassword } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { authErrorKey } from './authError'
import { trackFunnel } from '@/lib/analytics'

interface AuthPasswordStepProps {
  mode: 'signin' | 'signup'
  email: string
  /** Informational only — used to surface the "wrong door" hint and switch link. */
  userExists: boolean | null
  next?: string
  onVerifyEmail?: () => void
  onBack: () => void
  onSwitchMode: () => void
  onForgotPassword: () => void
  /** Signup completed and Supabase returned a session (no email confirmation required). */
  onSignUpSucceededWithSession: () => void
  /** Signup completed but Supabase returned no session (email confirmations on). */
  onSignUpNeedsVerification: (email: string) => void
  /** Signin completed and Supabase returned a session. */
  onSignInSucceeded: () => void
}

export function AuthPasswordStep({
  mode, email, userExists, next, onVerifyEmail,
  onBack, onSwitchMode, onForgotPassword,
  onSignUpSucceededWithSession, onSignUpNeedsVerification,
  onSignInSucceeded,
}: AuthPasswordStepProps) {
  const { t } = useTranslation()
  const { signInWithEmail, signUpWithEmail } = useAuth()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSignUp = mode === 'signup'
  const wrongDoor =
    (mode === 'signup' && userExists) ||
    (mode === 'signin' && userExists === false)
  const rules = passwordRules(password)

  const canSubmit = isSignUp
    ? isValidNewPassword(password)
    : password.length > 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!canSubmit || pending) return
    setPending(true)
    try {
      if (isSignUp) {
        const { hasSession } = await signUpWithEmail(email, password, next)
        if (hasSession) {
          onSignUpSucceededWithSession()
        } else {
          onSignUpNeedsVerification(email)
        }
        return
      }
      await signInWithEmail(email, password)
      onSignInSucceeded()
    } catch (e: unknown) {
      setError(authErrorKey(e))
      trackFunnel('auth_error', { method: 'email', step: mode })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="text" name="username" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
      <button type="button" disabled={pending} onClick={onBack} className="flex items-center gap-1 text-sm text-slate-400 hover:text-electric-green">
        <ArrowLeft size={16} /> {t('common.back') || 'Back'}
      </button>

      {wrongDoor && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <p className="mb-2">
            {mode === 'signup'
              ? (t('auth.wrong_door_signup_to_signin', { email }) || `${email} already has a Rally account.`)
              : (t('auth.wrong_door_signin_to_signup', { email }) || `We couldn't find a Rally account for ${email}.`)}
          </p>
        </div>
      )}

      <div>
        <Label className="mb-1 block">{t('auth.email_label') || 'Email'}</Label>
        <div dir="ltr" className="text-sm text-slate-300 break-all">{email}</div>
      </div>

      <div>
        <Label htmlFor="password" className="mb-1 block">
          {isSignUp ? (t('auth.create_password') || 'Create a password') : (t('auth.password_label') || 'Password')}
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            autoFocus
            disabled={pending}
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-electric-green"
            aria-label={t(show ? 'auth.hide_password' : 'auth.show_password')}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {isSignUp && (
        <ul className="space-y-1 text-xs">
          <Rule met={rules.length}>{t('auth.rule_length') || 'At least 8 characters'}</Rule>
          <Rule met={rules.uppercase}>{t('auth.rule_uppercase') || 'One uppercase letter'}</Rule>
          <Rule met={rules.digit}>{t('auth.rule_digit') || 'One number'}</Rule>
        </ul>
      )}

      {error && <p role="alert" className="text-sm text-red-400">{t(error)}</p>}
      {error === 'auth.errors.unconfirmed' && onVerifyEmail && <button type="button" onClick={onVerifyEmail} className="text-sm underline">{t('auth.verify.resend')}</button>}

      <Button
        type="submit"
        variant="accent"
        disabled={!canSubmit || pending}
      >
        {pending
          ? (t('common.loading') || 'Loading...')
          : isSignUp
            ? (t('auth.create_account') || 'Create account')
            : (t('auth.sign_in') || 'Sign in')}
      </Button>

      {!isSignUp && (
        <button
          type="button"
          onClick={onForgotPassword}
          disabled={pending}
          className="block text-center w-full text-sm text-slate-400 hover:text-electric-green"
        >
          {t('auth.forgot_password') || 'Forgot password?'}
        </button>
      )}
      <button type="button" disabled={pending} onClick={() => { setPassword(''); setError(null); setShow(false); onSwitchMode() }} className="block w-full text-center text-sm text-slate-300 underline underline-offset-4">
        {t(isSignUp ? 'auth.switch_to_signin' : 'auth.switch_to_signup')}
      </button>
    </form>
  )
}

function passwordRules(p: string) {
  return {
    length: p.length >= 8,
    uppercase: /[A-Z]/.test(p),
    digit: /\d/.test(p),
  }
}

function Rule({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-2 ${met ? 'text-electric-green' : 'text-slate-500'}`}>
      {met ? <Check size={14} /> : <X size={14} />}
      {children}
    </li>
  )
}
