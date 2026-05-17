import type { Prize } from '@/types/api'

interface Props {
  prizes: Prize[]
}

const PRIZE_STYLES = [
  {
    emoji: '🥇',
    bg: 'from-amber-400/20 via-amber-500/10 to-transparent',
    border: 'border-amber-400/40',
    glow: 'hover:shadow-[0_0_24px_rgba(251,191,36,0.25)]',
  },
  {
    emoji: '🥈',
    bg: 'from-slate-300/20 via-slate-400/10 to-transparent',
    border: 'border-slate-300/40',
    glow: 'hover:shadow-[0_0_24px_rgba(203,213,225,0.20)]',
  },
  {
    emoji: '🥉',
    bg: 'from-orange-500/20 via-orange-600/10 to-transparent',
    border: 'border-orange-500/40',
    glow: 'hover:shadow-[0_0_24px_rgba(249,115,22,0.25)]',
  },
]

export function PrizesGrid({ prizes }: Props) {
  const count = Math.min(prizes.length, 3)
  const cols =
    count === 1 ? 'md:grid-cols-1' : count === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'

  return (
    <div className={`grid grid-cols-1 ${cols} gap-4`}>
      {prizes.slice(0, 3).map((p, i) => {
        const style = PRIZE_STYLES[i] ?? PRIZE_STYLES[0]
        return (
          <div
            key={p.id}
            className={`relative overflow-hidden rounded-2xl bg-rally-surface border ${style.border} p-6 transition-all duration-200 hover:-translate-y-1 ${style.glow}`}
          >
            <div
              aria-hidden
              className={`absolute inset-0 bg-gradient-to-br ${style.bg} pointer-events-none`}
            />
            <div className="relative">
              <div className="text-5xl mb-3">{style.emoji}</div>
              <p className="text-[11px] uppercase tracking-wider text-rally-text-muted mb-1">
                {p.title}
              </p>
              <p className="text-rally-accent text-2xl md:text-3xl font-black">
                {p.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
