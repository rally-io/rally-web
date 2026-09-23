export const SKILL_MIN = 1.0
export const SKILL_MAX = 7.0
/* Matches the 2 decimals the rating engine stores (`round(mu, 2)`), rather than the 0.5 the
   spec originally called for. A coarser grid made a rated level inexpressible: a player at 4.17
   could only reach 4.0 or 4.5, so touching the control at all turned into a real declaration —
   re-seeding sigma and giving up the verified seal — with no way back to the value they had.
   The engine's own resolution is the only step that lets a player leave their level where it is.
   `SKILL_DECIMALS` is the shared source for both the step and every readout. */
export const SKILL_DECIMALS = 2
export const SKILL_STEP = 0.01
export const SKILL_DEFAULT = 3.0

/** Round to the scale's precision. Note this is a plain round, not a division-by-step: at 0.01,
    `Math.round(4.23 / 0.01) * 0.01` is 4.2299999999999995, which then fails an equality check
    against the value the server sent back. */
export function snapToSkillStep(value: number): number {
  const factor = 10 ** SKILL_DECIMALS
  return Math.round(value * factor) / factor
}

export function clampSkill(value: number): number {
  if (Number.isNaN(value)) return SKILL_DEFAULT
  if (value < SKILL_MIN) return SKILL_MIN
  if (value > SKILL_MAX) return SKILL_MAX
  return snapToSkillStep(value)
}

/**
 * A stored level below SKILL_MIN (mobile writes 0 at complete-profile) means
 * "not chosen".
 *
 * Deliberately does NOT snap: the stored level is the engine's own value and
 * must survive a round trip untouched. This mattered most when SKILL_STEP was
 * 0.5 -- snapping would have saved 4.5 over a rated 4.68, silently, on a
 * profile nobody edited -- and the step is 0.01 now, matching the two decimals
 * the engine stores, so there is nothing left to round away.
 * Only the high end is clamped, so a corrupt 99 cannot escape the range.
 */
export function normalizeSkillLevel(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value) || value < SKILL_MIN) return null
  return Math.min(SKILL_MAX, value)
}

/** The level as every surface prints it — two decimals, matching `describeLevel`. */
export function formatSkill(value: number): string {
  return value.toFixed(SKILL_DECIMALS)
}
