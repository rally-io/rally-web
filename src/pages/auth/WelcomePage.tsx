import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'

export default function WelcomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session, isLoading } = useAuth()

  // If the user lands here without an active session (e.g. bookmark, refresh on
  // a cleared session), bounce them to /login — there's nothing to "welcome"
  // them to without auth state.
  useEffect(() => {
    if (!isLoading && !session) {
      navigate('/login', { replace: true })
    }
  }, [isLoading, session, navigate])

  return (
    <AuthCard
      title={t('auth.welcome.title') || 'Welcome to Rally'}
      subtitle={t('auth.welcome.subtitle') || 'Your account is ready.'}
    >
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-electric-green/15 p-3">
            <CheckCircle2 className="text-electric-green" size={40} />
          </div>
        </div>

        <Button
          onClick={() => navigate('/', { replace: true })}
          className="w-full bg-electric-green text-slate-950 hover:bg-electric-green/90"
        >
          {t('auth.welcome.cta') || 'Continue to Rally'}
        </Button>
      </div>
    </AuthCard>
  )
}
