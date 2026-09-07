import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isValidEmail } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { trackFunnel } from '@/lib/analytics'

interface AuthEmailStepProps {
  mode: 'signin' | 'signup'
  initialEmail?: string
  onBack: () => void
  onContinue: (email: string, userExists: boolean | null) => void
  onEmailChange?: (email: string) => void
  onForgotPassword: (email: string) => void
}

export function AuthEmailStep({ mode, initialEmail = '', onBack, onContinue, onForgotPassword, onEmailChange }: AuthEmailStepProps) {
  const { t } = useTranslation()
  const { checkEmailExists } = useAuth()
  const [email, setEmail] = useState(initialEmail)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    setError(null)
    setValidationError(null)
    const normalized = email.trim().toLowerCase()
    if (!isValidEmail(normalized)) {
      setValidationError(t('auth.errors.invalid_email') || 'Enter a valid email address')
      return
    }
    setPending(true)
    try {
      const exists = await checkEmailExists(normalized)
      onContinue(normalized, exists)
    } catch {
      trackFunnel('auth_error', { method: 'email', step: 'lookup' })
      setError(t('auth.errors.check_email_failed') || "Couldn't verify the email. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button type="button" disabled={pending} onClick={onBack} className="flex items-center gap-1 text-sm text-slate-400 hover:text-electric-green">
        <ArrowLeft size={16} /> {t('common.back') || 'Back'}
      </button>

      <p className="text-sm text-slate-400">
        {mode === 'signin'
          ? (t('auth.email_step_signin_subtitle') || "Enter the email tied to your Rally account.")
          : (t('auth.email_step_signup_subtitle') || "We'll use this to set up your account.")}
      </p>

      <div>
        <Label htmlFor="email" className="mb-1 block">{t('auth.email_label') || 'Email'}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          dir="ltr"
          disabled={pending}
          value={email}
          onChange={(e) => { setEmail(e.target.value); onEmailChange?.(e.target.value); setError(null) }}
          placeholder="you@example.com"
        />
        {validationError && <p className="mt-1 text-sm text-red-400">{validationError}</p>}
      </div>

      {error && <div role="alert" className="space-y-2 text-sm text-amber-200"><p>{error}</p>
        <button type="button" className="underline" onClick={() => onContinue(email.trim().toLowerCase(), null)}>{t('auth.continue_password')}</button>
      </div>}

      <Button
        type="submit"
        variant="accent"
        disabled={pending || email.length === 0}
      >
        {pending ? (t('common.loading') || 'Loading...') : (t('auth.continue') || 'Continue')}
      </Button>

      {mode === 'signin' && (
        <button
          type="button"
          onClick={() => onForgotPassword(email)}
          className="block text-center w-full text-sm text-slate-400 hover:text-electric-green"
        >
          {t('auth.forgot_password') || 'Forgot password?'}
        </button>
      )}
    </form>
  )
}
