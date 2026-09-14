import { describe, expect, it } from 'vitest'
import { SKILL_TIERS, formatLevelWithTier, tierForLevel } from './skillTiers'

describe('SKILL_TIERS', () => {
  it('is the rally-api SKILL_LEVEL_RANGES table, contiguous and ascending', () => {
    expect(SKILL_TIERS.map((t) => t.code)).toEqual(['D2', 'D1', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1'])
    for (let i = 1; i < SKILL_TIERS.length; i++) {
      expect(SKILL_TIERS[i].min).toBe(SKILL_TIERS[i - 1].max)
    }
    expect(SKILL_TIERS[0].min).toBe(1.0)
    expect(SKILL_TIERS[SKILL_TIERS.length - 1].max).toBe(7.0)
  })
})

describe('tierForLevel', () => {
  it('resolves each boundary half-open, the way the API displays a rating', () => {
    expect(tierForLevel(1.0)).toBe('D2')
    expect(tierForLevel(1.9)).toBe('D2')
    expect(tierForLevel(2.0)).toBe('D1')
    expect(tierForLevel(2.5)).toBe('C2')
    expect(tierForLevel(3.0)).toBe('C1')
    expect(tierForLevel(3.5)).toBe('B2')
    expect(tierForLevel(3.9)).toBe('B2')
    expect(tierForLevel(4.0)).toBe('B1')
    expect(tierForLevel(4.68)).toBe('B1')
    expect(tierForLevel(5.0)).toBe('A2')
    expect(tierForLevel(6.0)).toBe('A1')
  })

  it('clamps the ends instead of throwing', () => {
    expect(tierForLevel(7.0)).toBe('A1')
    expect(tierForLevel(9)).toBe('A1')
    expect(tierForLevel(0)).toBe('D2')
  })
})

describe('formatLevelWithTier', () => {
  it('prints the stored number to one decimal with its tier', () => {
    expect(formatLevelWithTier(4.0)).toBe('4.0 (B1)')
    expect(formatLevelWithTier(4.68)).toBe('4.6 (B1)')
    expect(formatLevelWithTier(5.0)).toBe('5.0 (A2)')
    expect(formatLevelWithTier(7.0)).toBe('7.0 (A1)')
  })

  it('never prints a number from one tier beside the name of another', () => {
    // Rounding would make each of these read "N.0" while the tier stays the one
    // BELOW N.0 — a label contradicting itself. Truncation cannot cross a bound.
    for (const level of [2.95, 3.95, 4.95, 5.95]) {
      const label = formatLevelWithTier(level)
      const [shown, tier] = label.replace(')', '').split(' (')
      expect(tierForLevel(Number(shown))).toBe(tier)
    }
    expect(formatLevelWithTier(4.95)).toBe('4.9 (B1)')
  })
})
