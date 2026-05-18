import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAuthGateInternals } from '@/contexts/AuthGateContext'
import { AuthOptionsStep } from './AuthOptionsStep'
import { AuthEmailStep } from './AuthEmailStep'
import { AuthPasswordStep } from './AuthPasswordStep'

type Step =
  | { kind: 'options' }
  | { kind: 'email' }
  | { kind: 'password'; email: string; userExists: boolean }

export function AuthGateModal() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { open, cancel } = useAuthGateInternals()
  const [step, setStep] = useState<Step>({ kind: 'options' })

  useEffect(() => {
    if (open) setStep({ kind: 'options' })
  }, [open])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cancel()
      }}
    >
      <DialogContent className="bg-slate-900 border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-50">
            {t('auth.gate.modal_title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            {t('auth.gate.modal_subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {step.kind === 'options' && (
            <AuthOptionsStep onContinueWithEmail={() => setStep({ kind: 'email' })} />
          )}
          {step.kind === 'email' && (
            <AuthEmailStep
              onBack={() => setStep({ kind: 'options' })}
              onContinue={(email, userExists) =>
                setStep({ kind: 'password', email, userExists })
              }
              onForgotPassword={(email) => {
                cancel()
                navigate(`/auth/forgot-password?email=${encodeURIComponent(email)}`)
              }}
            />
          )}
          {step.kind === 'password' && (
            <AuthPasswordStep
              email={step.email}
              userExists={step.userExists}
              onBack={() => setStep({ kind: 'email' })}
              onForgotPassword={() => {
                cancel()
                navigate(`/auth/forgot-password?email=${encodeURIComponent(step.email)}`)
              }}
              onSignUpNeedsVerification={(email) => {
                cancel()
                navigate(`/auth/verify-email?email=${encodeURIComponent(email)}`)
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
