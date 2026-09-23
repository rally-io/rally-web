import { useTranslation } from 'react-i18next'
import { UserCheck, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FollowButtonProps {
  isFollowing: boolean
  /** the relationship has been read; until then the button is not rendered */
  isLoaded: boolean
  isPending: boolean
  error: Error | null
  onToggle: () => void
  className?: string
}

/** Follow / Following pill. Presentational: the hook owns the request and the optimistic
    state, so the button never guesses. */
export function FollowButton({ isFollowing, isLoaded, isPending, error, onToggle, className }: FollowButtonProps) {
  const { t } = useTranslation()
  if (!isLoaded) return null
  const Icon = isFollowing ? UserCheck : UserPlus
  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <button
        type="button"
        aria-pressed={isFollowing}
        disabled={isPending}
        onClick={onToggle}
        className={cn(
          'inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-colors disabled:opacity-60',
          isFollowing
            ? 'border border-rally-accent/40 bg-rally-accent-dim text-rally-text'
            : 'bg-rally-accent text-rally-accent-text hover:bg-rally-accent-hover',
        )}
      >
        <Icon className="h-4 w-4" />
        {isFollowing ? t('network.follow.following') : t('network.follow.follow')}
      </button>
      {error && (
        <span role="status" className="text-[11px] text-rally-error">
          {t('network.follow.error')}
        </span>
      )}
    </div>
  )
}
