import { describe, it, expect } from 'vitest'
import {
  isRegistrationOpen, parseSkillLevel, formatTournamentSkillRange,
  getSkillLevelName, formatTournamentDateRange, buildPayload, formatCurrency,
  registrationSummaryKey,
} from './tournamentHelpers'
import type { PartnerSelectionState } from '@/types/api'

describe('isRegistrationOpen', () => {
  it('treats empty/invalid as open', () => {
    expect(isRegistrationOpen('')).toBe(true)
    expect(isRegistrationOpen('not-a-date')).toBe(true)
  })
  it('open when deadline in the future', () => {
    expect(isRegistrationOpen('2999-01-01')).toBe(true)
  })
  it('closed when deadline in the past', () => {
    expect(isRegistrationOpen('2000-01-01')).toBe(false)
  })
})

describe('parseSkillLevel', () => {
  it('splits range and level', () => {
    expect(parseSkillLevel('2.5 - 3.8 (C2)')).toEqual({ range: '2.5 - 3.8', level: 'C2' })
  })
  it('range only', () => {
    expect(parseSkillLevel('2.5 - 3.8')).toEqual({ range: '2.5 - 3.8', level: null })
  })
  it('level only', () => {
    expect(parseSkillLevel('C2')).toEqual({ range: null, level: 'C2' })
  })
  it('null input', () => {
    expect(parseSkillLevel(null)).toEqual({ range: null, level: null })
  })
})

describe('formatTournamentSkillRange', () => {
  it('single value when equal', () => {
    expect(formatTournamentSkillRange(3, 3)).toBe('3.0')
  })
  it('max - min order with LTR marks when different', () => {
    expect(formatTournamentSkillRange(2.5, 3.8)).toBe('‎3.8 - 2.5‎')
  })
})

describe('getSkillLevelName', () => {
  it('all levels when no bounds', () => {
    expect(getSkillLevelName(0, 0)).toBe('All Levels')
  })
  it('buckets by average', () => {
    expect(getSkillLevelName(1, 2)).toBe('Beginner')
    expect(getSkillLevelName(3, 3.5)).toBe('Intermediate')
    expect(getSkillLevelName(4, 5)).toBe('Advanced')
    expect(getSkillLevelName(6, 6)).toBe('Pro')
  })
})

describe('formatTournamentDateRange', () => {
  it('same day en-US', () => {
    expect(formatTournamentDateRange('2026-06-01', '2026-06-01', 'en-US'))
      .toContain('June')
  })
  it('different months en-US contains both', () => {
    const s = formatTournamentDateRange('2026-06-01', '2026-07-02', 'en-US')
    expect(s).toContain('Jun')
    expect(s).toContain('Jul')
  })
})

describe('buildPayload', () => {
  it('singles -> none', () => {
    expect(buildPayload('singles', { phase: 'idle' })).toEqual({ partner_type: 'none' })
  })
  it('doubles existing', () => {
    const st: PartnerSelectionState = {
      phase: 'selected',
      partner: { type: 'existing', id: 'p1', displayName: 'A' },
    }
    expect(buildPayload('doubles', st)).toEqual({
      partner_type: 'existing', partner_player_id: 'p1',
    })
  })
  it('mixed invite', () => {
    const st: PartnerSelectionState = {
      phase: 'selected',
      partner: { type: 'invite', firstName: 'A', lastName: 'B', countryCode: '+972', phone: '501234567' },
    }
    expect(buildPayload('mixed', st)).toEqual({
      partner_type: 'invite', invite_first_name: 'A', invite_last_name: 'B',
      invite_country_code: '+972', invite_phone: '501234567',
    })
  })
})

describe('formatCurrency', () => {
  it('prefixes shekel', () => {
    expect(formatCurrency(120)).toBe('₪120')
  })
  it('falls back to ₪0 for non-finite', () => {
    expect(formatCurrency(Number.NaN)).toBe('₪0')
  })
})

describe('registrationSummaryKey', () => {
  it('closed past deadline', () => {
    expect(registrationSummaryKey('2000-01-01').key)
      .toBe('tournament.tournamentDetailRegistrationClosed')
  })
  it('ends in N days', () => {
    const d = new Date(); d.setDate(d.getDate() + 5)
    const r = registrationSummaryKey(d.toISOString())
    expect(r.key).toBe('tournament.tournamentDetailRegistrationEndsInDays')
    expect(r.params).toEqual({ count: 5 })
  })
})
