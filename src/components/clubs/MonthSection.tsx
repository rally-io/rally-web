import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  anchorId: string
  monthLabel: string
  countLabel: string
  isCurrent: boolean
  children: ReactNode
}

// Sticky offset sits below the ArchiveFilterChips bar; tuned in the final visual pass.
export function MonthSection({ anchorId, monthLabel, countLabel, isCurrent, children }: Props) {
  const { t } = useTranslation()
  return (
    <section id={anchorId} className="scroll-mt-36">
      <div className="sticky top-[116px] md:top-[128px] z-20 flex items-center gap-3 bg-rally-bg py-2">
        <h2 className="font-display text-xl font-extrabold text-rally-text">{monthLabel}</h2>
        {isCurrent && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rally-accent-dim px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide text-rally-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-rally-accent" />
            {t('clubs.monthNow')}
          </span>
        )}
        <span className="h-px flex-1 bg-rally-border-subtle" />
        <span className="text-[13px] text-rally-text-muted">{countLabel}</span>
      </div>
      <div className="grid gap-5 py-3 pb-8 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  )
}
