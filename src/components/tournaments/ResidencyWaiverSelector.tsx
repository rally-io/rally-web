import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { EvidencePicker } from '@/components/corporate/EvidencePicker'

export interface ResidencyWaiverSelectorProps {
  seats: 1 | 2
  residentCount: 0 | 1 | 2
  onSelectResidents: (count: 0 | 1 | 2) => void
  myFiles: File[]
  onMyFilesChange: (files: File[]) => void
  myEvidenceError?: string | null
  onMyEvidenceError?: (err: string | null) => void
  partnerFiles: File[]
  onPartnerFilesChange: (files: File[]) => void
  partnerEvidenceError?: string | null
  onPartnerEvidenceError?: (err: string | null) => void
  disabled?: boolean
}

const WAIVER_OPTIONS: { value: 0 | 1 | 2; key: string }[] = [
  { value: 0, key: 'waiverNone' },
  { value: 1, key: 'waiverOne' },
  { value: 2, key: 'waiverBoth' },
]

export function ResidencyWaiverSelector({
  seats,
  residentCount,
  onSelectResidents,
  myFiles,
  onMyFilesChange,
  myEvidenceError,
  onMyEvidenceError,
  partnerFiles,
  onPartnerFilesChange,
  partnerEvidenceError,
  onPartnerEvidenceError,
  disabled = false,
}: ResidencyWaiverSelectorProps) {
  const { t } = useTranslation()

  const options = WAIVER_OPTIONS.filter((o) => seats === 2 || o.value !== 2)

  return (
    <section
      id="residency-waiver-section"
      data-testid="residency-waiver-section"
      className="rounded-2xl bg-rally-surface border border-rally-border p-5"
    >
      <h3 className="font-display font-bold text-base md:text-lg text-rally-text mb-1">
        {t('corporate.reg.waiverTitle')}
      </h3>
      <p className="text-xs text-rally-text-muted mb-3 leading-relaxed">
        {t('corporate.reg.waiverHint')}
      </p>

      <div className={cn('grid gap-2', seats === 2 ? 'grid-cols-3' : 'grid-cols-2')}>
        {options.map((option) => {
          const isSelected = residentCount === option.value
          const labelKey =
            option.value === 1 && seats === 2 ? 'waiverOneOfUs' : option.key

          return (
            <button
              type="button"
              key={option.value}
              disabled={disabled}
              data-testid={`waiver-option-${option.value}`}
              onClick={() => onSelectResidents(option.value)}
              className={cn(
                'min-h-[44px] rounded-xl border px-3 py-2 text-xs md:text-sm font-semibold transition-all text-center flex items-center justify-center',
                isSelected
                  ? 'border-rally-accent bg-rally-accent/15 text-rally-accent font-bold shadow-sm'
                  : 'border-rally-border bg-rally-surface-2 text-rally-text hover:border-rally-border-strong',
              )}
            >
              {t(`corporate.reg.${labelKey}`)}
            </button>
          )
        })}
      </div>

      {residentCount >= 1 && (
        <div className="mt-3 rounded-xl border border-rally-warning/50 bg-rally-warning/10 px-3 py-3">
          <p className="text-xs font-bold text-rally-warning">
            {t('corporate.reg.waiverReviewTitle')}
          </p>
          <p className="text-xs text-rally-text-2 mt-1 leading-relaxed">
            {t('corporate.reg.waiverReviewBody')}
          </p>
        </div>
      )}

      {residentCount >= 1 && (
        <div className="mt-4 space-y-4">
          <EvidencePicker
            id="tournament-evidence-1"
            label={t(
              residentCount === 1 && seats === 2
                ? 'corporate.reg.evidenceResident'
                : 'corporate.reg.evidenceMine',
            )}
            files={myFiles}
            onChange={(next) => {
              onMyFilesChange(next)
              onMyEvidenceError?.(null)
            }}
            onError={(key) => onMyEvidenceError?.(t(`corporate.reg.${key}`))}
            error={myEvidenceError}
            disabled={disabled}
          />
          {residentCount === 2 && (
            <EvidencePicker
              id="tournament-evidence-2"
              label={t('corporate.reg.evidencePartner')}
              files={partnerFiles}
              onChange={(next) => {
                onPartnerFilesChange(next)
                onPartnerEvidenceError?.(null)
              }}
              onError={(key) => onPartnerEvidenceError?.(t(`corporate.reg.${key}`))}
              error={partnerEvidenceError}
              disabled={disabled}
            />
          )}
        </div>
      )}
    </section>
  )
}
