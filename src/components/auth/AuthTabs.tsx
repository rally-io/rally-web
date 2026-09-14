import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export type AuthMode = 'signin' | 'signup'

/**
 * The two doors, side by side, with the open one underlined. Sign up leads
 * (it is the door a first-time player needs); the caller decides which one
 * starts selected. Switching tabs is the ONLY way to change mode — there is
 * no auto-routing on an email lookup any more, so a player always knows
 * which form they are filling in.
 */
export function AuthTabs({ mode, onChange, disabled }: {
  mode: AuthMode
  onChange: (next: AuthMode) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const tabs: AuthMode[] = ['signup', 'signin']
  return (
    <div role="tablist" aria-label={t('auth.tabs.label')} className="grid grid-cols-2 border-b border-rally-border">
      {tabs.map((tab) => {
        const selected = tab === mode
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`auth-tab-${tab}`}
            aria-selected={selected}
            aria-controls="auth-panel"
            disabled={disabled}
            onClick={() => { if (!selected) onChange(tab) }}
            className={cn(
              'relative py-3 text-sm font-display font-bold transition-colors disabled:opacity-50',
              selected ? 'text-rally-accent' : 'text-rally-text-2 hover:text-rally-text',
            )}
          >
            {t(`auth.tabs.${tab}`)}
            <span
              aria-hidden
              className={cn(
                'absolute inset-x-6 -bottom-px h-0.5 rounded-full transition-colors',
                selected ? 'bg-rally-accent' : 'bg-transparent',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
