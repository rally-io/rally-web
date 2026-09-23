import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { VerifiedSeal } from './VerifiedSeal'

/** The 16px floor from the spec. A caller asking for less gets 16. */
const MIN_SIZE = 16

export interface VerificationMarkProps {
  /** true = verified, false = the server said no, null/undefined = it did not say */
  verified: boolean | null | undefined
  /** print the word beside the mark; false on dense rows that carry it elsewhere */
  showLabel?: boolean
  size?: number
  className?: string
}

/**
 * The single place that turns `level_verified` into pixels (spec §4). Call
 * sites pass the raw field and never branch on it themselves — that is what
 * keeps `null` from being rendered as a negative assertion somewhere.
 *
 * Labels reuse the existing flat `level.verified` / `level.notVerified` keys
 * (they already carry exactly this copy) rather than duplicating them under a
 * new nested path — `level.verified` is a string consumed elsewhere
 * (`LevelStatusLine.tsx`), and nesting `.label` under it would force it into
 * an object and break that call site. Only the two tooltips and the lockup,
 * which had no existing key, are new — as flat siblings for the same reason.
 */
export function VerificationMark({
  verified,
  showLabel = true,
  size = MIN_SIZE,
  className,
}: VerificationMarkProps) {
  const { t } = useTranslation()
  if (verified === null || verified === undefined) return null

  const px = Math.max(MIN_SIZE, size)
  const label = verified ? t('level.verified') : t('level.notVerified')
  const tooltip = verified ? t('level.verifiedTooltip') : t('level.unverifiedTooltip')

  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      title={tooltip}
      data-verified={verified ? 'true' : 'false'}
    >
      <VerifiedSeal size={px} ghost={!verified} className="shrink-0" />
      {showLabel ? (
        <span
          className={cn(
            'text-[11px] font-semibold leading-none',
            verified ? 'text-rally-text-2' : 'text-rally-text-muted',
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  )
}
