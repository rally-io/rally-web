import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EvidencePicker } from '@/components/corporate/EvidencePicker'
import type { EvidenceError } from '@/lib/evidenceRules'
import { Markdown } from '../markdown'

/**
 * One picker per participant slot (or a single one when the event wants a document per
 * registration). Controlled: the parent owns the files, so the same block serves the form
 * (files held until the registration exists) and the registered card (retry / add later).
 */
export function EvidenceBlock({
  instructions, slots, names, files, onChange, errors, maxFiles, disabled, idPrefix,
}: {
  instructions?: string
  slots: (1 | 2)[]
  names: Partial<Record<1 | 2, string>>
  files: Record<1 | 2, File[]>
  onChange: (slot: 1 | 2, files: File[]) => void
  errors: Partial<Record<1 | 2, string | null>>
  maxFiles: number
  disabled?: boolean
  idPrefix: string
}) {
  const { t } = useTranslation()
  const [pickErrors, setPickErrors] = useState<Partial<Record<1 | 2, EvidenceError | null>>>({})
  const setPickError = (slot: 1 | 2, value: EvidenceError | null) => setPickErrors((m) => ({ ...m, [slot]: value }))
  return (
    <div className="space-y-4">
      {instructions ? <Markdown source={instructions} /> : null}
      {slots.map((slot) => {
        const label = slots.length > 1 && names[slot]
          ? t('corporate.dyn.evidenceFor', { name: names[slot] })
          : t('corporate.dyn.evidenceDocument')
        const pickError = pickErrors[slot]
        return (
          <EvidencePicker
            key={slot}
            id={`${idPrefix}-${slot}`}
            label={label}
            files={files[slot]}
            maxFiles={maxFiles}
            disabled={disabled}
            onChange={(next) => { setPickError(slot, null); onChange(slot, next) }}
            onError={(key) => setPickError(slot, key)}
            error={
              pickError
                ? (pickError === 'evidenceTooMany' ? t('corporate.dyn.evidenceTooMany', { count: maxFiles }) : t('corporate.reg.evidenceBadFile'))
                : errors[slot] ?? null
            }
          />
        )
      })}
    </div>
  )
}
