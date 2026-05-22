import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthOptionsStep } from '@/components/auth/AuthOptionsStep'
import { AuthEmailStep } from '@/components/auth/AuthEmailStep'
import { AuthPasswordStep } from '@/components/auth/AuthPasswordStep'
import { LegalDisclaimer } from '@/components/auth/LegalDisclaimer'

type Mode = 'signin' | 'signup'

type Step =
  | { kind: 'options' }
  | { kind: 'email'; mode: Mode }
  | { kind: 'password'; mode: Mode; email: string; userExists: boolean }

export default function LoginPage() {
  const { t } = useTranslation()
  const { session, isLoading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'

  const [step, setStep] = useState<Step>({ kind: 'options' })
  const [rememberedEmail, setRememberedEmail] = useState('')

  // Mirror `next` into sessionStorage so the OAuth full-page redirect can
  // restore the original destination from /auth/callback. (signInWithOAuth
  // skips stashing when called from /login itself.) Clear any stale entry
  // when there is no valid next so a previous value doesn't redirect on the
  // next OAuth sign-in.
  useEffect(() => {
    try {
      if (next && next !== '/' && next.startsWith('/') && !next.startsWith('//')) {
        sessionStorage.setItem('rally:auth-return', next)
      } else {
        sessionStorage.removeItem('rally:auth-return')
      }
    } catch {
      // sessionStorage may be unavailable (private mode) — non-fatal.
    }
  }, [next])

  // If already signed in, bounce to next (or home).
  useEffect(() => {
    if (!isLoading && session) {
      navigate(next, { replace: true })
    }
  }, [isLoading, session, navigate, next])

  const title =
    step.kind === 'options' ? (t('auth.welcome_hero') || 'Welcome to Rally')
    : step.kind === 'email'
      ? step.mode === 'signin'
        ? (t('auth.email_step_signin_title') || 'Sign in')
        : (t('auth.email_step_signup_title') || 'Create your account')
      : step.mode === 'signin'
        ? (t('auth.signin_title') || 'Welcome back')
        : (t('auth.signup_title') || 'Create your account')

  const handleOuterBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <AuthCard
      title={title}
      subtitle={step.kind === 'options' ? t('auth.welcome_subtitle') : undefined}
      footer={<LegalDisclaimer />}
      onBack={step.kind === 'options' ? handleOuterBack : undefined}
    >
      {step.kind === 'options' && (
        <AuthOptionsStep
          onContinueWithEmail={(mode) => setStep({ kind: 'email', mode })}
        />
      )}
      {step.kind === 'email' && (
        <AuthEmailStep
          mode={step.mode}
          initialEmail={rememberedEmail}
          onBack={() => setStep({ kind: 'options' })}
          onContinue={(email, userExists) => {
            setRememberedEmail(email)
            setStep({ kind: 'password', mode: step.mode, email, userExists })
          }}
          onForgotPassword={(email) => navigate(`/auth/forgot-password?email=${encodeURIComponent(email)}`)}
        />
      )}
      {step.kind === 'password' && (
        <AuthPasswordStep
          mode={step.mode}
          email={step.email}
          userExists={step.userExists}
          onBack={() => setStep({ kind: 'email', mode: step.mode })}
          onSwitchMode={() =>
            setStep({
              kind: 'password',
              mode: step.mode === 'signin' ? 'signup' : 'signin',
              email: step.email,
              userExists: step.userExists,
            })
          }
          onForgotPassword={() => navigate(`/auth/forgot-password?email=${encodeURIComponent(step.email)}`)}
          onSignUpSucceededWithSession={() =>
            navigate('/auth/welcome', { replace: true })
          }
          onSignUpNeedsVerification={(email) =>
            navigate(`/auth/verify-email?email=${encodeURIComponent(email)}`)
          }
        />
      )}
    </AuthCard>
  )
}
