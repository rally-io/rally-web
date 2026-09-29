import type { SkillLadder } from './skillLadder'

/** The closed range a typed level may take. */
export interface SkillBounds {
  min: number
  max: number
}

/**
 * What a player may type or slide to on the ladder in force: [scale_min, typed_max] — 1.0–7.0
 * before the scale flip, 1.0–5.0 after it. rally-api refuses anything above typed_max with
 * SKILL_LEVEL_OUT_OF_RANGE ("Skill level is out of range"), so no control may offer more.
 */
export function typedBounds(ladder: SkillLadder): SkillBounds {
  return { min: ladder.scale_min, max: ladder.typed_max }
}

/* Matches the 2 decimals the rating engine stores (`round(mu, 2)`), rather than the 0.5 the
   spec originally called for. A coarser grid made a rated level inexpressible: a player at 4.17
   could only reach 4.0 or 4.5, so touching the control at all turned into a real declaration —
   re-seeding sigma and giving up the verified seal — with no way back to the value they had.
   The engine's own resolution is the only step that lets a player leave their level where it is.
   `SKILL_DECIMALS` is the shared source for both the step and every readout. */
export const SKILL_DECIMALS = 2
export const SKILL_STEP = 0.01
/* The DRAG step, kept apart from the precision above. Dragging moves in quarter points, the
   same jumps as the app's level slider (rally-mobile KnowSkillLevelScreen, SLIDER_STEP = 0.25),
   so a level feels the same on every Rally surface.

   The precision stays 0.01, which is what keeps the reasoning above intact: a rated 4.17 that
   nobody touches is saved as 4.17 (a controlled range input keeps its off-grid value until it is
   moved), and the number above the track still takes any 0.01 value — so a player who drags and
   regrets it can type their exact level back. Only `SkillLevelSlider`'s track uses this. */
export const SKILL_SLIDER_STEP = 0.25
/** What an unreadable entry falls back to — inside both ladders the API serves (1–7 and 1–5). */
export const SKILL_DEFAULT = 3.0

/** Round to the scale's precision. Note this is a plain round, not a division-by-step: at 0.01,
    `Math.round(4.23 / 0.01) * 0.01` is 4.2299999999999995, which then fails an equality check
    against the value the server sent back. */
export function snapToSkillStep(value: number): number {
  const factor = 10 ** SKILL_DECIMALS
  return Math.round(value * factor) / factor
}

export function clampSkill(value: number, bounds: SkillBounds): number {
  if (Number.isNaN(value)) return SKILL_DEFAULT
  if (value < bounds.min) return bounds.min
  if (value > bounds.max) return bounds.max
  return snapToSkillStep(value)
}

/**
 * A stored level below the scale (mobile writes 0 at complete-profile) means "not chosen".
 *
 * Deliberately does NOT snap: the stored level is the engine's own value and
 * must survive a round trip untouched. This mattered most when SKILL_STEP was
 * 0.5 -- snapping would have saved 4.5 over a rated 4.68, silently, on a
 * profile nobody edited -- and the step is 0.01 now, matching the two decimals
 * the engine stores, so there is nothing left to round away.
 * Only the high end is clamped, so a corrupt 99 cannot escape the range.
 */
export function normalizeSkillLevel(
  value: number | null | undefined,
  bounds: SkillBounds,
): number | null {
  if (value == null || Number.isNaN(value) || value < bounds.min) return null
  return Math.min(bounds.max, value)
}

/** The level as every surface prints it — two decimals, matching `describeLevel`. */
export function formatSkill(value: number): string {
  return value.toFixed(SKILL_DECIMALS)
}
