import { useTranslation } from 'react-i18next'
import { Field } from '@/components/corporate/Field'
import { inputClass } from '@/components/corporate/inputClass'
import { Select } from '@/components/ui/select'
import type { AnswerValue } from '../form'
import type { CustomQuestion } from '../types'

/** One manager-defined question. `idSuffix` keeps a per-participant question's two inputs apart. */
export function QuestionField({
  question, value, onChange, error, idSuffix, labelSuffix, disabled,
}: {
  question: CustomQuestion
  value: AnswerValue | undefined
  onChange: (next: AnswerValue) => void
  error?: string
  idSuffix: string
  /** "(participant 2)" on a per-participant question. */
  labelSuffix?: string
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const id = `corp-q-${question.id}-${idSuffix}`
  const label = `${question.label}${question.required ? '' : ` (${t('corporate.dyn.optional')})`}${labelSuffix ? ` — ${labelSuffix}` : ''}`
  const errorText = error ? t(error) : undefined

  if (question.type === 'checkbox') {
    return (
      <div>
        <label htmlFor={id} className="flex items-start gap-3 text-sm text-rally-text cursor-pointer">
          <input
            id={id} type="checkbox" disabled={disabled} checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={!!errorText} aria-describedby={errorText ? `${id}-error` : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-rally-accent,#ccff00)]"
          />
          <span dir="auto">{label}</span>
        </label>
        {errorText && <p id={`${id}-error`} role="alert" className="text-xs text-rally-error mt-1.5">{errorText}</p>}
      </div>
    )
  }

  if (question.type === 'multiselect') {
    const selected = Array.isArray(value) ? value : []
    return (
      <Field label={label} error={errorText} htmlFor={id}>
        <div id={id} role="group" tabIndex={-1} aria-invalid={!!errorText} className="space-y-2 focus:outline-none">
          {question.options.map((opt) => (
            <label key={opt} className="flex items-center gap-3 text-sm text-rally-text cursor-pointer">
              <input
                type="checkbox" disabled={disabled} checked={selected.includes(opt)}
                onChange={(e) => onChange(e.target.checked ? [...selected, opt] : selected.filter((o) => o !== opt))}
                className="h-5 w-5 shrink-0 accent-[var(--color-rally-accent,#ccff00)]"
              />
              <span dir="auto">{opt}</span>
            </label>
          ))}
        </div>
      </Field>
    )
  }

  if (question.type === 'select') {
    return (
      <Field label={label} error={errorText} htmlFor={id}>
        <Select id={id} disabled={disabled} aria-invalid={!!errorText} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">{t('corporate.dyn.choose')}</option>
          {question.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </Select>
      </Field>
    )
  }

  if (question.type === 'textarea') {
    return (
      <Field label={label} error={errorText} htmlFor={id}>
        <textarea
          id={id} rows={3} dir="auto" disabled={disabled} value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!errorText} aria-describedby={errorText ? `${id}-error` : undefined}
          className={inputClass(!!errorText)}
        />
      </Field>
    )
  }

  return (
    <Field label={label} error={errorText} htmlFor={id}>
      <input
        id={id} type="text" dir="auto" disabled={disabled} value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!errorText} aria-describedby={errorText ? `${id}-error` : undefined}
        className={inputClass(!!errorText)}
      />
    </Field>
  )
}
