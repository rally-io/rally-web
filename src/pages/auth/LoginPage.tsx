import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthFlow } from '@/components/auth/AuthFlow'
import { LegalDisclaimer } from '@/components/auth/LegalDisclaimer'
import { clearAuthReturnTo, rememberAuthReturnTo, safeReturnTo } from '@/lib/authReturn'

export default function LoginPage() {
  const { t } = useTranslation()
  const { session, isLoading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeReturnTo(params.get('next'))
  useEffect(() => { rememberAuthReturnTo(next) }, [next])
  useEffect(() => {
    if (!isLoading && session) { clearAuthReturnTo(); navigate(next, { replace: true }) }
  }, [isLoading, session, navigate, next])
  return <AuthCard title={t('auth.welcome_hero')} subtitle={t('auth.welcome_subtitle')}
    footer={<LegalDisclaimer />} onBack={() => navigate(next)}>
    <AuthFlow next={next} initialEmail={params.get('email') ?? ''} onSuccess={() => navigate(next, { replace: true })} />
  </AuthCard>
}
