import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const CLUBS: { he: string; en: string }[] = [
  { he: 'תל אביב', en: 'Tel Aviv' },
  { he: 'רמת השרון', en: 'Ramat HaSharon' },
  { he: 'הרצליה', en: 'Herzliya' },
  { he: 'ראשל״צ', en: 'Rishon' },
  { he: 'רחובות', en: 'Rehovot' },
]

const SLOTS = ['18:00', '19:00', '20:00', '21:00', '22:00']

// true = free (bookable), false = taken. A believable, uneven starting pattern.
const INITIAL: boolean[][] = [
  [false, true, false, true, false],
  [true, false, false, false, true],
  [false, false, true, false, true],
  [true, false, false, true, false],
  [false, true, false, false, false],
]

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

export default function AvailabilityGrid() {
  const { t, i18n } = useTranslation()
  const isHe = i18n.language === 'he'
  const reduced = usePrefersReducedMotion()

  const [grid, setGrid] = useState<boolean[][]>(INITIAL)
  const [opened, setOpened] = useState<string | null>(null)
  const openedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The signature moment: a court frees up in real time.
  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => {
      const r = Math.floor(Math.random() * CLUBS.length)
      const c = Math.floor(Math.random() * SLOTS.length)
      setGrid((prev) => {
        const next = prev.map((row) => row.slice())
        const becomingFree = !next[r][c]
        next[r][c] = becomingFree
        if (becomingFree) {
          const key = `${r}-${c}`
          setOpened(key)
          if (openedTimer.current) clearTimeout(openedTimer.current)
          openedTimer.current = setTimeout(() => setOpened(null), 1600)
        }
        return next
      })
    }, 2200)
    return () => {
      clearInterval(id)
      if (openedTimer.current) clearTimeout(openedTimer.current)
    }
  }, [reduced])

  const freeCount = useMemo(
    () => grid.reduce((sum, row) => sum + row.filter(Boolean).length, 0),
    [grid],
  )

  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      className="relative w-full max-w-lg mx-auto rounded-3xl border border-rally-border bg-rally-surface/70 backdrop-blur-xl p-4 sm:p-5 shadow-2xl"
      role="img"
      aria-label={t('home.gridAria')}
    >
      {/* header: real-time pill + free legend */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold text-rally-accent">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-rally-accent opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rally-accent" />
          </span>
          {t('home.gridLive')}
        </span>
        <span className="text-[11px] sm:text-xs text-rally-text-muted tabular-nums">
          <span className="font-bold text-rally-text">{freeCount}</span>{' '}
          {t('home.gridFreeNow')}
        </span>
      </div>

      {/* grid: club column + time columns */}
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `minmax(64px, auto) repeat(${SLOTS.length}, 1fr)` }}
      >
        {/* corner */}
        <div />
        {SLOTS.map((slot) => (
          <div
            key={slot}
            className="text-center text-[10px] sm:text-xs font-mono text-rally-text-muted pb-1"
          >
            {slot}
          </div>
        ))}

        {CLUBS.map((club, r) => (
          <FragmentRow
            key={club.en}
            label={isHe ? club.he : club.en}
            row={grid[r]}
            rowIndex={r}
            opened={opened}
          />
        ))}
      </div>

      {/* legend */}
      <div className="flex items-center gap-4 mt-3 px-1 text-[10px] sm:text-xs text-rally-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[4px] bg-rally-accent/25 border border-rally-accent/60" />
          {t('home.gridFree')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[4px] bg-rally-surface-2 border border-rally-border" />
          {t('home.gridTaken')}
        </span>
      </div>
    </div>
  )
}

function FragmentRow({
  label,
  row,
  rowIndex,
  opened,
}: {
  label: string
  row: boolean[]
  rowIndex: number
  opened: string | null
}) {
  return (
    <>
      <div className="flex items-center text-[11px] sm:text-sm font-medium text-rally-text-2 pe-1 truncate">
        {label}
      </div>
      {row.map((free, c) => {
        const justOpened = opened === `${rowIndex}-${c}`
        return (
          <div
            key={c}
            className={cn(
              'h-8 sm:h-9 rounded-lg border transition-all duration-500',
              free
                ? 'bg-rally-accent/20 border-rally-accent/60'
                : 'bg-rally-surface-2/70 border-rally-border',
              justOpened && 'ring-2 ring-rally-accent shadow-glow-electric scale-[1.04]',
            )}
          />
        )
      })}
    </>
  )
}
