import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isValidEmail } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface AuthEmailStepProps {
  mode: 'signin' | 'signup'
  initialEmail?: string
  onBack: () => void
  onContinue: (email: string, userExists: boolean) => void
  onForgotPassword: (email: string) => void
}

export function AuthEmailStep({ mode, initialEmail = '', onBack, onContinue, onForgotPassword }: AuthEmailStepProps) {
  const { t } = useTranslation()
  const { checkEmailExists } = useAuth()
  const [email, setEmail] = useState(initialEmail)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationError(null)
    if (!isValidEmail(email)) {
      setValidationError(t('auth.errors.invalid_email') || 'Enter a valid email address')
      return
    }
    setPending(true)
    try {
      const exists = await checkEmailExists(email)
      onContinue(email.trim().toLowerCase(), exists)
    } catch (e: any) {
      // CRITICAL: do not assume sign-up branch on error. Surface and let user retry.
      setError(t('auth.errors.check_email_failed') || "Couldn't verify the email. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-slate-400 hover:text-electric-green">
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        {validationError && <p className="mt-1 text-sm text-red-400">{validationError}</p>}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

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
