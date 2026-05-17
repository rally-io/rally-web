import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { COUNTRY_CODES, DEFAULT_COUNTRY } from '@/constants/countryCodes'
import { useRtl } from '@/hooks/useRtl'

interface PhoneInputProps {
  onChange: (v: { countryCode: string; phone: string }) => void
  placeholder?: string
}

export function PhoneInput({ onChange, placeholder }: PhoneInputProps) {
  const { t } = useTranslation()
  const { isRTL } = useRtl()
  const [dial, setDial] = useState(DEFAULT_COUNTRY.dial)
  const [phone, setPhone] = useState('')

  const emit = (nextDial: string, nextPhone: string) =>
    onChange({ countryCode: nextDial, phone: nextPhone })

  return (
    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <select
        aria-label={t('tournament.partnerSelectCountryTitle')}
        value={dial}
        onChange={(e) => { setDial(e.target.value); emit(e.target.value, phone) }}
        className="rounded-md bg-rally-surface-2 border border-rally-border text-rally-text px-2 py-2"
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.iso} value={c.dial}>{c.flag} {c.dial}</option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        dir={isRTL ? 'rtl' : 'ltr'}
        placeholder={placeholder ?? t('tournament.partnerMobileNumberPlaceholder')}
        value={phone}
        onChange={(e) => { setPhone(e.target.value); emit(dial, e.target.value) }}
        className="flex-1 rounded-md bg-rally-surface-2 border border-rally-border text-rally-text px-3 py-2 placeholder:text-rally-text-muted"
      />
    </div>
  )
}
