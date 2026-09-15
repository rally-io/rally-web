import { useTranslation } from 'react-i18next'
import { ltrIsolate } from '@/lib/bidi'
import { cn } from '@/lib/utils'
import type { LevelDescriptor } from './describeLevel'
import { VerifiedSeal } from './VerifiedSeal'

export interface LevelStatusLineProps {
  descriptor: LevelDescriptor
  className?: string
}

/** Two lines under a level (spec §5.5): `[seal] Verified` or `[ghost] Not verified yet`, then
    `72% level reliability` when the backend sent a reliability. Nothing for `none` (a player with no
    level has no status to state) and `unknown` (an older backend: no claim either way). */
export function LevelStatusLine({ descriptor, className }: LevelStatusLineProps) {
  const { t } = useTranslation()
  const { state, reliability } = descriptor
  if (state === 'none' || state === 'unknown') return null
  const verified = state === 'verified'
  return (
    <div className={cn('flex flex-col gap-0.5 text-sm', className)} data-testid="level-status-line">
      <span className={cn('inline-flex items-center gap-1.5 font-semibold', verified ? 'text-rally-accent' : 'text-rally-text-2')}>
        <VerifiedSeal size={16} ghost={!verified} className="shrink-0" />
        {verified ? t('level.verified') : t('level.notVerifiedYet')}
      </span>
      {reliability != null ? (
        // the percent is isolated *before* interpolation so "72%" survives the Hebrew sentence
        <span className="text-rally-text-2">{t('level.reliability', { pct: ltrIsolate(`${reliability}%`) })}</span>
      ) : null}
    </div>
  )
}
