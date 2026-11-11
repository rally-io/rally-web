import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Field } from '@/components/corporate/Field'
import { inputClass } from '@/components/corporate/inputClass'
import { Select } from '@/components/ui/select'
import { useSkillLadder } from '@/hooks/useSkillLadder'
import {
  COUNTRY_CODES, normalizePhone, type FieldErrors, type ParticipantState,
} from '../form'

/**
 * One person's block: name, phone with country code, email, optional self-declared level.
 * Phones and emails are LTR islands (`dir="ltr"`) inside an RTL page, so +972 never mirrors.
 */
export function ParticipantFields({
  index, total, value, onChange, errors, askLevel, requirePhone, requireEmail, disabled, children,
}: {
  index: number
  total: number
  value: ParticipantState
  onChange: (next: ParticipantState) => void
  errors: FieldErrors
  askLevel: boolean
  /** false = optional: not marked required, and left empty it is valid. */
  requirePhone: boolean
  requireEmail: boolean
  disabled?: boolean
  /** Per-participant custom questions render at the foot of this person's block. */
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  const ladder = useSkillLadder()
  const id = `corp-p${index}`
  const err = (field: string) => (errors[`p.${index}.${field}`] ? t(errors[`p.${index}.${field}`]) : undefined)
  const set = (patch: Partial<ParticipantState>) => onChange({ ...value, ...patch })
  const optionalLabel = (label: string, required: boolean) => (required ? label : `${label} (${t('corporate.dyn.optional')})`)
  const phoneError = err('phone')
  const emailError = err('email')

  return (
    <fieldset disabled={disabled} className="space-y-5 rounded-xl border border-rally-border-subtle bg-rally-surface-2/40 p-4" data-testid={`participant-${index}`}>
      <legend className="px-2 font-display text-sm font-bold text-rally-accent">
        {total === 1 ? t('corporate.dyn.participantSingle') : t('corporate.dyn.participantN', { n: index + 1 })}
      </legend>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('corporate.reg.firstName')} error={err('firstName')} htmlFor={`${id}-first`}>
          <input
            id={`${id}-first`} type="text" autoComplete={index === 0 ? 'given-name' : 'off'}
            value={value.firstName} onChange={(e) => set({ firstName: e.target.value })}
            aria-invalid={!!err('firstName')} aria-describedby={err('firstName') ? `${id}-first-error` : undefined}
            className={inputClass(!!err('firstName'))}
          />
        </Field>
        <Field label={t('corporate.reg.lastName')} error={err('lastName')} htmlFor={`${id}-last`}>
          <input
            id={`${id}-last`} type="text" autoComplete={index === 0 ? 'family-name' : 'off'}
            value={value.lastName} onChange={(e) => set({ lastName: e.target.value })}
            className={inputClass(false)}
          />
        </Field>
      </div>

      <Field label={optionalLabel(t('corporate.phone'), requirePhone)} error={phoneError} hint={t('corporate.phoneHint')} htmlFor={`${id}-phone`}>
        <div
          dir="ltr"
          className={cn(
            'flex items-stretch rounded-md overflow-hidden border bg-rally-surface-2 transition-colors',
            'focus-within:border-rally-accent focus-within:ring-4 focus-within:ring-rally-accent-dim',
            phoneError ? 'border-rally-error' : 'border-rally-border',
          )}
        >
          <select
            aria-label={t('corporate.dyn.countryCode')}
            value={value.countryCode}
            onChange={(e) => set({ countryCode: e.target.value, phone: normalizePhone(e.target.value, value.phone) })}
            className="bg-rally-surface px-2 font-display font-bold text-base sm:text-sm text-rally-text-2 border-e border-rally-border focus:outline-none"
          >
            {COUNTRY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            id={`${id}-phone`} type="tel" inputMode="numeric" autoComplete={index === 0 ? 'tel-national' : 'off'}
            value={value.phone} onChange={(e) => set({ phone: normalizePhone(value.countryCode, e.target.value) })}
            placeholder={t('corporate.phonePlaceholder')}
            aria-invalid={!!phoneError} aria-describedby={phoneError ? `${id}-phone-error` : undefined}
            className="flex-1 min-w-0 bg-transparent px-3 py-3 text-base sm:text-sm text-rally-text placeholder:text-rally-text-muted focus:outline-none"
          />
        </div>
      </Field>

      <Field label={optionalLabel(t('corporate.email'), requireEmail)} error={emailError} htmlFor={`${id}-email`}>
        <input
          id={`${id}-email`} type="email" dir="ltr" autoComplete={index === 0 ? 'email' : 'off'}
          value={value.email} onChange={(e) => set({ email: e.target.value })}
          placeholder={t('corporate.emailPlaceholder')}
          aria-invalid={!!emailError} aria-describedby={emailError ? `${id}-email-error` : undefined}
          className={cn(inputClass(!!emailError), 'text-start')}
        />
      </Field>

      {askLevel && (
        <Field label={t('corporate.dyn.skillLevel')} hint={t('corporate.dyn.skillLevelHint')} htmlFor={`${id}-level`}>
          <Select id={`${id}-level`} value={value.skillLevel} onChange={(e) => set({ skillLevel: e.target.value })}>
            <option value="">{t('corporate.dyn.skillLevelSkip')}</option>
            {ladder.bands.map((band) => (
              <option key={band.code} value={String(band.min)}>{band.label}</option>
            ))}
          </Select>
        </Field>
      )}
      {children}
    </fieldset>
  )
}
