import { useEffect, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface ScrubberMonth {
  key: string
  label: string
}

// Plain left clicks scroll in place instead of following the anchor, so the
// URL never carries a month hash (which would go stale before the lazily
// fetched past sections mount) and the back button isn't polluted with one
// history entry per rail click. Modified clicks keep native anchor behavior.
function jumpTo(e: MouseEvent<HTMLAnchorElement>, key: string) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return
  e.preventDefault()
  const el = document.getElementById(`m-${key}`)
  if (!el) return
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

export function MonthScrubber({ months }: { months: ScrubberMonth[] }) {
  const { t } = useTranslation()
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || months.length < 2) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id.replace(/^m-/, ''))
        }
      },
      // Band spans 20%–50% of the viewport: below the sticky month header
      // (~16%), so a jumped-to month owns the band immediately, yet wide
      // enough that some month always occupies it mid-scroll.
      { rootMargin: '-20% 0px -50% 0px' },
    )
    for (const m of months) {
      const el = document.getElementById(`m-${m.key}`)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [months])

  if (months.length < 2) return null

  return (
    <nav
      aria-label={t('clubs.jumpToMonth')}
      className="fixed end-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-1 xl:flex"
    >
      {months.map((m) => (
        <a
          key={m.key}
          href={`#m-${m.key}`}
          onClick={(e) => jumpTo(e, m.key)}
          className={cn(
            'rounded-md px-2 py-1 text-[11.5px] font-bold transition-colors',
            active === m.key ? 'text-rally-accent' : 'text-rally-text-muted hover:text-rally-text-2',
          )}
        >
          {m.label}
        </a>
      ))}
    </nav>
  )
}
