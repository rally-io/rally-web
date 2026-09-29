import { ltrIsolate } from './bidi'
import type { SkillLadder } from './skillLadder'

/**
 * The interpolation values for every sentence that names the scale ("a number between
 * {{min}} and {{max}}"), read off the ladder in force — so no translation file ever states
 * 1.0–7.0 again.
 *
 * Each value is ONE LTR-isolated token (wiki gotchas/web-rtl-score-string-mirroring). If a
 * sentence ever needs a range, add it here as a single isolate — "1.0" and "5.0" as two
 * isolates around a dash still mirror to "5.0–1.0" in Hebrew.
 */
export interface ScaleCopyValues {
  /** "1.0" */
  min: string
  /** "5.0" */
  max: string
  /** "1.00" — the explainer prints levels at the engine's two decimals, like the level chip. */
  minPrecise: string
  /** "5.00" */
  maxPrecise: string
}

export function scaleCopyValues(ladder: SkillLadder): ScaleCopyValues {
  return {
    min: ltrIsolate(ladder.scale_min.toFixed(1)),
    max: ltrIsolate(ladder.scale_max.toFixed(1)),
    minPrecise: ltrIsolate(ladder.scale_min.toFixed(2)),
    maxPrecise: ltrIsolate(ladder.scale_max.toFixed(2)),
  }
}
