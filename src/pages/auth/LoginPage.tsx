import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthOptionsStep } from '@/components/auth/AuthOptionsStep'
import { AuthEmailStep } from '@/components/auth/AuthEmailStep'
import { AuthPasswordStep } from '@/components/auth/AuthPasswordStep'
import { LegalDisclaimer } from '@/components/auth/LegalDisclaimer'

type Step =
  | { kind: 'options' }
  | { kind: 'email' }
  | { kind: 'password'; email: string; userExists: boolean }

export default function LoginPage() {
  const { t } = useTranslation()
  const { session, isLoading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'

  const [step, setStep] = useState<Step>({ kind: 'options' })
  const [rememberedEmail, setRememberedEmail] = useState('')

  // If already signed in, bounce to next (or home).
  useEffect(() => {
    if (!isLoading && session) {
      navigate(next, { replace: true })
    }
  }, [isLoading, session, navigate, next])

  const title =
    step.kind === 'options' ? (t('auth.welcome') || 'Welcome to Rally')
    : step.kind === 'email' ? (t('auth.email_step_title') || "What's your email?")
    : step.userExists ? (t('auth.signin_title') || 'Welcome back')
    : (t('auth.signup_title') || 'Create your account')

  return (
    <AuthCard title={title} footer={<LegalDisclaimer />}>
      {step.kind === 'options' && (
        <AuthOptionsStep onContinueWithEmail={() => setStep({ kind: 'email' })} />
      )}
      {step.kind === 'email' && (
        <AuthEmailStep
          initialEmail={rememberedEmail}
          onBack={() => setStep({ kind: 'options' })}
          onContinue={(email, userExists) => {
            setRememberedEmail(email)
            setStep({ kind: 'password', email, userExists })
          }}
          onForgotPassword={(email) => navigate(`/auth/forgot-password?email=${encodeURIComponent(email)}`)}
        />
      )}
      {step.kind === 'password' && (
        <AuthPasswordStep
          email={step.email}
          userExists={step.userExists}
          onBack={() => setStep({ kind: 'email' })}
          onForgotPassword={() => navigate(`/auth/forgot-password?email=${encodeURIComponent(step.email)}`)}
          onSignUpNeedsVerification={(email) =>
            navigate(`/auth/verify-email?email=${encodeURIComponent(email)}`)
          }
        />
      )}
    </AuthCard>
  )
}
