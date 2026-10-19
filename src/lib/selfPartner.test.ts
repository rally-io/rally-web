import { describe, it, expect } from 'vitest'
import { isOwnName, isOwnPhone, partnerSelfFromProfile, type PartnerSelf } from './selfPartner'
import type { PlayerMe } from '@/types/api'

const me: PartnerSelf = { id: 'p-1', firstName: 'Dana', lastName: 'Levi', phone: '501234567', countryCode: '+972' }

describe('isOwnPhone', () => {
  it.each(['501234567', '0501234567', '050-123-4567', '+972 50 123 4567'])('matches my number typed as %s', (typed) => {
    expect(isOwnPhone(me, '+972', typed)).toBe(true)
  })

  it('does not match another number or my number under another dialling code', () => {
    expect(isOwnPhone(me, '+972', '501234568')).toBe(false)
    expect(isOwnPhone(me, '+1', '501234567')).toBe(false)
  })

  it('cannot tell without my number', () => {
    expect(isOwnPhone(undefined, '+972', '501234567')).toBe(false)
    expect(isOwnPhone({ ...me, phone: null }, '+972', '501234567')).toBe(false)
    expect(isOwnPhone({ ...me, countryCode: null }, '+972', '501234567')).toBe(false)
    expect(isOwnPhone(me, '+972', '')).toBe(false)
  })
})

describe('isOwnName', () => {
  it('matches my first and last name, ignoring case and spacing', () => {
    expect(isOwnName(me, ' dana ', 'LEVI')).toBe(true)
    expect(isOwnName({ ...me, firstName: 'Anna Maria' }, 'anna   maria', 'Levi')).toBe(true)
  })

  it('needs both names to match', () => {
    expect(isOwnName(me, 'Dana', '')).toBe(false)
    expect(isOwnName(me, 'Dana', 'Cohen')).toBe(false)
    expect(isOwnName(undefined, 'Dana', 'Levi')).toBe(false)
  })
})

describe('partnerSelfFromProfile', () => {
  it('reads the id, names and both halves of the phone off /players/me', () => {
    const profile: PlayerMe = {
      player_id: 'p-1',
      first_name: 'Dana',
      last_name: 'Levi',
      contact_number: '501234567',
      country_code: '+972',
      skill_level: null,
    }
    expect(partnerSelfFromProfile(profile)).toEqual(me)
    expect(isOwnPhone(partnerSelfFromProfile(profile), '+972', '0501234567')).toBe(true)
  })

  it('is undefined without a profile', () => {
    expect(partnerSelfFromProfile(null)).toBeUndefined()
  })
})
