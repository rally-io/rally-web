import { describe, expect, it } from 'vitest'
import {
  SKILL_MIN,
  SKILL_MAX,
  SKILL_STEP,
  SKILL_DEFAULT,
  SKILL_DECIMALS,
  snapToSkillStep,
  clampSkill,
  normalizeSkillLevel,
  formatSkill,
} from './skillLevel'

describe('skillLevel helpers', () => {
  it('exposes the canonical range constants at the engine\'s own resolution', () => {
    expect(SKILL_MIN).toBe(1.0)
    expect(SKILL_MAX).toBe(7.0)
    expect(SKILL_STEP).toBe(0.01)
    expect(SKILL_DECIMALS).toBe(2)
    expect(SKILL_DEFAULT).toBe(3.0)
  })

  it('snapToSkillStep rounds to two decimals', () => {
    expect(snapToSkillStep(1.0)).toBe(1.0)
    expect(snapToSkillStep(4.17)).toBe(4.17)
    expect(snapToSkillStep(4.174)).toBe(4.17)
    expect(snapToSkillStep(4.176)).toBe(4.18)
    expect(snapToSkillStep(7.0)).toBe(7.0)
  })

  it('snapToSkillStep returns a value that compares equal to the server\'s own', () => {
    /* The reason this is a plain round and not `Math.round(v / STEP) * STEP`: the latter gives
       4.2299999999999995 for 4.23, which then differs from the number the API sent back. The
       server treats any difference as a new declaration — it re-seeds σ and drops the verified
       seal — so a float artefact here is a lost seal, not a rounding nit. */
    for (const v of [4.23, 3.07, 6.19, 1.01, 2.29]) {
      expect(snapToSkillStep(v)).toBe(v)
      expect(snapToSkillStep(v) === v).toBe(true)
    }
  })

  it('clampSkill clamps to the scale; NaN becomes the default', () => {
    expect(clampSkill(0)).toBe(SKILL_MIN)
    expect(clampSkill(-5)).toBe(SKILL_MIN)
    expect(clampSkill(99)).toBe(SKILL_MAX)
    expect(clampSkill(4.17)).toBe(4.17)
    expect(clampSkill(Number.NaN)).toBe(SKILL_DEFAULT)
  })

  it('formatSkill prints the same two decimals the level chip does', () => {
    // The chip and the slider readout sit one line apart on Edit Profile; they used to disagree
    // (4.20 vs 4.2) about the same number.
    expect(formatSkill(4.2)).toBe('4.20')
    expect(formatSkill(4.17)).toBe('4.17')
    expect(formatSkill(7)).toBe('7.00')
  })
})

describe('normalizeSkillLevel', () => {
  it.each([null, undefined, 0, 0.5, -1, NaN])('reads %s as not chosen', (v) => {
    expect(normalizeSkillLevel(v as number | null | undefined)).toBeNull()
  })
  it('passes real levels through UNSNAPPED, clamping only the high end', () => {
    expect(normalizeSkillLevel(1)).toBe(1)
    expect(normalizeSkillLevel(7)).toBe(7)
    expect(normalizeSkillLevel(9)).toBe(7)
    // Off-step values are what the rating engine writes; snapping them here
    // would misreport the stored level and hide it from the dirty check.
    expect(normalizeSkillLevel(3.3)).toBe(3.3)
    expect(normalizeSkillLevel(4.68)).toBe(4.68)
  })
})
