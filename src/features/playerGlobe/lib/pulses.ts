import { PULSE_GAIN, PULSE_GAMES_CAP } from '../constants'

/** One streak in flight. `li < 0` is idle: it respawns once time >= at, and at < 0 means
    "stagger from the first frame" so the pool doesn't launch everything at once on load. */
export interface PulseSlot {
  li: number
  dir: 1 | -1
  t0: number
  dur: number
  at: number
}

export type Picker = () => number

/* Line thickness is not available in WebGL (LineBasicMaterial.linewidth is ignored on
   virtually every platform), so relationship strength is carried by BRIGHTNESS instead —
   which is also how the flight-path references read: hotter line, busier route. Strong
   relationships also pulse more often (spawn weight) and burn hotter (head gain). */
export const pulseGain = (games: number): number =>
  PULSE_GAIN * (0.7 + (Math.min(games, PULSE_GAMES_CAP) / PULSE_GAMES_CAP) * 0.3)

/** Weighted random picker over link indices. `null` when there is nothing to pick from. */
export function makePicker(indices: number[], weights: number[], random: () => number = Math.random): Picker | null {
  if (!indices.length) return null
  const cum = new Float64Array(indices.length)
  let total = 0
  for (let i = 0; i < indices.length; i++) {
    total += weights[i]
    cum[i] = total
  }
  return () => {
    const r = random() * total
    let lo = 0
    let hi = cum.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid] < r) lo = mid + 1
      else hi = mid
    }
    return indices[lo]
  }
}

export const makeSlots = (n: number): PulseSlot[] =>
  Array.from({ length: n }, () => ({ li: -1, dir: 1, t0: 0, dur: 1, at: -1 }))
