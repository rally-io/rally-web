import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { LevelDescriptor } from './describeLevel'
import { VerifiedSeal } from './VerifiedSeal'

export type LevelChipSize = 'sm' | 'md' | 'lg'

const SEAL_PX: Record<LevelChipSize, number> = { sm: 12, md: 16, lg: 22 }
// lg is a headline number → Rubik; sm/md ride along in the body font of their row
const NUMBER_CLASS: Record<LevelChipSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'font-display text-2xl leading-none',
}
const PILL_PAD: Record<LevelChipSize, string> = {
  sm: 'px-[7px] py-px',
  md: 'px-2 py-0.5',
  lg: 'px-3 py-1',
}

export interface LevelChipProps {
  descriptor: LevelDescriptor
  /** seal 12 / 16 / 22 px */
  size?: LevelChipSize
  /** the "Not verified" word inside the dashed pill; defaults on for md and lg */
  showLabel?: boolean
  className?: string
}

/** A player's level wherever it appears in a row or a header (spec §5.3). Never draws the
    reliability — that is the owner's ring and the status line. The row is a flex container so
    the seal trails the number in reading direction ("⬢ 3.75" in Hebrew). */
export function LevelChip({ descriptor, size = 'sm', showLabel = size !== 'sm', className }: LevelChipProps) {
  const { t } = useTranslation()
  const { state, value } = descriptor

  if (state === 'none') {
    return (
      <span data-testid="level-chip" data-state="none" className={cn('text-rally-text-muted', NUMBER_CLASS[size], className)}>
        —
      </span>
    )
  }

  const number = (
    <span dir="ltr" className="tabular-nums">
      {value}
    </span>
  )

  if (state === 'unverified') {
    return (
      <span
        data-testid="level-chip"
        data-state="unverified"
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-dashed border-rally-text-muted font-semibold text-rally-text-2',
          NUMBER_CLASS[size],
          PILL_PAD[size],
          className,
        )}
      >
        {number}
        {showLabel ? <span className="text-[0.7em] font-medium">{t('level.notVerified')}</span> : null}
      </span>
    )
  }

  return (
    <span
      data-testid="level-chip"
      data-state={state}
      className={cn(
        'inline-flex items-center gap-1 font-semibold',
        state === 'verified' ? 'text-rally-accent' : 'text-rally-text',
        NUMBER_CLASS[size],
        className,
      )}
    >
      {number}
      {state === 'verified' ? <VerifiedSeal size={SEAL_PX[size]} className="shrink-0" /> : null}
    </span>
  )
}
