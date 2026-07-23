import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export type ArchiveStatus = 'open' | 'completed' | 'all'

export function useArchiveStatus(): [ArchiveStatus, (s: ArchiveStatus) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('status')
  const status: ArchiveStatus = raw === 'completed' || raw === 'all' ? raw : 'open'
  const setStatus = (s: ArchiveStatus) => {
    const next = new URLSearchParams(params)
    if (s === 'open') next.delete('status')
    else next.set('status', s)
    setParams(next, { replace: true })
  }
  return [status, setStatus]
}

const OPTIONS: { value: ArchiveStatus; labelKey: string }[] = [
  { value: 'all', labelKey: 'clubs.filterAll' },
  { value: 'open', labelKey: 'clubs.filterOpen' },
  { value: 'completed', labelKey: 'clubs.filterCompleted' },
]

// Sticky offset pairs with the Navbar height; tuned in the final visual pass.
export function ArchiveFilterChips() {
  const { t } = useTranslation()
  const [status, setStatus] = useArchiveStatus()
  return (
    <div className="sticky top-16 md:top-[76px] z-30 -mx-4 px-4 py-3 bg-gradient-to-b from-rally-bg from-75% to-transparent">
      <div
        className="flex gap-2 overflow-x-auto [scrollbar-width:none]"
        role="group"
        aria-label={t('clubs.filterLabel')}
      >
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={status === o.value}
            onClick={() => setStatus(o.value)}
            className={cn(
              'h-9 shrink-0 rounded-full px-5 text-sm transition-colors',
              status === o.value
                ? 'bg-rally-accent text-rally-accent-text font-bold'
                : 'bg-rally-surface border border-rally-border text-rally-text-2 font-semibold hover:text-rally-text hover:border-rally-border-strong',
            )}
          >
            {t(o.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
