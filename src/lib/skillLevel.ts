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
