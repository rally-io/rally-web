import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { isValidNewPassword } from '@/lib/auth'
import { AuthCard } from '@/components/auth/AuthCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function SetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { updatePassword } = useAuth()

  const type = params.get('type') || 'recovery'   // 'recovery' | 'invite'
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // detectSessionInUrl picks up tokens from the fragment. Allow a tick.
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (data.session) { setHasSession(true); return }
        await new Promise((r) => setTimeout(r, 150))
      }
      if (!cancelled) setHasSession(false)
    })()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isValidNewPassword(password)) {
      setError(t('auth.errors.weak_password') || 'Password must be 8+ chars with an uppercase letter and a digit.')
      return
    }
    if (password !== confirm) {
      setError(t('auth.errors.password_mismatch') || 'Passwords do not match')
      return
    }
    setPending(true)
    try {
      await updatePassword(password)
      navigate('/', { replace: true })
    } catch (e: any) {
      setError(e?.message ?? 'Could not update password')
    } finally {
      setPending(false)
    }
  }

  if (hasSession === null) {
    return (
      <AuthCard title={t('common.loading') || 'Loading...'}>
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-electric-green" />
        </div>
      </AuthCard>
    )
  }

  if (hasSession === false) {
    return (
      <AuthCard title={t('auth.set_password.expired_title') || 'Link expired or already used'}>
        <div className="space-y-4 text-sm text-slate-300">
          <p>{t('auth.set_password.expired_body') || 'Request a new link to continue.'}</p>
          <Button onClick={() => navigate('/auth/forgot-password')} className="w-full">
            {t('auth.set_password.request_new') || 'Request new link'}
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={type === 'invite'
        ? (t('auth.set_password.invite_title') || 'Set your password')
        : (t('auth.set_password.recovery_title') || 'Choose a new password')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password" className="mb-1 block">{t('auth.set_password.new') || 'New password'}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="confirm" className="mb-1 block">{t('auth.set_password.confirm') || 'Confirm password'}</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-500">
          {t('auth.set_password.rule') || '8+ characters, with at least one uppercase letter and one number.'}
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button
          type="submit"
          disabled={pending}
          className="w-full bg-electric-green text-slate-950 hover:bg-electric-green/90"
        >
          {pending ? (t('common.loading') || 'Loading...') : (t('auth.set_password.cta') || 'Update password')}
        </Button>
      </form>
    </AuthCard>
  )
}
