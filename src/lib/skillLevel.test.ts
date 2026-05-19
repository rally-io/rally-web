import { describe, expect, it } from 'vitest'
import {
  SKILL_MIN,
  SKILL_MAX,
  SKILL_STEP,
  SKILL_DEFAULT,
  snapToSkillStep,
  clampSkill,
} from './skillLevel'

describe('skillLevel helpers', () => {
  it('exposes the canonical range constants', () => {
    expect(SKILL_MIN).toBe(1.0)
    expect(SKILL_MAX).toBe(7.0)
    expect(SKILL_STEP).toBe(0.5)
    expect(SKILL_DEFAULT).toBe(3.0)
  })

  it('snapToSkillStep rounds to nearest 0.5', () => {
    expect(snapToSkillStep(1.0)).toBe(1.0)
    expect(snapToSkillStep(1.24)).toBe(1.0)
    expect(snapToSkillStep(1.25)).toBe(1.5)
    expect(snapToSkillStep(3.7)).toBe(3.5)
    expect(snapToSkillStep(3.8)).toBe(4.0)
    expect(snapToSkillStep(7.0)).toBe(7.0)
  })

  it('clampSkill clamps and snaps; NaN becomes the default', () => {
    expect(clampSkill(0)).toBe(SKILL_MIN)
    expect(clampSkill(-5)).toBe(SKILL_MIN)
    expect(clampSkill(99)).toBe(SKILL_MAX)
    expect(clampSkill(4.3)).toBe(4.5)
    expect(clampSkill(Number.NaN)).toBe(SKILL_DEFAULT)
  })
})
