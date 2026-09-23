import { useTranslation } from 'react-i18next'

import { MARK_LIME, MARK_NAVY, MARK_SCALE } from './sealMark'

/* Spec Appendix A, 24-unit viewBox: one r 9.6 disc plus eight r 3.4 discs at radius 8.4,
   every 45°. The same nine circles draw the mobile seal — change both or neither. */
const LOBES: ReadonlyArray<readonly [number, number]> = [
  [20.4, 12],
  [17.94, 17.94],
  [12, 20.4],
  [6.06, 17.94],
  [3.6, 12],
  [6.06, 6.06],
  [12, 3.6],
  [17.94, 6.06],
]

// Static geometry — the r 9.6 disc plus the eight lobes never change with props, so it is
// built once at module scope instead of on every render.
const SEAL_SHAPE = (
  <>
    <circle cx="12" cy="12" r="9.6" />
    {LOBES.map(([cx, cy]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" />
    ))}
  </>
)

/* The mark, centred in the 24-unit viewBox. One group so the scale is applied
   once rather than baked into two 4 KB path strings. Shared with the mobile seal
   via the identical `sealMark` module — change both or neither. */
const MARK = (
  <g
    data-part="seal-mark"
    transform={`translate(12 12) scale(${MARK_SCALE}) translate(-12 -12)`}
  >
    <path
      data-part="seal-r-outline"
      d={MARK_NAVY}
      fill="var(--color-rally-seal-ink)"
      fillRule="evenodd"
    />
    <path data-part="seal-r" d={MARK_LIME} fill="var(--color-rally-seal-face)" fillRule="evenodd" />
  </g>
)

export interface VerifiedSealProps {
  /** rendered size in px */
  size: number
  /** dashed grey outline — "not verified yet", next to the words that say so */
  ghost?: boolean
  className?: string
}

export function VerifiedSeal({ size, ghost = false, className }: VerifiedSealProps) {
  const { t } = useTranslation()
  if (ghost) {
    // Decorative: it never appears without "Not verified yet" beside it, and labelling it
    // "Verified level" would tell a screen reader the opposite of the truth.
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        data-testid="verified-seal-ghost"
        className={className}
      >
        <g fill="none" stroke="var(--color-rally-text-muted)" strokeWidth="1.2" strokeDasharray="2 1.6">
          {SEAL_SHAPE}
        </g>
      </svg>
    )
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={t('level.sealLabel')}
      data-testid="verified-seal"
      className={className}
    >
      {/* The ground is the logo's BLUE, not the lime it used to be. A lime R on a
          lime rosette is invisible — only the navy outline survived, which is a
          large part of why the old seal read as a smudge. */}
      <g fill="var(--color-rally-seal-ground)">{SEAL_SHAPE}</g>
      <circle cx="12" cy="12" r="7.7" fill="var(--color-rally-seal-ground)" />
      {/* No size gates any more. The ball and its seams are part of the traced
          letterform, so there is nothing to switch off: they shrink with the mark
          instead of colliding with hand-placed neighbours the way the old
          primitives did. */}
      {MARK}
    </svg>
  )
}
