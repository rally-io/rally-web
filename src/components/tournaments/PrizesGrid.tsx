import { useState } from 'react'
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
    ring: 'ring-amber-400/40',
  },
  {
    emoji: '🥈',
    bg: 'from-slate-300/20 via-slate-400/10 to-transparent',
    border: 'border-slate-300/40',
    glow: 'hover:shadow-[0_0_24px_rgba(203,213,225,0.20)]',
    ring: 'ring-slate-300/40',
  },
  {
    emoji: '🥉',
    bg: 'from-orange-500/20 via-orange-600/10 to-transparent',
    border: 'border-orange-500/40',
    glow: 'hover:shadow-[0_0_24px_rgba(249,115,22,0.25)]',
    ring: 'ring-orange-500/40',
  },
]

type PrizeStyle = (typeof PRIZE_STYLES)[number]

function PrizeCard({ prize, style }: { prize: Prize; style: PrizeStyle }) {
  // Prize photos are club uploads: any aspect ratio, any background. A failed
  // URL must degrade to the medal rather than leave a broken-image hole.
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(prize.image_url) && !imageFailed

  // Clubs frequently paste the same text into title and description; printing
  // it twice reads as a bug.
  const label = prize.description && prize.title !== prize.description ? prize.title : null
  const headline = prize.description || prize.title

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-rally-surface border ${style.border} transition-all duration-200 hover:-translate-y-1 ${style.glow}`}
    >
      <div
        aria-hidden
        className={`absolute inset-0 bg-gradient-to-br ${style.bg} pointer-events-none`}
      />
      <div className="relative">
        <div className="relative aspect-[4/3] overflow-hidden bg-rally-surface-2">
          {showImage ? (
            <img
              src={prize.image_url as string}
              alt={prize.title}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${style.bg}`}
            >
              <span className="text-6xl">{style.emoji}</span>
            </div>
          )}
          {/* Fade the photo into the card body so it doesn't end on a hard edge. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-rally-surface to-transparent"
          />
          <span
            className={`absolute top-3 start-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-rally-bg/70 text-xl ring-1 ${style.ring} backdrop-blur-sm`}
          >
            {style.emoji}
          </span>
        </div>
        <div className="p-6 pt-2">
          {label && (
            <p className="text-[11px] uppercase tracking-wider text-rally-text-muted mb-1">
              {label}
            </p>
          )}
          <p className="text-rally-accent text-2xl md:text-3xl font-black">{headline}</p>
        </div>
      </div>
    </div>
  )
}

export function PrizesGrid({ prizes }: Props) {
  const count = Math.min(prizes.length, 3)
  const cols =
    count === 1 ? 'md:grid-cols-1' : count === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'

  return (
    <div className={`grid grid-cols-1 ${cols} gap-4`}>
      {prizes.slice(0, 3).map((p, i) => (
        <PrizeCard key={p.id} prize={p} style={PRIZE_STYLES[i] ?? PRIZE_STYLES[0]} />
      ))}
    </div>
  )
}
