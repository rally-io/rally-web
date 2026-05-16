import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'

const COOLDOWN_SECONDS = 30

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { session, resendVerificationEmail } = useAuth()

  const email = params.get('email') || ''
  const [cooldown, setCooldown] = useState(0)
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // If session arrives (user clicked the link in the same browser), auto-redirect.
  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const handleResend = async () => {
    setInfo(null)
    setError(null)
    try {
      await resendVerificationEmail(email)
      setInfo(t('auth.verify.resent') || 'Email resent. Check your inbox.')
      setCooldown(COOLDOWN_SECONDS)
    } catch (e: any) {
      setError(e?.message ?? 'Could not resend')
    }
  }

  return (
    <AuthCard
      title={t('auth.verify.title') || 'Check your inbox'}
      subtitle={
        email
          ? (t('auth.verify.subtitle', { email }) || `We sent a confirmation link to ${email}.`)
          : (t('auth.verify.subtitle_generic') || 'We sent you a confirmation link.')
      }
    >
      <div className="space-y-4 text-sm text-slate-300">
        <p>{t('auth.verify.body') || 'Click the link in the email to finish creating your account. You can close this tab.'}</p>

        <Button
          onClick={handleResend}
          disabled={cooldown > 0 || !email}
          variant="outline"
          className="w-full"
        >
          {cooldown > 0
            ? (t('auth.verify.resend_cooldown', { seconds: cooldown }) || `Resend in ${cooldown}s`)
            : (t('auth.verify.resend') || 'Resend email')}
        </Button>

        {info && <p className="text-sm text-electric-green">{info}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={() => navigate('/login')}
          className="block text-center w-full text-sm text-slate-400 hover:text-electric-green"
        >
          {t('auth.verify.use_different_email') || 'Use a different email'}
        </button>
      </div>
    </AuthCard>
  )
}
