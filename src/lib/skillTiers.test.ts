import { describe, expect, it } from 'vitest'
import { FALLBACK_LADDERS } from './skillLadder'
import { formatLevelWithTier, tierForLevel } from './skillTiers'

const L7 = FALLBACK_LADDERS[7]
const L5 = FALLBACK_LADDERS[5]

describe('tierForLevel', () => {
  it('resolves each boundary half-open, the way the API displays a rating (1–7 ladder)', () => {
    expect(tierForLevel(1.0, L7)).toBe('D2')
    expect(tierForLevel(1.9, L7)).toBe('D2')
    expect(tierForLevel(2.0, L7)).toBe('D1')
    expect(tierForLevel(2.5, L7)).toBe('C2')
    expect(tierForLevel(3.0, L7)).toBe('C1')
    expect(tierForLevel(3.5, L7)).toBe('B2')
    expect(tierForLevel(3.9, L7)).toBe('B2')
    expect(tierForLevel(4.0, L7)).toBe('B1')
    expect(tierForLevel(4.68, L7)).toBe('B1')
    expect(tierForLevel(5.0, L7)).toBe('A2')
    expect(tierForLevel(6.0, L7)).toBe('A1')
  })

  it('on the 1–5 ladder B1 ends at 4.5 and everything above it is A', () => {
    expect(tierForLevel(3.9, L5)).toBe('B2')
    expect(tierForLevel(4.0, L5)).toBe('B1')
    expect(tierForLevel(4.35, L5)).toBe('B1')
    expect(tierForLevel(4.49, L5)).toBe('B1')
    expect(tierForLevel(4.5, L5)).toBe('A')
    expect(tierForLevel(4.7, L5)).toBe('A')
  })

  it('clamps the ends instead of throwing', () => {
    expect(tierForLevel(7.0, L7)).toBe('A1')
    expect(tierForLevel(9, L7)).toBe('A1')
    expect(tierForLevel(0, L7)).toBe('D2')
    expect(tierForLevel(5.0, L5)).toBe('A')
    expect(tierForLevel(0, L5)).toBe('D2')
  })
})

describe('formatLevelWithTier', () => {
  it('prints the stored number to one decimal with its band', () => {
    expect(formatLevelWithTier(4.0, L7)).toBe('4.0 (B1)')
    expect(formatLevelWithTier(4.68, L7)).toBe('4.6 (B1)')
    expect(formatLevelWithTier(5.0, L7)).toBe('5.0 (A2)')
    expect(formatLevelWithTier(7.0, L7)).toBe('7.0 (A1)')
    expect(formatLevelWithTier(4.35, L5)).toBe('4.3 (B1)')
    expect(formatLevelWithTier(4.7, L5)).toBe('4.7 (A)')
    expect(formatLevelWithTier(5.0, L5)).toBe('5.0 (A)')
  })

  it('never prints a number from one band beside the name of another, on either ladder', () => {
    // Rounding would make each of these read "N.0"/"N.5" while the band stays the one BELOW
    // that edge — a label contradicting itself. Truncation cannot cross a bound.
    const cases: Array<[typeof L7, number[]]> = [
      [L7, [2.95, 3.95, 4.95, 5.95]],
      [L5, [2.95, 3.95, 4.49, 4.99]],
    ]
    for (const [ladder, levels] of cases) {
      for (const level of levels) {
        const [shown, tier] = formatLevelWithTier(level, ladder).replace(')', '').split(' (')
        expect(tierForLevel(Number(shown), ladder)).toBe(tier)
      }
    }
    expect(formatLevelWithTier(4.95, L7)).toBe('4.9 (B1)')
    expect(formatLevelWithTier(4.49, L5)).toBe('4.4 (B1)')
  })
})
