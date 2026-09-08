import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthOptionsStep } from './AuthOptionsStep'
import { AuthEmailStep } from './AuthEmailStep'
import { AuthPasswordStep } from './AuthPasswordStep'
import { AuthPhoneStep } from './AuthPhoneStep'
import { authPath, clearAuthReturnTo, rememberAuthReturnTo, safeReturnTo } from '@/lib/authReturn'
import { trackFunnel } from '@/lib/analytics'

export function AuthFlow({ next, onSuccess, onLeave = () => {}, initialEmail = '' }: {
  next: string; onSuccess: () => void; onLeave?: () => void; initialEmail?: string
}) {
  const navigate = useNavigate()
  const [step, setStep] = useState<'options' | 'email' | 'password' | 'phone'>(initialEmail ? 'email' : 'options')
  const [email, setEmail] = useState(initialEmail)
  const [exists, setExists] = useState<boolean | null>(null)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const returnTo = safeReturnTo(next)
  const leave = (path: string, address = email) => {
    rememberAuthReturnTo(returnTo)
    onLeave()
    navigate(authPath(path, returnTo, { email: address }))
  }
  const complete = (method: 'email' | 'phone') => {
    clearAuthReturnTo()
    trackFunnel('auth_completed', { method })
    onSuccess()
  }
  return <>
    {step === 'options' && <AuthOptionsStep next={returnTo} onContinueWithEmail={() => {
      trackFunnel('auth_started', { method: 'email' }); setStep('email')
    }} onContinueWithPhone={() => {
      trackFunnel('auth_started', { method: 'phone' }); setStep('phone')
    }} />}
    {step === 'email' && <AuthEmailStep mode="signin" initialEmail={email}
      onEmailChange={setEmail} onBack={() => setStep('options')}
      onContinue={(address, found) => {
        setEmail(address); setExists(found); setMode(found === false ? 'signup' : 'signin'); setStep('password')
        trackFunnel('auth_step', { method: 'email', step: found === false ? 'signup' : 'signin' })
      }} onForgotPassword={(address) => leave('/auth/forgot-password', address)} />}
    {step === 'password' && <AuthPasswordStep key={mode} mode={mode} next={returnTo} email={email} userExists={exists}
      onBack={() => setStep('email')} onSwitchMode={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
      onForgotPassword={() => leave('/auth/forgot-password')}
      onSignUpSucceededWithSession={() => complete('email')}
      onSignUpNeedsVerification={(address) => leave('/auth/verify-email', address)}
      onVerifyEmail={() => leave('/auth/verify-email')}
      onSignInSucceeded={() => complete('email')} />}
    {step === 'phone' && <AuthPhoneStep onBack={() => setStep('options')} onSuccess={() => complete('phone')} />}
  </>
}
