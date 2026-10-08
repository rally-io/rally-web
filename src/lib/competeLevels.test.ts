import { describe, expect, it } from 'vitest'
import { getCorporateEvent, type CorporateTournamentEvent } from '@/constants/corporateEvents'
import { FALLBACK_LADDERS } from './skillLadder'
import { competeLevelOptions, tournamentLevelLabel } from './competeLevels'

const L7 = FALLBACK_LADDERS[7]
const L5 = FALLBACK_LADDERS[5]

const israelOpen = () => {
  const event = getCorporateEvent('holon-israel-open-2026')
  if (!event || event.mode !== 'tournament') throw new Error('the Israel Open event is missing')
  return event as CorporateTournamentEvent
}

/** The dropdown as it reads on 2026-09-29, the day registrations opened — pinned verbatim. */
const TODAY = [
  '2.0 - 2.5 (D1)',
  '2.5 - 3.0 (D1 - C2)',
  '3.0 - 3.5 (C2 - C1)',
  '3.5 - 4.0 (C1 - B2)',
  '4.0 - 4.5 (B2 - B1)',
  '4.5 - 5.0 (B1 - A)',
]

/** Contract §4 on the 1–5 ladder: one span, TM-style letters, one letter when they coincide. */
const ON_FIVE = [
  '1.0 - 2.0 (D2)',
  '2.0 - 2.5 (D2 - D1)',
  '2.5 - 3.0 (D1 - C2)',
  '3.0 - 3.5 (C2 - C1)',
  '3.5 - 4.0 (C1 - B2)',
  '4.0 - 4.5 (B2 - B1)',
  '4.5 - 5.0 (B1 - A)',
]

describe('tournamentLevelLabel (contract §4)', () => {
  it('writes the contract\'s own examples on the 1–5 ladder', () => {
    expect(tournamentLevelLabel(4.5, 5.0, L5)).toBe('4.5 - 5.0 (B1 - A)')
    expect(tournamentLevelLabel(2.5, 5.0, L5)).toBe('2.5 - 5.0 (D1 - A)')
    expect(tournamentLevelLabel(3.5, 4.0, L5)).toBe('3.5 - 4.0 (C1 - B2)')
    expect(tournamentLevelLabel(1.0, 2.0, L5)).toBe('1.0 - 2.0 (D2)')
  })

  it('reads whichever ladder it is given', () => {
    expect(tournamentLevelLabel(4.0, 5.0, L7)).toBe('4.0 - 5.0 (B2 - B1)')
    expect(tournamentLevelLabel(6.0, 7.0, L7)).toBe('6.0 - 7.0 (A2 - A1)')
  })
})

describe('competeLevelOptions — the Israel Open dropdown', () => {
  it('on the 1–7 ladder (today) is exactly today\'s list, byte for byte', () => {
    const options = competeLevelOptions(israelOpen(), L7)
    expect(options).toEqual(TODAY)
    expect(options.join('\n')).toBe(TODAY.join('\n'))
    // …and is the event's own list: nothing is re-derived while registrations run on it.
    expect(options).toEqual(israelOpen().competeLevels)
  })

  it('on the 1–5 ladder is one option per served band, labelled as contract §4 writes tournaments', () => {
    const options = competeLevelOptions(israelOpen(), L5)
    expect(options).toEqual(ON_FIVE)
    expect(options).toHaveLength(L5.bands.length)
  })

  it('follows the ladder in use, not a list typed for one scale', () => {
    // A served 1–5 ladder whose top band were relabelled would be read, not assumed.
    const renamed = { ...L5, bands: L5.bands.map((b) => (b.code === 'A' ? { ...b, code: 'AX', letter: 'A' } : b)) }
    const options = competeLevelOptions(israelOpen(), renamed)
    expect(options[options.length - 1]).toBe('4.5 - 5.0 (B1 - AX)')
  })
})

describe('competeLevelOptions — every other event', () => {
  it('an event\'s own categories are kept on either ladder', () => {
    const custom = { competeLevels: ['רמה 3.5–4', 'רמה 4.5–5'] }
    expect(competeLevelOptions(custom, L7)).toEqual(['רמה 3.5–4', 'רמה 4.5–5'])
    expect(competeLevelOptions(custom, L5)).toEqual(['רמה 3.5–4', 'רמה 4.5–5'])
  })

  it('an event without categories offers none on either ladder', () => {
    expect(competeLevelOptions({}, L7)).toEqual([])
    expect(competeLevelOptions({}, L5)).toEqual([])
  })
})
