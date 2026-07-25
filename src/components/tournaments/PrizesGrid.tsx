import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Prize } from '@/types/api'

interface Props {
  prizes: Prize[]
}

// Keyed by finishing place, not by list order: a club can award prizes for
// places 1, 2 and 5, and the 5th-place card must not wear a bronze medal.
const MEDAL_STYLES: Record<number, PrizeStyle> = {
  1: {
    emoji: '🥇',
    labelKey: 'tournament.prizeFirst',
    bg: 'from-amber-400/20 via-amber-500/10 to-transparent',
    border: 'border-amber-400/40',
    glow: 'hover:shadow-[0_0_24px_rgba(251,191,36,0.25)]',
    ring: 'ring-amber-400/40',
  },
  2: {
    emoji: '🥈',
    labelKey: 'tournament.prizeSecond',
    bg: 'from-slate-300/20 via-slate-400/10 to-transparent',
    border: 'border-slate-300/40',
    glow: 'hover:shadow-[0_0_24px_rgba(203,213,225,0.20)]',
    ring: 'ring-slate-300/40',
  },
  3: {
    emoji: '🥉',
    labelKey: 'tournament.prizeThird',
    bg: 'from-orange-500/20 via-orange-600/10 to-transparent',
    border: 'border-orange-500/40',
    glow: 'hover:shadow-[0_0_24px_rgba(249,115,22,0.25)]',
    ring: 'ring-orange-500/40',
  },
}

// Places past the podium get no medal — just the number, on neutral chrome.
const PLAIN_STYLE: PrizeStyle = {
  emoji: null,
  labelKey: null,
  bg: 'from-rally-surface-2/80 via-rally-surface-2/30 to-transparent',
  border: 'border-rally-border',
  glow: 'hover:shadow-[0_0_24px_rgba(255,255,255,0.06)]',
  ring: 'ring-rally-border-strong',
}

interface PrizeStyle {
  emoji: string | null
  labelKey: string | null
  bg: string
  border: string
  glow: string
  ring: string
}

function PrizeCard({ prize, fallbackPlace }: { prize: Prize; fallbackPlace: number }) {
  const { t } = useTranslation()

  // Prize photos are club uploads: any aspect ratio, any background. A failed
  // URL must degrade to the medal rather than leave a broken-image hole.
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(prize.image_url) && !imageFailed

  // Servers predating `position` send nothing, so fall back to list order for
  // the medal — but never claim a place we are only guessing at.
  const place = prize.position
  const style = MEDAL_STYLES[place ?? fallbackPlace] ?? PLAIN_STYLE
  const placeLabel =
    place == null
      ? null
      : style.labelKey
        ? t(style.labelKey)
        : t('tournament.prizePlace', { position: place })

  // Clubs frequently paste the same text into title and description; printing
  // it twice reads as a bug.
  const showTitle = Boolean(prize.description) && prize.title !== prize.description
  const subLabel = [placeLabel, showTitle ? prize.title : null].filter(Boolean).join(' · ')
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
              <span className="text-6xl">{style.emoji ?? place ?? fallbackPlace}</span>
            </div>
          )}
          {/* Fade the photo into the card body so it doesn't end on a hard edge. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-rally-surface to-transparent"
          />
          <span
            title={placeLabel ?? undefined}
            className={`absolute top-3 start-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-rally-bg/70 text-xl font-black text-rally-text ring-1 ${style.ring} backdrop-blur-sm`}
          >
            {style.emoji ?? place ?? fallbackPlace}
          </span>
        </div>
        <div className="p-6 pt-2">
          {subLabel && (
            <p className="text-[11px] uppercase tracking-wider text-rally-text-muted mb-1">
              {subLabel}
            </p>
          )}
          <p className="text-rally-accent text-2xl md:text-3xl font-black">{headline}</p>
        </div>
      </div>
    </div>
  )
}

export function PrizesGrid({ prizes }: Props) {
  // Best place first. Prizes without a position keep their server order and
  // sort last, so a mixed or legacy payload still renders sensibly.
  const ordered = [...prizes].sort(
    (a, b) => (a.position ?? Number.POSITIVE_INFINITY) - (b.position ?? Number.POSITIVE_INFINITY),
  )
  const cols =
    ordered.length === 1 ? 'md:grid-cols-1' : ordered.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'

  return (
    <div className={`grid grid-cols-1 ${cols} gap-4`}>
      {ordered.map((p, i) => (
        <PrizeCard key={p.id} prize={p} fallbackPlace={i + 1} />
      ))}
    </div>
  )
}
