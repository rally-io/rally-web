import { describe, expect, it } from 'vitest'
import { SKILL_TIERS, TOURNAMENT_LEVEL_BANDS, formatLevelWithTier, tierForLevel, tournamentLevelsBetween } from './skillTiers'

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

describe('TOURNAMENT_LEVEL_BANDS / tournamentLevelsBetween', () => {
  // The strings production tournaments actually carry as their level (checked
  // 2026-09-28). A pair choosing its category must read the same text a tournament
  // shows, so these are pinned verbatim.
  it('writes each band the way a tournament shows its level, letter range included', () => {
    const labels = TOURNAMENT_LEVEL_BANDS.map((b) => b.label)
    expect(labels).toContain('2.5 - 3.0 (D1 - C2)')
    expect(labels).toContain('3.0 - 3.5 (C2 - C1)')
    expect(labels).toContain('3.5 - 4.0 (C1 - B2)')
    expect(labels).toContain('4.0 - 4.5 (B2 - B1)')
  })

  it('from 2 to 5: every band inside the range, lowest first, and nothing outside it', () => {
    expect(tournamentLevelsBetween(2, 5)).toEqual([
      '2.0 - 2.5 (D1)',
      '2.5 - 3.0 (D1 - C2)',
      '3.0 - 3.5 (C2 - C1)',
      '3.5 - 4.0 (C1 - B2)',
      '4.0 - 4.5 (B2 - B1)',
    ])
  })

  it('keeps a band only when it lies wholly inside the range', () => {
    // D2 (1.0–1.5) starts below 2; A2 (5.0–5.5) ends above 5 — both out.
    expect(tournamentLevelsBetween(2, 5)).not.toContain('1.0 - 1.5 (D2)')
    expect(tournamentLevelsBetween(2, 5)).not.toContain('5.0 - 5.5 (A2)')
  })
})
