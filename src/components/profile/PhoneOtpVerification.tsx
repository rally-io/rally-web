import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  checkPhoneAvailable,
  requestPhoneVerificationOtp,
  verifyPhoneVerificationOtp,
} from '@/services/api/players'

const RESEND_COOLDOWN_SECONDS = 30

type Status = 'idle' | 'checking' | 'sending' | 'code-entry' | 'verifying'

interface Props {
  countryCode: string
  phone: string
  verified: boolean
  onVerifiedChange: (verified: boolean) => void
  /** True if `phone`/`countryCode` are already a confirmed number as of mount
   * (e.g. unchanged in Edit Profile) — skips requiring a fresh OTP until the
   * user actually edits the field to something else. */
  initiallyVerified?: boolean
}

function errorMessage(e: unknown, t: (key: string) => string): string {
  const err = e as { code?: string; message?: string } | null
  if (err?.code === 'MOBILE_ALREADY_EXISTS') {
    return t('edit_profile.validation.mobileAlreadyExists')
  }
  return err?.message || t('edit_profile.saveError')
}

export function PhoneOtpVerification({
  countryCode,
  phone,
  verified,
  onVerifiedChange,
  initiallyVerified = false,
}: Props) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('idle')
  const [otp, setOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [banner, setBanner] = useState<string | null>(null)
  const verifiedNumberRef = useRef<{ countryCode: string; phone: string } | null>(
    initiallyVerified ? { countryCode, phone } : null,
  )

  // Un-verify whenever the field is edited away from the last verified number.
  useEffect(() => {
    const last = verifiedNumberRef.current
    const matchesVerified = Boolean(
      last && last.countryCode === countryCode && last.phone === phone,
    )
    if (verified && !matchesVerified) onVerifiedChange(false)
    if (!matchesVerified && status === 'code-entry') {
      setStatus('idle')
      setOtp('')
      setBanner(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, countryCode])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((v) => v - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSendCode = async () => {
    setBanner(null)
    if (!phone.trim()) return
    setStatus('checking')
    try {
      await checkPhoneAvailable(countryCode, phone.trim())
      setStatus('sending')
      await requestPhoneVerificationOtp(countryCode, phone.trim())
      setStatus('code-entry')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (e) {
      setBanner(errorMessage(e, t))
      setStatus('idle')
    }
  }

  const handleResend = async () => {
    setOtp('')
    setBanner(null)
    setStatus('sending')
    try {
      await requestPhoneVerificationOtp(countryCode, phone.trim())
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setStatus('code-entry')
    } catch (e) {
      setBanner(errorMessage(e, t))
      setStatus('code-entry')
    }
  }

  const handleVerify = async () => {
    setBanner(null)
    if (otp.length !== 6) {
      setBanner(t('edit_profile.validation.otpInvalid'))
      return
    }
    setStatus('verifying')
    try {
      await verifyPhoneVerificationOtp(countryCode, phone.trim(), otp)
      verifiedNumberRef.current = { countryCode, phone: phone.trim() }
      onVerifiedChange(true)
      setStatus('idle')
      setOtp('')
    } catch (e) {
      setBanner(errorMessage(e, t))
      setStatus('code-entry')
    }
  }

  const isBusy = status === 'checking' || status === 'sending'

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-rally-accent text-sm font-semibold">
        <CheckCircle2 className="w-4 h-4" />
        {t('edit_profile.phoneVerified')}
      </div>
    )
  }

  if (status === 'code-entry' || status === 'verifying') {
    return (
      <div className="space-y-2">
        <Input
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
            setBanner(null)
          }}
          placeholder={t('edit_profile.otpPlaceholder')}
          inputMode="numeric"
          maxLength={6}
          dir="ltr"
          className="text-center tracking-[0.5em] font-bold"
        />
        {banner && <p className="text-sm text-red-400">{banner}</p>}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={status === 'verifying' || otp.length !== 6}
            className="h-9 px-4 rounded-lg bg-rally-accent text-rally-accent-text text-sm font-bold disabled:opacity-60"
          >
            {status === 'verifying' ? t('edit_profile.verifying') : t('edit_profile.verifyCode')}
          </button>
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={cooldown > 0}
            className="text-sm font-semibold text-rally-accent disabled:text-rally-text-muted"
          >
            {cooldown > 0
              ? t('edit_profile.resendCodeIn', { seconds: cooldown })
              : t('edit_profile.resendCode')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {banner && <p className="text-sm text-red-400">{banner}</p>}
      <button
        type="button"
        onClick={() => void handleSendCode()}
        disabled={isBusy || !phone.trim()}
        className="text-sm font-semibold text-rally-accent disabled:opacity-60"
      >
        {isBusy ? t('edit_profile.sending') : t('edit_profile.verifyPhoneNumber')}
      </button>
    </div>
  )
}
