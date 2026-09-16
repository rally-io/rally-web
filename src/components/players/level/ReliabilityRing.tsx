import { useTranslation } from 'react-i18next'
import { VERIFIED_RELIABILITY_THRESHOLD } from './constants'

const R = 42
const CENTER = 48
const CIRCUMFERENCE = 2 * Math.PI * R // ≈ 263.9

/* The notch is a short radial tick crossing the track at VERIFIED_RELIABILITY_THRESHOLD %,
   derived so a future threshold tune moves it automatically instead of silently drifting out
   of sync with a hardcoded literal. */
const NOTCH_INNER_RADIUS = 34.4
const NOTCH_OUTER_RADIUS = 44.7
const NOTCH_ANGLE = (VERIFIED_RELIABILITY_THRESHOLD / 100) * 2 * Math.PI // clockwise from 12 o'clock
const round1 = (v: number) => Math.round(v * 10) / 10
// SVG y grows downward, so a clockwise angle θ from 12 o'clock lands at (cx + r·sinθ, cy − r·cosθ).
const notchPoint = (r: number) => ({
  x: round1(CENTER + r * Math.sin(NOTCH_ANGLE)),
  y: round1(CENTER - r * Math.cos(NOTCH_ANGLE)),
})
const NOTCH_INNER = notchPoint(NOTCH_INNER_RADIUS)
const NOTCH_OUTER = notchPoint(NOTCH_OUTER_RADIUS)

export interface ReliabilityRingProps {
  /** the level, two decimals; null draws an em dash (no level yet) */
  value: string | null
  /** 0–100; null draws the track only (backend sent none) */
  reliability: number | null
  /** colours the fill: lime when the seal is held, olive while building up to it */
  verified: boolean
  className?: string
}

/** The owner's gauge (spec §5.4 / Appendix A): a 96×96 SVG with the track, the fill arc from
    12 o'clock, a notch at the `VERIFIED_RELIABILITY_THRESHOLD` % threshold and the number inside. The fill colour follows
    the verified *flag*, so a verified player in the hysteresis band (74–82 %) still sees lime
    stopping short of the notch — which is exactly the story a fading seal tells.
    It is a gauge, not text: `dir="ltr"` keeps it from mirroring in Hebrew. */
export function ReliabilityRing({ value, reliability, verified, className }: ReliabilityRingProps) {
  const { t } = useTranslation()
  const pct = reliability == null ? 0 : Math.min(100, Math.max(0, reliability))
  const fill = verified ? 'var(--color-rally-accent)' : 'var(--color-rally-accent-muted)'
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      role="img"
      aria-label={value ?? t('level.none')}
      // @types/react's SVGAttributes has no `dir`; spread keeps tsc happy while still emitting dir="ltr".
      {...{ dir: 'ltr' }}
      className={className}
      data-testid="reliability-ring"
    >
      <circle cx="48" cy="48" r={R} fill="none" stroke="var(--color-rally-surface-2)" strokeWidth="6" />
      {reliability != null && pct >= 100 ? (
        // a full circle: round caps on a 100 % dash would overlap at the seam
        <circle cx="48" cy="48" r={R} fill="none" stroke={fill} strokeWidth="6" data-testid="ring-fill" />
      ) : null}
      {reliability != null && pct > 0 && pct < 100 ? (
        <circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          stroke={fill}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${((pct / 100) * CIRCUMFERENCE).toFixed(2)} 264`}
          transform="rotate(-90 48 48)"
          data-testid="ring-fill"
        />
      ) : null}
      {/* the notch: VERIFIED_RELIABILITY_THRESHOLD % × 360° from 12 o'clock, across the track */}
      <line x1={NOTCH_INNER.x} y1={NOTCH_INNER.y} x2={NOTCH_OUTER.x} y2={NOTCH_OUTER.y} stroke="var(--color-rally-text-muted)" strokeWidth="2" strokeLinecap="round" />
      <text
        x="48"
        y="57"
        textAnchor="middle"
        fill={value == null ? 'var(--color-rally-text-muted)' : 'var(--color-rally-accent)'}
        fontFamily="var(--font-display)"
        fontSize="27"
        fontWeight="700"
      >
        {value ?? '—'}
      </text>
    </svg>
  )
}
