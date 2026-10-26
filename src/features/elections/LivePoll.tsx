import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrandLogo } from './BrandLogo'
import { CLUBS } from './ballotData'
import { ELECTION_WINNER_DATE } from './config'

const ROW_H = 38
const ROWS = 5
const RESORT_EVERY = 3

function sampleClubs() {
  // One club per brand so the teaser never looks like a chain is "winning".
  const byBrand = new Map<string, (typeof CLUBS)[number]>()
  for (const c of [...CLUBS].sort(() => Math.random() - 0.5)) {
    if (!byBrand.has(c.brand)) byBrand.set(c.brand, c)
  }
  return [...byBrand.values()].slice(0, ROWS)
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Decorative "live poll": bars rise and fall and rows swap places. It carries
 * no numbers on purpose; real results stay hidden until the reveal, and the
 * footnote says the motion is illustrative.
 */
export function LivePoll() {
  const { t } = useTranslation()
  const clubs = useMemo(sampleClubs, [])
  // Bars move every tick; rows only re-sort every RESORT_EVERY ticks, so a swap
  // finishes before the next one starts and labels don't sit on top of each other.
  const [{ values, rank, prevRank }, setPoll] = useState(() => {
    const start = clubs.map(() => 0.35 + Math.random() * 0.6)
    const r = rankOf(start)
    return { tick: 0, values: start, rank: r, prevRank: r }
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
        return { tick, values, rank: rankOf(values), prevRank: p.rank }
      })
    }, 1300)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-display text-sm font-bold">{t('elections.poll.title')}</span>
        <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold">
          <span className="elx-live-dot" />
          {t('elections.poll.live')}
        </span>
      </div>
      <div className="relative" style={{ height: ROW_H * clubs.length }} aria-hidden>
        {clubs.map((club, i) => {
          const moved = prevRank[i] - rank[i]
          return (
            <div
              key={club.id}
              className="elx-poll-row absolute inset-x-0 flex items-center gap-2.5"
              style={{
                height: ROW_H,
                transform: `translateY(${rank[i] * ROW_H}px)`,
              }}
            >
              <BrandLogo brandId={club.brand} className="h-7 w-7 text-[10px]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] leading-tight text-white/85">{club.name}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="elx-poll-bar h-full rounded-full"
                    style={{ width: `${values[i] * 100}%` }}
                  />
                </div>
              </div>
              <span
                className={
                  moved > 0
                    ? 'w-3 text-[10px] text-rally-accent'
                    : moved < 0
                      ? 'w-3 text-[10px] text-[#ff6b6b]'
                      : 'w-3 text-[10px] text-white/30'
                }
              >
                {moved > 0 ? '▲' : moved < 0 ? '▼' : '•'}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-white/50">
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
