import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, Eye, EyeOff, Check, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isValidEmail, isValidNewPassword } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { authErrorKey } from './authError'
import { trackFunnel } from '@/lib/analytics'
import type { AuthMode } from './AuthTabs'

interface AuthCredentialsFormProps {
  mode: AuthMode
  email: string
  onEmailChange: (email: string) => void
  next?: string
  /** The player picked the wrong tab for this email — take them to the other one, email kept. */
  onSwitchMode: () => void
  onForgotPassword: (email: string) => void
  /** Focus the first empty field on mount. The caller decides — see `focusRef`. */
  autoFocus?: boolean
  onVerifyEmail?: () => void
  /** Signup completed and Supabase returned a session (no email confirmation required). */
  onSignUpSucceededWithSession: () => void
  /** Signup completed but Supabase returned no session (email confirmations on). */
  onSignUpNeedsVerification: (email: string) => void
  onSignInSucceeded: () => void
}

/**
 * One form, two modes. Email + password on both tabs; the sign-up tab adds
 * the password rules, the sign-in tab adds "forgot password" and the phone
 * recovery. The email lookup that used to route the player automatically now
 * only produces a hint ("no account for this email — create one?") with a
 * button to the other tab, so the tab the player chose is the tab they stay on.
 */
export function AuthCredentialsForm({
  mode, email, onEmailChange, next, autoFocus = false,
  onSwitchMode, onForgotPassword, onVerifyEmail,
  onSignUpSucceededWithSession, onSignUpNeedsVerification, onSignInSucceeded,
}: AuthCredentialsFormProps) {
  const { t } = useTranslation()
  const { checkEmailExists, signInWithEmail, signUpWithEmail } = useAuth()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [wrongDoor, setWrongDoor] = useState(false)
  // Focus is a deliberate act, not a side effect of rendering. `autoFocus` fires
  // on every mount, and the form remounts per tab (`key`), so a plain tab click
  // used to pull focus off the tablist -- a change of context the player did not
  // ask for, and it broke tabbing between the two tabs. The caller says when
  // focus is warranted: opening the email form, or being sent across by the
  // wrong-door hint. Never on a bare tab click.
  const focusRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus) focusRef.current?.focus()
    // Mount only: `autoFocus` is a prop of the moment this form was opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isSignUp = mode === 'signup'
  const rules = passwordRules(password)
  const canSubmit = email.length > 0 && (isSignUp ? isValidNewPassword(password) : password.length > 0)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || pending) return
    setError(null)
    setEmailError(null)
    setWrongDoor(false)
    const normalized = email.trim().toLowerCase()
    if (!isValidEmail(normalized)) {
      setEmailError(t('auth.errors.invalid_email'))
      return
    }
    setPending(true)
    trackFunnel('auth_started', { method: 'email' })
    try {
      // The lookup only decides whether to show the wrong-door hint. If it
      // fails (offline, rate-limited) the password attempt goes ahead anyway —
      // Supabase gives the definitive answer.
      let exists: boolean | null = null
      try {
        exists = await checkEmailExists(normalized)
      } catch {
        trackFunnel('auth_error', { method: 'email', step: 'lookup' })
      }
      // The hint is a shortcut, never a gate. Blocking here locked out a real
      // population: `check_email_exists` reads `rally_users`, NOT Supabase
      // `auth.users`, so a player with a rally_users row and no auth user was
      // told "you already have an account", sent to Sign in (invalid
      // credentials), then to forgot-password, which reports success and sends
      // nothing. Two such rows exist on dev. Supabase stays the authority.
      if (isSignUp ? exists === true : exists === false) setWrongDoor(true)
      if (isSignUp) {
        const { hasSession } = await signUpWithEmail(normalized, password, next)
        if (hasSession) onSignUpSucceededWithSession()
        else onSignUpNeedsVerification(normalized)
        return
      }
      await signInWithEmail(normalized, password)
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
      <div>
        <Label htmlFor="auth-email" className="mb-1 block">{t('auth.email_label')}</Label>
        <IconField icon={<Mail size={18} />}>
          <Input
            id="auth-email"
            type="email"
            autoComplete="username"
            ref={email.length === 0 ? focusRef : undefined}
            dir="ltr"
            disabled={pending}
            value={email}
            onChange={(e) => { onEmailChange(e.target.value); setEmailError(null); setWrongDoor(false) }}
            placeholder="you@example.com"
            className="ps-10 pe-10"
          />
        </IconField>
        {emailError && <p className="mt-1 text-sm text-rally-error">{emailError}</p>}
      </div>

      <div>
        <Label htmlFor="auth-password" className="mb-1 block">
          {isSignUp ? t('auth.create_password') : t('auth.password_label')}
        </Label>
        <IconField icon={<Lock size={18} />}>
          <Input
            id="auth-password"
            type={show ? 'text' : 'password'}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            ref={email.length > 0 ? focusRef : undefined}
            dir="ltr"
            disabled={pending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="ps-10 pe-10"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-rally-text-2 hover:text-rally-accent"
            aria-label={t(show ? 'auth.hide_password' : 'auth.show_password')}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </IconField>
        {isSignUp && (
          <ul className="mt-2 space-y-1 text-xs">
            <Rule met={rules.length}>{t('auth.rule_length')}</Rule>
            <Rule met={rules.uppercase}>{t('auth.rule_uppercase')}</Rule>
            <Rule met={rules.digit}>{t('auth.rule_digit')}</Rule>
          </ul>
        )}
      </div>

      {!isSignUp && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={() => onForgotPassword(email.trim().toLowerCase())}
            className="text-sm text-rally-text-2 hover:text-rally-accent"
          >
            {t('auth.forgot_password')}
          </button>
        </div>
      )}

      {wrongDoor && (
        <div role="status" className="rounded-md border border-rally-warning/30 bg-rally-warning/10 p-3 text-sm text-rally-warning space-y-2">
          <p>
            {isSignUp
              ? t('auth.wrong_door_signup_to_signin', { email: email.trim().toLowerCase() })
              : t('auth.wrong_door_signin_to_signup', { email: email.trim().toLowerCase() })}
          </p>
          <button type="button" onClick={onSwitchMode} className="font-bold underline underline-offset-4">
            {t(isSignUp ? 'auth.switch_to_signin' : 'auth.switch_to_signup')}
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-rally-error">{t(error)}</p>}
      {error === 'auth.errors.unconfirmed' && onVerifyEmail && (
        <button type="button" onClick={onVerifyEmail} className="text-sm underline">{t('auth.verify.resend')}</button>
      )}

      <Button type="submit" variant="accent" className="w-full h-11 rounded-full font-bold" disabled={!canSubmit || pending}>
        {pending ? t('common.loading') : isSignUp ? t('auth.create_account') : t('auth.sign_in')}
      </Button>

    </form>
  )
}

function IconField({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-rally-text-2">{icon}</span>
      {children}
    </div>
  )
}

function passwordRules(p: string) {
  return { length: p.length >= 8, uppercase: /[A-Z]/.test(p), digit: /\d/.test(p) }
}

function Rule({ met, children }: { met: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-center gap-2 ${met ? 'text-rally-accent' : 'text-rally-text-muted'}`}>
      {met ? <Check size={14} /> : <X size={14} />}
      {children}
    </li>
  )
}
