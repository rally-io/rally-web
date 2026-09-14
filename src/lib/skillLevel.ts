export const SKILL_MIN = 1.0
export const SKILL_MAX = 7.0
export const SKILL_STEP = 0.5
export const SKILL_DEFAULT = 3.0

export function snapToSkillStep(value: number): number {
  return Math.round(value / SKILL_STEP) * SKILL_STEP
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
 * Deliberately does NOT snap to SKILL_STEP: the rating engine stores off-step
 * levels (e.g. 4.68) and the editor has always shown them as "4.7". Snapping
 * here would both misreport the stored value and hide it from the form's dirty
 * check, so an untouched profile would silently save 4.5 over a rated 4.68.
 * Only the high end is clamped, so a corrupt 99 cannot escape the range.
 */
export function normalizeSkillLevel(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value) || value < SKILL_MIN) return null
  return Math.min(SKILL_MAX, value)
}
