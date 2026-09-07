import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { isValidEmail } from '@/lib/auth'
import { AuthCard } from '@/components/auth/AuthCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { authPath, getAuthReturnTo, safeReturnTo } from '@/lib/authReturn'
import { authErrorKey } from '@/components/auth/authError'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { requestPasswordReset } = useAuth()
  const next = params.has('next') ? safeReturnTo(params.get('next')) : getAuthReturnTo()

  const [email, setEmail] = useState(params.get('email') || '')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    setValidationError(null)
    if (!isValidEmail(email.trim())) {
      setValidationError(t('auth.errors.invalid_email') || 'Enter a valid email address')
      return
    }
    setPending(true)
    try {
      await requestPasswordReset(email.trim().toLowerCase(), next)
      setDone(true)
    } catch (error) {
      setValidationError(t(authErrorKey(error)))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthCard
      title={t('auth.forgot.title') || 'Reset your password'}
      subtitle={done ? undefined : (t('auth.forgot.subtitle') || "We'll send you a link to set a new password.")}
    >
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            {t('auth.forgot.success') || 'If an account exists for this email, we sent a reset link.'}
          </p>
          <Button onClick={() => navigate(authPath('/login', next, { email }))} className="w-full">
            {t('auth.back_to_login') || 'Back to login'}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="mb-1 block">{t('auth.email_label') || 'Email'}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {validationError && <p role="alert" className="mt-1 text-sm text-red-400">{validationError}</p>}
          </div>
          <Button type="submit" disabled={pending || !email} className="w-full bg-electric-green text-slate-950 hover:bg-electric-green/90">
            {pending ? (t('common.loading') || 'Loading...') : (t('auth.forgot.cta') || 'Send reset link')}
          </Button>
          <button
            type="button"
            onClick={() => navigate(authPath('/login', next, { email }))}
            className="block text-center w-full text-sm text-slate-400 hover:text-electric-green"
          >
            {t('auth.back_to_login') || 'Back to login'}
          </button>
        </form>
      )}
    </AuthCard>
  )
}
