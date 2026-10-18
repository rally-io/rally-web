import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { MAX_REASONS, formatReason, formatReasons } from './reasons'

// The real English bundle, so these assert the copy players read, plurals included.
const t = i18n.getFixedT('en')

describe('formatReason', () => {
  it.each([
    [{ code: 'played_together', params: { count: 4, role: 'partner' } }, 'Played together 4 times'],
    [{ code: 'played_together', params: { count: 1, role: 'opponent' } }, 'Played against each other once'],
    [{ code: 'mutual_partners', params: { count: 2 } }, '2 partners in common'],
    [{ code: 'shared_tournaments', params: { count: 1 } }, '1 tournament in common'],
    [{ code: 'court_side_fit', params: { mine: 'left_side', theirs: 'right_side' } }, 'Sides fit: you Left, them Right'],
    [{ code: 'similar_level', params: {} }, 'Similar level'],
  ])('%j', (reason, expected) => {
    expect(formatReason(t, reason)).toBe(expected)
  })

  it('availability names the slot and ignores the day: the app saves the same slots for every day', () => {
    expect(formatReason(t, { code: 'availability', params: { day: 1, slot: 'evening' } })).toBe('Also free in the evenings')
  })

  it('a code this build does not know is skipped, not shown raw', () => {
    expect(formatReason(t, { code: 'plays_at_same_club', params: {} })).toBeNull()
  })

  it('an unknown side or slot value is skipped too', () => {
    expect(formatReason(t, { code: 'court_side_fit', params: { mine: 'left_side', theirs: 'middle' } })).toBeNull()
    expect(formatReason(t, { code: 'availability', params: { day: 1, slot: 'night' } })).toBeNull()
  })
})

describe('formatReasons', () => {
  it(`keeps the API's order, drops unknown codes, and stops at ${MAX_REASONS}`, () => {
    const lines = formatReasons(t, [
      { code: 'mutual_partners', params: { count: 3 } },
      { code: 'unknown', params: {} },
      { code: 'similar_level', params: {} },
      { code: 'shared_tournaments', params: { count: 2 } },
      { code: 'played_together', params: { count: 2, role: 'partner' } },
    ])
    expect(lines).toEqual(['3 partners in common', 'Similar level', '2 tournaments in common'])
  })
})
