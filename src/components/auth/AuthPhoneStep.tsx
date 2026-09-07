import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPhoneOtp, verifyPhoneOtp } from '@/services/api/auth'
import { authErrorKey } from './authError'
import { trackFunnel } from '@/lib/analytics'

export function AuthPhoneStep({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const { t } = useTranslation()
  const [countryCode, setCountryCode] = useState('+972')
  const [number, setNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  const phone = { country_code: countryCode.trim(), contact_number: number.replace(/[\s()-]/g, '') }
  const send = async () => {
    if (pending || cooldown) return
    if (!/^\+[1-9]\d{0,3}$/.test(phone.country_code) || !/^\d{6,14}$/.test(phone.contact_number)) {
      setError('auth.phone.invalid_number'); return
    }
    setPending(true); setError(null)
    try {
      await requestPhoneOtp(phone)
      setSent(true); setCooldown(60); setOtp('')
      trackFunnel('auth_step', { method: 'phone', step: 'otp' })
    } catch (e) {
      setError(authErrorKey(e)); trackFunnel('auth_error', { method: 'phone', step: 'request' })
    } finally { setPending(false) }
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!sent) { await send(); return }
    if (pending || !/^\d{6}$/.test(otp)) return
    setPending(true); setError(null)
    try { await verifyPhoneOtp(phone, otp); onSuccess() }
    catch (e) { setError(authErrorKey(e)); trackFunnel('auth_error', { method: 'phone', step: 'verify' }) }
    finally { setPending(false) }
  }
  return <form onSubmit={submit} className="space-y-4">
    <button type="button" disabled={pending} onClick={onBack} className="text-sm text-slate-400">{t('common.back')}</button>
    <p className="text-sm text-slate-300">{t('auth.phone.subtitle')}</p>
    <div className="flex gap-3">
      <div className="w-24 shrink-0"><Label htmlFor="auth-country">{t('auth.phone.country_code')}</Label>
        <Input id="auth-country" dir="ltr" type="tel" autoComplete="tel-country-code" value={countryCode} disabled={sent || pending} onChange={e => setCountryCode(e.target.value)} /></div>
      <div className="min-w-0 flex-1"><Label htmlFor="auth-phone">{t('auth.phone.number')}</Label>
        <Input id="auth-phone" dir="ltr" type="tel" autoComplete="tel-national" autoFocus value={number} disabled={sent || pending} onChange={e => setNumber(e.target.value)} /></div>
    </div>
    {sent && <>
      <p role="status" className="text-sm text-slate-400">{t('auth.phone.sent')}</p>
      <div><Label htmlFor="auth-otp">{t('auth.phone.code')}</Label>
        <Input id="auth-otp" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={otp} disabled={pending} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} /></div>
    </>}
    {error && <p role="alert" className="text-sm text-red-400">{t(error)}</p>}
    <Button type="submit" variant="accent" className="w-full" disabled={pending || (sent ? otp.length !== 6 : cooldown > 0)}>{!sent && cooldown > 0 ? t('auth.verify.resend_cooldown', { seconds: cooldown }) : t(pending ? 'common.loading' : sent ? 'auth.phone.verify' : 'auth.phone.send')}</Button>
    {sent && <button type="button" disabled={pending || cooldown > 0} onClick={send} className="w-full text-sm text-slate-300 disabled:text-slate-500">
      {cooldown ? t('auth.verify.resend_cooldown', { seconds: cooldown }) : t('auth.phone.resend')}
    </button>}
    {sent && <button type="button" disabled={pending} onClick={() => { setSent(false); setOtp(''); setError(null) }} className="w-full text-sm text-slate-300 underline">{t('auth.phone.change_number')}</button>}
  </form>
}
