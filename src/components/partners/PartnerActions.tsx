import { Undo2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { PadelBall } from './PadelBall'

interface PartnerActionsProps {
  onPass: () => void
  onLike: () => void
  /** omitted where there is nothing to undo (the detail drawer's footer) */
  onUndo?: () => void
  canUndo?: boolean
  disabled?: boolean
  /** the deck's ← / → keys work here: say so to assistive tech */
  keyShortcuts?: boolean
}

/**
 * Pass · Undo · Like (ported from rally-mobile's PartnerActions). `dir="ltr"` in both
 * languages, on purpose: the swipe is physical — right is like in Hebrew too — so each button
 * sits under the direction it means. Like is a padel ball, not a heart.
 */
export function PartnerActions({
  onPass,
  onLike,
  onUndo,
  canUndo = false,
  disabled = false,
  keyShortcuts = false,
}: PartnerActionsProps) {
  const { t } = useTranslation()
  const undoDisabled = disabled || !canUndo
  const big = 'flex h-[68px] w-[68px] items-center justify-center rounded-full transition disabled:opacity-35'

  return (
    <div dir="ltr" data-testid="partner-actions" className="flex items-center justify-center gap-6">
      <button
        type="button"
        onClick={onPass}
        disabled={disabled}
        aria-label={t('partners.pass')}
        aria-keyshortcuts={keyShortcuts ? 'ArrowLeft' : undefined}
        data-testid="partner-pass"
        className={cn(big, 'border-2 border-rally-border bg-rally-surface-2 text-rally-text enabled:hover:border-rally-error')}
      >
        <X className="h-8 w-8" />
      </button>
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          disabled={undoDisabled}
          aria-label={t('partners.undo')}
          data-testid="partner-undo"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-rally-border text-rally-text-2 transition enabled:hover:text-rally-text disabled:opacity-35"
        >
          <Undo2 className="h-5 w-5" />
        </button>
      )}
      <button
        type="button"
        onClick={onLike}
        disabled={disabled}
        aria-label={t('partners.like')}
        aria-keyshortcuts={keyShortcuts ? 'ArrowRight' : undefined}
        data-testid="partner-like"
        className={cn(big, 'bg-rally-accent text-rally-accent-text enabled:hover:brightness-110')}
      >
        <PadelBall className="h-8 w-8" />
      </button>
    </div>
  )
}
