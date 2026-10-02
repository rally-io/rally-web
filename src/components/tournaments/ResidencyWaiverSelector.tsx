import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, FileText, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EvidencePicker } from '@/components/corporate/EvidencePicker'

export interface ResidencyWaiverSelectorProps {
  seats: 1 | 2
  format?: string
  entryFee?: number
  feeWaiverType?: string | null
  isDocumentRequired?: boolean
  documentInstructions?: string | null
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

export function formatWaiverTitle(type: string | null | undefined): string {
  if (!type) return ''
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function ResidencyWaiverSelector({
  seats,
  feeWaiverType,
  isDocumentRequired = false,
  documentInstructions,
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
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)

  const hasWaiver = Boolean(feeWaiverType)
  const isHolon = feeWaiverType === 'holon_resident'
  const waiverTitle = formatWaiverTitle(feeWaiverType)

  if (!hasWaiver && !isDocumentRequired) {
    return null
  }

  // Option labels have clean titles without duplicated waiver names
  const options: { value: 0 | 1 | 2; label: string }[] = []
  if (hasWaiver) {
    options.push({
      value: 0,
      label: t('tournament.waiverNone', { defaultValue: 'No discount' }),
    })
    if (seats === 1) {
      options.push({
        value: 1,
        label: t('tournament.waiverOne', { defaultValue: 'I qualify' }),
      })
    } else {
      options.push({
        value: 1,
        label: t('tournament.waiverOneOfUs', { defaultValue: 'One of us qualifies' }),
      })
      options.push({
        value: 2,
        label: t('tournament.waiverBoth', { defaultValue: 'Both of us qualify' }),
      })
    }
  }

  // Partner evidence slot in doubles:
  // - If tournament has waiver: only show when residentCount === 2 (API rejects for_player=2 otherwise)
  // - If waiver only (no doc required): never show (isDocumentRequired is false, whole block hidden)
  // - If doc required only (no waiver): show for doubles
  const showPartnerEvidence =
    seats === 2 && isDocumentRequired && (!hasWaiver || residentCount === 2)

  return (
    <section
      id="residency-waiver-section"
      data-testid="residency-waiver-section"
      className="rounded-2xl bg-rally-surface border border-rally-border p-5"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-xl bg-rally-accent/10 text-rally-accent shrink-0 mt-0.5">
          {hasWaiver ? <Tag className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="font-display font-bold text-base md:text-lg text-rally-text mb-1">
            {hasWaiver
              ? isHolon
                ? t('tournament.waiverTitleHolon', { defaultValue: "Holon residents' discount" })
                : t('tournament.customWaiverTitle', {
                    waiverTitle,
                    defaultValue: `${waiverTitle} Discount`,
                  })
              : t('tournament.documentRequiredTitle', {
                  defaultValue: 'Verification Document Required',
                })}
          </h3>
          <p className="text-xs text-rally-text-muted leading-relaxed">
            {hasWaiver
              ? isHolon
                ? t('tournament.waiverHintHolon', {
                    defaultValue:
                      'Holon residents receive discounted entry. Please select your residency status below.',
                  })
                : t('tournament.customWaiverSubtitle', {
                    defaultValue:
                      'Eligible participants receive discounted entry. Please select your status below.',
                  })
              : t('tournament.documentRequiredSubtitle', {
                  defaultValue:
                    'This tournament requires uploading a verification document to complete your registration.',
                })}
          </p>
        </div>
      </div>

      {hasWaiver && (
        <div className={cn('grid gap-2', seats === 2 ? 'grid-cols-3' : 'grid-cols-2')}>
          {options.map((option) => {
            const isSelected = residentCount === option.value

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
                {option.label}
              </button>
            )
          })}
        </div>
      )}

      {hasWaiver && residentCount >= 1 && (
        <div className="mt-3 rounded-xl border border-rally-warning/50 bg-rally-warning/10 px-3 py-3">
          <p className="text-xs font-bold text-rally-warning">
            {t('tournament.waiverReviewTitle', { defaultValue: 'Eligibility verification' })}
          </p>
          <p className="text-xs text-rally-text-2 mt-1 leading-relaxed">
            {t('tournament.waiverReviewBody', {
              defaultValue:
                'Registrations with a fee waiver are reviewed by tournament organizers.',
            })}
          </p>
        </div>
      )}

      {/* Show document instructions and evidence pickers whenever isDocumentRequired is true.
          When a fee waiver is also configured, uploading documents is optional when no waiver
          is selected (residentCount === 0), but the option to upload is still presented. */}
      {isDocumentRequired && (
        <div className={cn(hasWaiver ? 'mt-5 pt-4 border-t border-rally-border' : 'mt-4')}>
          {/* Expandable Document Explanation Accordion */}
          <div className="rounded-xl border border-rally-border bg-rally-surface-2 overflow-hidden mb-4">
            <button
              type="button"
              data-testid="documents-required-accordion-toggle"
              onClick={() => setIsExplanationOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-3.5 text-start hover:bg-rally-surface transition-colors cursor-pointer"
              aria-expanded={isExplanationOpen}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-rally-accent shrink-0" />
                <span className="font-display font-bold text-sm text-rally-text">
                  {t('tournament.documentsRequiredAccordionTitle', { defaultValue: 'Details' })}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-rally-text-muted transition-transform duration-200 shrink-0',
                  isExplanationOpen && 'rotate-180',
                )}
              />
            </button>
            {isExplanationOpen && (
              <div
                data-testid="documents-required-accordion-content"
                className="px-3.5 pb-3.5 pt-1 text-xs text-rally-text-muted leading-relaxed border-t border-rally-border/50 whitespace-pre-line"
              >
                {documentInstructions ||
                  t('tournament.documentRequiredSubtitle', {
                    defaultValue:
                      'This tournament requires uploading a verification document to complete your registration.',
                  })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <EvidencePicker
              id="tournament-evidence-1"
              label={
                hasWaiver && residentCount === 1 && seats === 2
                  ? t('corporate.reg.evidenceResident', {
                      defaultValue: "Eligible player's verification document",
                    })
                  : seats === 1
                  ? t('tournament.evidencePlayer', { defaultValue: 'Verification document' })
                  : t('tournament.evidencePlayer1', {
                      defaultValue: 'Verification document — Player 1',
                    })
              }
              files={myFiles}
              onChange={(next) => {
                onMyFilesChange(next)
                onMyEvidenceError?.(null)
              }}
              onError={(key) => onMyEvidenceError?.(t(`corporate.reg.${key}`))}
              error={myEvidenceError}
              disabled={disabled}
            />
            {showPartnerEvidence && (
              <EvidencePicker
                id="tournament-evidence-2"
                label={t('tournament.evidencePlayer2', {
                  defaultValue: 'Verification document — Player 2 (Partner)',
                })}
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
        </div>
      )}
    </section>
  )
}
