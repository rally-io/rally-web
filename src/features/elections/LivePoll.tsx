import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { BrandLogo } from './BrandLogo'
import { CLUBS } from './ballotData'
import { ELECTION_WINNER_DATE, logoFor } from './config'

// Phone: a compact strip that fits the one-screen intro. Desktop: a large board
// with more clubs and logos big enough to recognise at a glance.
const LAYOUT = {
  mobile: { rowH: 38, rows: 5 },
  desktop: { rowH: 66, rows: 7 },
}
const RESORT_EVERY = 3

function sampleClubs() {
  // One club per brand so the teaser never looks like a chain is "winning",
  // and only brands with a real logo, since the logos are what people spot.
  const byBrand = new Map<string, (typeof CLUBS)[number]>()
  for (const c of [...CLUBS].sort(() => Math.random() - 0.5)) {
    if (logoFor(c.brand) && !byBrand.has(c.brand)) byBrand.set(c.brand, c)
  }
  return [...byBrand.values()].slice(0, LAYOUT.desktop.rows)
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

function useIsDesktop() {
  const query = '(min-width: 768px)'
  const [match, setMatch] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const onChange = () => setMatch(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return match
}

/**
 * Decorative "live poll": bars rise and fall and rows swap places. It carries
 * no numbers on purpose; real results stay hidden until the reveal, and the
 * footnote says the motion is illustrative.
 */
export function LivePoll() {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const { rowH, rows } = desktop ? LAYOUT.desktop : LAYOUT.mobile
  const all = useMemo(sampleClubs, [])
  const clubs = all.slice(0, rows)

  // Bars move every tick; rows only re-sort every RESORT_EVERY ticks, so a swap
  // finishes before the next one starts and labels don't sit on top of each other.
  // `sorted`/`prevSorted` are the values at the last two re-sorts.
  const [{ values, sorted, prevSorted }, setPoll] = useState(() => {
    const start = all.map(() => 0.35 + Math.random() * 0.6)
    return { tick: 0, values: start, sorted: start, prevSorted: start }
  })

  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = window.setInterval(() => {
      setPoll((p) => {
        const values = p.values.map((v) =>
          Math.min(1, Math.max(0.22, v + (Math.random() - 0.45) * 0.32)),
        )
        const tick = p.tick + 1
        if (tick % RESORT_EVERY !== 0) return { ...p, tick, values }
        return { tick, values, sorted: values, prevSorted: p.sorted }
      })
    }, 1300)
    return () => window.clearInterval(id)
  }, [])

  const rank = rankOf(sorted.slice(0, rows))
  const prevRank = rankOf(prevSorted.slice(0, rows))

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm md:rounded-3xl md:p-7">
      <div className="mb-2.5 flex items-center justify-between md:mb-5">
        <span className="font-display text-sm font-bold md:text-2xl md:font-black">
          {t('elections.poll.title')}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold md:gap-2 md:px-3 md:py-1 md:text-sm">
          <span className="elx-live-dot" />
          {t('elections.poll.live')}
        </span>
      </div>
      <div className="relative" style={{ height: rowH * clubs.length }} aria-hidden>
        {clubs.map((club, i) => {
          const moved = prevRank[i] - rank[i]
          return (
            <div
              key={club.id}
              className="elx-poll-row absolute inset-x-0 flex items-center gap-2.5 md:gap-4"
              style={{ height: rowH, transform: `translateY(${rank[i] * rowH}px)` }}
            >
              <BrandLogo
                brandId={club.brand}
                className="h-7 w-7 text-[10px] md:h-[52px] md:w-[52px] md:text-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] leading-tight text-white/85 md:text-[17px] md:font-bold md:text-white">
                  {club.name}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10 md:mt-2 md:h-3">
                  <div
                    className="elx-poll-bar h-full rounded-full"
                    style={{ width: `${values[i] * 100}%` }}
                  />
                </div>
              </div>
              <span
                className={cn(
                  'w-3 text-[10px] md:w-5 md:text-base',
                  moved > 0 ? 'text-rally-accent' : moved < 0 ? 'text-[#ff6b6b]' : 'text-white/30',
                )}
              >
                {moved > 0 ? '▲' : moved < 0 ? '▼' : '•'}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-white/50 md:mt-4 md:text-[13px]">
        {t('elections.poll.note', { date: ELECTION_WINNER_DATE })}
      </p>
    </div>
  )
}

function rankOf(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0])
  const rank = new Array<number>(values.length)
  order.forEach(([, i], pos) => (rank[i] = pos))
  return rank
}
