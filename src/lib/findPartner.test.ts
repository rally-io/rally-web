import { describe, it, expect } from 'vitest'
import { partnerDeckPath, showFindPartner, type FindPartnerFacts } from './findPartner'

const OPEN: FindPartnerFacts = {
  partnerSearchAvailable: true,
  format: 'doubles',
  registrationOpen: true,
  hasRegistration: false,
  hasWaitlistEntry: false,
  partnerPicked: false,
}

describe('showFindPartner', () => {
  it.each<[string, Partial<FindPartnerFacts>, boolean]>([
    ['doubles, open, nobody picked', {}, true],
    ['mixed', { format: 'mixed' }, true],
    ['singles', { format: 'singles' }, false],
    ['the API says no', { partnerSearchAvailable: false }, false],
    ['an API build without the field', { partnerSearchAvailable: undefined }, false],
    ['registration closed', { registrationOpen: false }, false],
    ['already registered', { hasRegistration: true }, false],
    ['on the waiting list', { hasWaitlistEntry: true }, false],
    ['a partner is already picked', { partnerPicked: true }, false],
  ])('%s → %s', (_label, overrides, expected) => {
    expect(showFindPartner({ ...OPEN, ...overrides })).toBe(expected)
  })
})

describe('partnerDeckPath', () => {
  it("is the tournament's partner deck, the same path as the app's", () => {
    expect(partnerDeckPath('t-1')).toBe('/tournaments/t-1/partners')
  })
})
