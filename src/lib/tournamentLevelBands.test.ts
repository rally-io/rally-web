import { describe, expect, it } from 'vitest'
import { TOURNAMENT_LEVEL_BANDS, tournamentLevelsBetween } from './tournamentLevelBands'

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
      '4.5 - 5.0 (B1 - A)',
    ])
  })

  it('keeps a band only when it lies wholly inside the range', () => {
    // D2 (1.0–1.5) starts below 2; A2 (5.0–5.5) ends above 5 — both out.
    expect(tournamentLevelsBetween(2, 5)).not.toContain('1.0 - 1.5 (D2)')
    expect(tournamentLevelsBetween(2, 5)).not.toContain('5.0 - 5.5 (A2)')
  })

  // The gap the owner found: the tournament table had nothing between 4.5 and 5.0, so a
  // pair at 4.7 had no category. Whatever the bands become, 2 to 5 must be covered
  // end to end — each band starting exactly where the one before it ended.
  it('covers 2 to 5 end to end, with no hole a pair could fall into', () => {
    const bands = TOURNAMENT_LEVEL_BANDS.filter((b) => b.min >= 2 && b.max <= 5)
    expect(bands[0].min).toBe(2)
    expect(bands[bands.length - 1].max).toBe(5)
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].min, `hole between ${bands[i - 1].label} and ${bands[i].label}`).toBe(bands[i - 1].max)
    }
  })
})
