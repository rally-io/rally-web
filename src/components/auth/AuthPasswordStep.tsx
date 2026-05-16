import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isValidNewPassword } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface AuthPasswordStepProps {
  email: string
  userExists: boolean
  onBack: () => void
  onForgotPassword: () => void
  // Called when sign-up was successful but Supabase returned no session (email confirmations on).
  onSignUpNeedsVerification: (email: string) => void
}

export function AuthPasswordStep({
  email, userExists, onBack, onForgotPassword, onSignUpNeedsVerification,
}: AuthPasswordStepProps) {
  const { t } = useTranslation()
  const { signInWithEmail, signUpWithEmail } = useAuth()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSignUp = !userExists
  const rules = passwordRules(password)

  const canSubmit = isSignUp
    ? isValidNewPassword(password)
    : password.length > 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!canSubmit) return
    setPending(true)
    try {
      if (isSignUp) {
        const { hasSession } = await signUpWithEmail(email, password)
        if (!hasSession) {
          // Email confirmation enabled — route to the inbox screen.
          onSignUpNeedsVerification(email)
          return
        }
        // Otherwise onAuthStateChange flips the AppSession; LoginPage's effect handles redirect.
      } else {
        await signInWithEmail(email, password)
      }
    } catch (e: any) {
      const msg = String(e?.message ?? '').toLowerCase()
      if (isSignUp && /already.*registered|user.*already.*exists/.test(msg)) {
        // Race: someone signed up between check-email and submit. Tell the user and
        // let them try again as a sign-in (back button preserves email).
        setError(t('auth.errors.already_registered') || 'This email is already registered. Please sign in.')
      } else if (!isSignUp && /invalid.*login|invalid.*credentials/.test(msg)) {
        setError(t('auth.errors.invalid_credentials') || 'Incorrect email or password')
      } else {
        setError(e?.message ?? 'Sign-in failed')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-slate-400 hover:text-electric-green">
        <ArrowLeft size={16} /> {t('common.back') || 'Back'}
      </button>

      <div>
        <Label className="mb-1 block">{t('auth.email_label') || 'Email'}</Label>
        <div className="text-sm text-slate-300">{email}</div>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-electric-green"
            aria-label={show ? 'Hide password' : 'Show password'}
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

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        type="submit"
        disabled={!canSubmit || pending}
        className="w-full bg-electric-green text-slate-950 hover:bg-electric-green/90"
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
          className="block text-center w-full text-sm text-slate-400 hover:text-electric-green"
        >
          {t('auth.forgot_password') || 'Forgot password?'}
        </button>
      )}
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
