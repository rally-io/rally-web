import { describe, it, expect } from 'vitest'
import { readProfileDetails } from './profileDetails'
import type { PlayerMe } from '@/types/api'

const profile = (over: Partial<PlayerMe> = {}) =>
  ({ first_name: 'Dana', last_name: 'Cohen', contact_number: '0501234567', skill_level: 4.5, ...over }) as PlayerMe

describe('readProfileDetails', () => {
  it('formats a full profile for display', () => {
    expect(readProfileDetails(profile())).toEqual({
      complete: true, name: 'Dana Cohen', phone: '+972 0501234567', level: '4.5 (B1)',
    })
  })

  it('treats a stored level of 0 as "not chosen", not as D2', () => {
    // The one way this can lie. Mobile writes 0 at complete-profile to mean "no
    // level yet"; read raw it formats as a plausible "0.0 (D2)" AND passes the
    // completeness check, so the details modal would never open and rally-api
    // would refuse the register call the player then makes.
    const details = readProfileDetails(profile({ skill_level: 0 }))
    expect(details.level).toBeNull()
    expect(details.complete).toBe(false)
  })

  it('any missing essential keeps the modal in play', () => {
    expect(readProfileDetails(profile({ contact_number: null })).complete).toBe(false)
    expect(readProfileDetails(profile({ skill_level: null })).complete).toBe(false)
    expect(readProfileDetails(profile({ first_name: '  ', last_name: '  ' })).complete).toBe(false)
    expect(readProfileDetails(null).complete).toBe(false)
  })

  it('a first name alone is a name — the API accepts one', () => {
    expect(readProfileDetails(profile({ last_name: '' })).name).toBe('Dana')
  })

  it('the just-saved snapshot wins over a profile that has not refetched yet', () => {
    // What keeps Save from closing the modal onto a render that reopens it.
    const stale = profile({ contact_number: null, skill_level: null })
    expect(readProfileDetails(stale).complete).toBe(false)
    const fresh = readProfileDetails(stale, { contact_number: '0509999999', skill_level: 3.5 })
    expect(fresh).toEqual({ complete: true, name: 'Dana Cohen', phone: '+972 0509999999', level: '3.5 (B2)' })
  })
})
