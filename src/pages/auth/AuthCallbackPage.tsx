import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { authPath, clearAuthReturnTo, getAuthCallbackParams, getAuthReturnTo, safeReturnTo } from '@/lib/authReturn'
import { authErrorKey } from '@/components/auth/authError'
import { trackFunnel } from '@/lib/analytics'

export default function AuthCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const [callbackParams] = useState(getAuthCallbackParams)
  const urlError = params.get('error_description') ?? params.get('error') ?? callbackParams.get('error_description') ?? callbackParams.get('error')
  const next = params.has('next') ? safeReturnTo(params.get('next')) : getAuthReturnTo()
  const recovery = (params.get('type') ?? callbackParams.get('type')) === 'recovery'

  useEffect(() => {
    if (urlError) {
      const key = authErrorKey({ message: urlError })
      setError(t(key === 'auth.errors.generic' ? 'auth.callback.link_failed' : key))
      return
    }
    if (!callbackParams.has('access_token')) {
      setError(t('auth.callback.no_session'))
      return
    }

    let attempts = 0
    let cancelled = false

    async function pollForSession() {
      while (!cancelled && attempts < 10) {
        let result
        try { result = await supabase.auth.getSession() }
        catch (error) { if (!cancelled) setError(t(authErrorKey(error))); return }
        const { data, error: getErr } = result
        if (cancelled) return
        if (getErr) {
          setError(t(authErrorKey(getErr)))
          return
        }
        if (data.session) {
          if (callbackParams.has('access_token') && data.session.access_token !== callbackParams.get('access_token')) {
            setError(t('auth.callback.link_failed'))
            return
          }
          if (!recovery) {
            clearAuthReturnTo()
            const method = params.get('method')
            trackFunnel('auth_completed', { method: method === 'google' || method === 'apple' || method === 'facebook' ? method : 'email' })
          }
          navigate(recovery ? authPath('/set-password', next, { type: 'recovery' }) : next, { replace: true, state: recovery ? { recoveryUserId: data.session.user.id } : undefined })
          return
        }
        attempts += 1
        await new Promise((r) => setTimeout(r, 200))
      }
      if (!cancelled) {
        setError(t('auth.callback.no_session') || "We couldn't finish signing you in. Try again.")
      }
    }

    pollForSession()
    return () => { cancelled = true }
  }, [urlError, callbackParams, recovery, next, navigate, t, params])

  return (
    <AuthCard title={error ? (t('auth.callback.error_title') || 'Sign-in failed') : (t('auth.callback.title') || 'Finishing sign-in…')}>
      {error ? (
        <div className="space-y-4">
          <p role="alert" className="text-sm text-red-400">{error}</p>
          <Button onClick={() => navigate(authPath('/login', next))} className="w-full">
            {t('auth.back_to_login') || 'Back to login'}
          </Button>
        </div>
      ) : (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-electric-green" />
        </div>
      )}
    </AuthCard>
  )
}
