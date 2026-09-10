import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { isValidNewPassword } from '@/lib/auth'
import { AuthCard } from '@/components/auth/AuthCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { authPath, clearAuthReturnTo, getAuthCallbackParams, getAuthReturnTo, safeReturnTo } from '@/lib/authReturn'
import { authErrorKey } from '@/components/auth/authError'

export default function SetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { updatePassword, user, isLoading } = useAuth()
  const location = useLocation()
  const next = params.has('next') ? safeReturnTo(params.get('next')) : getAuthReturnTo()
  const [callbackParams] = useState(getAuthCallbackParams)

  const type = params.get('type') || 'recovery'   // 'recovery' | 'invite'
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [recoveredUserId, setRecoveredUserId] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (callbackParams.has('error') || callbackParams.has('error_description') ||
        (!location.state?.recoveryUserId && !callbackParams.has('access_token'))) {
      setHasSession(false); return
    }
    let cancelled = false
    ;(async () => {
      // detectSessionInUrl picks up tokens from the fragment. Allow a tick.
      for (let i = 0; i < 10; i++) {
        let result
        try { result = await supabase.auth.getSession() }
        catch { if (!cancelled) setHasSession(false); return }
        const { data, error } = result
        if (cancelled) return
        if (error) { setHasSession(false); return }
        if (data.session && callbackParams.has('access_token') && data.session.access_token !== callbackParams.get('access_token')) { setHasSession(false); return }
        if (data.session) {
          if (location.state?.recoveryUserId && data.session.user.id !== location.state.recoveryUserId) { setHasSession(false); return }
          setRecoveredUserId(data.session.user.id); setHasSession(true); return
        }
        await new Promise((r) => setTimeout(r, 150))
      }
      if (!cancelled) setHasSession(false)
    })()
    return () => { cancelled = true }
  }, [callbackParams, location.state])

  useEffect(() => {
    if (recoveredUserId && !isLoading && user?.id !== recoveredUserId) {
      setHasSession(false); setPassword(''); setConfirm('')
    }
  }, [recoveredUserId, user?.id, isLoading])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending || !hasSession || !recoveredUserId) return
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
      await updatePassword(password, recoveredUserId)
      clearAuthReturnTo()
      navigate(next, { replace: true })
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'Recovery session changed') setHasSession(false)
      else setError(t(authErrorKey(e)))
    } finally {
      setPending(false)
    }
  }

  if (hasSession === null) {
    return (
      <AuthCard title={t('common.loading') || 'Loading...'}>
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rally-border border-t-rally-accent" />
        </div>
      </AuthCard>
    )
  }

  if (hasSession === false) {
    return (
      <AuthCard title={t('auth.set_password.expired_title') || 'Link expired or already used'}>
        <div className="space-y-4 text-sm text-rally-text-2">
          <p>{t('auth.set_password.expired_body') || 'Request a new link to continue.'}</p>
          <Button onClick={() => navigate(authPath('/auth/forgot-password', next))} className="w-full">
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
        <p className="text-xs text-rally-text-muted">
          {t('auth.set_password.rule') || '8+ characters, with at least one uppercase letter and one number.'}
        </p>
        {error && <p className="text-sm text-rally-error">{error}</p>}
        <Button
          type="submit"
          disabled={pending}
          className="w-full bg-rally-accent text-rally-accent-text hover:bg-rally-accent-hover"
        >
          {pending ? (t('common.loading') || 'Loading...') : (t('auth.set_password.cta') || 'Update password')}
        </Button>
      </form>
    </AuthCard>
  )
}
