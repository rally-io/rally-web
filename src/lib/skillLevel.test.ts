import { describe, expect, it } from 'vitest'
import { FALLBACK_LADDERS } from './skillLadder'
import {
  SKILL_STEP,
  SKILL_SLIDER_STEP,
  SKILL_DEFAULT,
  SKILL_DECIMALS,
  snapToSkillStep,
  clampSkill,
  normalizeSkillLevel,
  formatSkill,
  typedBounds,
} from './skillLevel'

const B7 = typedBounds(FALLBACK_LADDERS[7])
const B5 = typedBounds(FALLBACK_LADDERS[5])

describe('skillLevel helpers', () => {
  it('reads the typed bounds off the ladder: 1.0–7.0 before the flip, 1.0–5.0 after', () => {
    expect(B7).toEqual({ min: 1, max: 7 })
    expect(B5).toEqual({ min: 1, max: 5 })
  })

  it('keeps the engine\'s own resolution', () => {
    expect(SKILL_STEP).toBe(0.01)
    expect(SKILL_SLIDER_STEP).toBe(0.25)
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

  it('clampSkill clamps to the bounds in force; NaN becomes the default', () => {
    expect(clampSkill(0, B7)).toBe(1)
    expect(clampSkill(-5, B7)).toBe(1)
    expect(clampSkill(99, B7)).toBe(7)
    expect(clampSkill(4.17, B7)).toBe(4.17)
    expect(clampSkill(Number.NaN, B7)).toBe(SKILL_DEFAULT)
    // After the flip an old 1–7 number can never reach the API: it clamps to typed_max.
    expect(clampSkill(6.0, B5)).toBe(5)
    expect(clampSkill(99, B5)).toBe(5)
    expect(clampSkill(4.17, B5)).toBe(4.17)
    expect(clampSkill(Number.NaN, B5)).toBe(SKILL_DEFAULT)
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
  it.each([null, undefined, 0, 0.5, -1, NaN])('reads %s as not chosen, on either ladder', (v) => {
    expect(normalizeSkillLevel(v as number | null | undefined, B7)).toBeNull()
    expect(normalizeSkillLevel(v as number | null | undefined, B5)).toBeNull()
  })

  it('passes real levels through UNSNAPPED, clamping only the high end', () => {
    expect(normalizeSkillLevel(1, B7)).toBe(1)
    expect(normalizeSkillLevel(7, B7)).toBe(7)
    expect(normalizeSkillLevel(9, B7)).toBe(7)
    expect(normalizeSkillLevel(9, B5)).toBe(5)
    // Off-step values are what the rating engine writes; snapping them here
    // would misreport the stored level and hide it from the dirty check.
    expect(normalizeSkillLevel(3.3, B5)).toBe(3.3)
    expect(normalizeSkillLevel(4.68, B7)).toBe(4.68)
  })
})
