import type { PartnerDecision } from '@/types/partnerPool'

/* The deck's gesture numbers and rules, from rally-mobile's PartnerCardStack.tsx. Widths are
   the CARD's width on the web, not the window's: on a desktop the window is far wider than
   the 420 px column, and a share of it would be out of reach. */

/** A release past this share of the card width counts, at any speed. */
export const SWIPE_FRACTION = 0.28
/** ...and so does a flick faster than this (px/ms), once it has moved FLICK_MIN_DX. */
export const SWIPE_VELOCITY = 0.6
export const FLICK_MIN_DX = 20
/** A press becomes a drag past this many px sideways (and more sideways than up or down). */
export const DRAG_START_PX = 8
export const FLY_MS = 220
/** The card's tilt at a full card-width of drag. */
export const MAX_ROTATE_DEG = 12
/** Vertical drag follows the pointer at this share, so the card wobbles instead of lifting. */
export const DRAG_Y_SHARE = 0.2

/* The first-time hint: the card leans this share of the width toward like, settles, then
   toward pass. Short of SWIPE_FRACTION, so each stamp shows without going solid. */
export const HINT_FRACTION = 0.2
export const HINT_DELAY_MS = 500
export const HINT_LEAN_MS = 350
export const HINT_HOLD_MS = 200

/** What a released drag means. Physical in both languages: right is like. */
export function swipeOutcome(dx: number, vx: number, width: number): PartnerDecision | null {
  if (dx > width * SWIPE_FRACTION || (vx > SWIPE_VELOCITY && dx > FLICK_MIN_DX)) return 'like'
  if (dx < -width * SWIPE_FRACTION || (vx < -SWIPE_VELOCITY && dx < -FLICK_MIN_DX)) return 'pass'
  return null
}

/** A release only counts for the card grabbed when the drag began; if the top card changed
    mid-drag (a failed swipe restored one, say), there is no outcome. */
export function releaseOutcome(
  grantedId: string | null,
  topId: string | null,
  dx: number,
  vx: number,
  width: number,
): PartnerDecision | null {
  if (grantedId === null || grantedId !== topId) return null
  return swipeOutcome(dx, vx, width)
}

/** A pointer position at a time (ms), as the stack records them during a drag. */
export interface DragSample {
  x: number
  t: number
}

/** Velocity is measured over the last stretch of the drag only, so a slow drag that ends in a
    flick counts as a flick, and a pause before letting go counts as no speed at all. */
export const VELOCITY_WINDOW_MS = 100
/** Shorter than this and there is no telling speed from jitter. */
const MIN_VELOCITY_SPAN_MS = 8

/** px/ms over the samples in the last VELOCITY_WINDOW_MS (the last sample is the release). */
export function releaseVelocity(samples: readonly DragSample[]): number {
  const last = samples[samples.length - 1]
  if (!last) return 0
  const first = samples.find((s) => last.t - s.t <= VELOCITY_WINDOW_MS)
  if (!first || last.t - first.t < MIN_VELOCITY_SPAN_MS) return 0
  return (last.x - first.x) / (last.t - first.t)
}
