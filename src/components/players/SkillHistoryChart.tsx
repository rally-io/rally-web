import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRtl } from '@/hooks/useRtl'
import { cn } from '@/lib/utils'

export interface SkillPointLike {
  skill_level: number
  recorded_at: string
}

export type StatsRange = '1M' | '3M' | '1Y' | 'ALL'
const RANGES: StatsRange[] = ['1M', '3M', '1Y', 'ALL']
const RANGE_DAYS: Record<StatsRange, number | null> = { '1M': 30, '3M': 90, '1Y': 365, ALL: null }
const MAX_VISIBLE_POINTS = 10
const W = 320
const H = 140
const PAD = { top: 14, right: 12, bottom: 22, left: 30 }

/**
 * Web port of the mobile SkillProgressionChart: the level after each rated match, one line
 * with a soft accent wash under it, the last ten points of the chosen range. The y-axis is
 * padded 15% around the visible min/max so a flat run still reads as a line, not a floor.
 */
export function SkillHistoryChart({ points }: { points: SkillPointLike[] }) {
  const { t } = useTranslation()
  const { locale } = useRtl()
  const gradientId = useId()
  const [range, setRange] = useState<StatsRange>('ALL')
  const [active, setActive] = useState<number | null>(null)

  const visible = useMemo(() => {
    const days = RANGE_DAYS[range]
    const cutoff = days == null ? -Infinity : Date.now() - days * 86_400_000
    return points
      .filter((p) => new Date(p.recorded_at).getTime() >= cutoff)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .slice(-MAX_VISIBLE_POINTS)
  }, [points, range])

  const geometry = useMemo(() => {
    if (visible.length === 0) return null
    const levels = visible.map((p) => p.skill_level)
    const min = Math.min(...levels)
    const max = Math.max(...levels)
    const span = max - min || 1
    const lo = min - span * 0.15
    const hi = max + span * 0.15
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const xs = visible.map((_, i) => PAD.left + (visible.length === 1 ? innerW / 2 : (i / (visible.length - 1)) * innerW))
    const ys = visible.map((p) => PAD.top + innerH - ((p.skill_level - lo) / (hi - lo)) * innerH)
    const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
    const area = `${line} L${xs[xs.length - 1].toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${xs[0].toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`
    return { xs, ys, line, area, lo, hi }
  }, [visible])

  const fmt = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(iso))
    } catch {
      return iso.slice(5, 10)
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-label={t('network.chart.title')}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-rally-text-muted">{t('network.chart.title')}</h3>
        <div className="flex gap-1 rounded-full bg-rally-surface-2 p-1" role="group" aria-label={t('network.chart.range')}>
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => { setRange(r); setActive(null) }}
              className={cn(
                'h-7 min-w-[2.5rem] rounded-full px-2 text-[11px] font-bold transition-colors',
                range === r ? 'bg-rally-accent text-rally-accent-text' : 'text-rally-text-2 hover:text-rally-text',
              )}
            >
              {t(`network.chart.${r}`)}
            </button>
          ))}
        </div>
      </div>

      {geometry ? (
        <div className="relative rounded-xl border border-rally-border bg-rally-surface p-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" direction="ltr" role="img" aria-label={t('network.chart.title')}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ccff00" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#ccff00" stopOpacity="0" />
              </linearGradient>
            </defs>
            <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" className="fill-rally-text-muted text-[9px] tabular-nums">{geometry.hi.toFixed(1)}</text>
            <text x={PAD.left - 6} y={H - PAD.bottom} textAnchor="end" className="fill-rally-text-muted text-[9px] tabular-nums">{geometry.lo.toFixed(1)}</text>
            <path d={geometry.area} fill={`url(#${gradientId})`} />
            <path data-testid="skill-line" d={geometry.line} fill="none" stroke="#ccff00" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {visible.map((p, i) => (
              <g key={p.recorded_at + i}>
                <circle
                  data-testid="skill-point"
                  cx={geometry.xs[i]}
                  cy={geometry.ys[i]}
                  r={active === i ? 5 : 3.5}
                  fill="#18181b"
                  stroke="#ccff00"
                  strokeWidth="2"
                  tabIndex={0}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
                {(i === 0 || i === visible.length - 1) && (
                  <text x={geometry.xs[i]} y={H - 6} textAnchor={i === 0 ? 'start' : 'end'} className="fill-rally-text-muted text-[9px]">
                    {fmt(p.recorded_at)}
                  </text>
                )}
              </g>
            ))}
          </svg>
          {active !== null && visible[active] && (
            <div
              role="status"
              className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-md border border-rally-border bg-rally-bg px-2 py-1 text-xs text-rally-text shadow-md"
            >
              <span className="font-bold tabular-nums">{visible[active].skill_level.toFixed(2)}</span>
              <span className="text-rally-text-2"> · {fmt(visible[active].recorded_at)}</span>
            </div>
          )}
          <p className="mt-1 text-end text-xs font-semibold tabular-nums text-rally-accent">
            {visible[visible.length - 1].skill_level.toFixed(1)}
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-rally-border bg-rally-surface px-3 py-4 text-center text-xs text-rally-text-muted">
          {t('network.chart.empty')}
        </p>
      )}
    </section>
  )
}
