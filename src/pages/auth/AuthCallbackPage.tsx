import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'

export default function AuthCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const urlError = params.get('error_description') ?? params.get('error')

  useEffect(() => {
    if (urlError) {
      setError(decodeURIComponent(urlError))
      return
    }

    let attempts = 0
    let cancelled = false

    async function pollForSession() {
      while (!cancelled && attempts < 10) {
        const { data, error: getErr } = await supabase.auth.getSession()
        if (getErr) {
          setError(getErr.message)
          return
        }
        if (data.session) {
          let returnTo = '/'
          try {
            const stashed = sessionStorage.getItem('rally:auth-return')
            if (stashed && stashed.startsWith('/') && !stashed.startsWith('//')) {
              returnTo = stashed
            }
            sessionStorage.removeItem('rally:auth-return')
          } catch {
            // sessionStorage may be unavailable — fall back to home.
          }
          navigate(returnTo, { replace: true })
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
  }, [urlError, navigate, t])

  return (
    <AuthCard title={error ? (t('auth.callback.error_title') || 'Sign-in failed') : (t('auth.callback.title') || 'Finishing sign-in…')}>
      {error ? (
        <div className="space-y-4">
          <p className="text-sm text-red-400">{error}</p>
          <Button onClick={() => navigate('/login')} className="w-full">
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
