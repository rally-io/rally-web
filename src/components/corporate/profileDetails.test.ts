import { describe, it, expect } from 'vitest'
import { readProfileDetails } from './profileDetails'
import type { PlayerMe } from '@/types/api'
import { FALLBACK_LADDERS } from '@/lib/skillLadder'

const L7 = FALLBACK_LADDERS[7]
const L5 = FALLBACK_LADDERS[5]

const profile = (over: Partial<PlayerMe> = {}) =>
  ({ first_name: 'Dana', last_name: 'Cohen', contact_number: '0501234567', skill_level: 4.5, ...over }) as PlayerMe

describe('readProfileDetails', () => {
  it('formats a full profile for display', () => {
    expect(readProfileDetails(profile(), L7)).toEqual({
      complete: true, name: 'Dana Cohen', phone: '+972 0501234567', level: '4.5 (B1)',
    })
  })

  it('names the band on the ladder in force: 4.7 is B1 on 1–7 and A on 1–5', () => {
    expect(readProfileDetails(profile({ skill_level: 4.7 }), L7).level).toBe('4.7 (B1)')
    expect(readProfileDetails(profile({ skill_level: 4.7 }), L5).level).toBe('4.7 (A)')
    expect(readProfileDetails(profile({ skill_level: 4.35 }), L5).level).toBe('4.3 (B1)')
  })

  it('treats a stored level of 0 as "not chosen", not as D2', () => {
    // The one way this can lie. Mobile writes 0 at complete-profile to mean "no
    // level yet"; read raw it formats as a plausible "0.0 (D2)" AND passes the
    // completeness check, so the details modal would never open and rally-api
    // would refuse the register call the player then makes.
    const details = readProfileDetails(profile({ skill_level: 0 }), L7)
    expect(details.level).toBeNull()
    expect(details.complete).toBe(false)
  })

  it('any missing essential keeps the modal in play', () => {
    expect(readProfileDetails(profile({ contact_number: null }), L7).complete).toBe(false)
    expect(readProfileDetails(profile({ skill_level: null }), L7).complete).toBe(false)
    expect(readProfileDetails(profile({ first_name: '  ', last_name: '  ' }), L7).complete).toBe(false)
    expect(readProfileDetails(null, L7).complete).toBe(false)
  })

  it('a first name alone is a name — the API accepts one', () => {
    expect(readProfileDetails(profile({ last_name: '' }), L7).name).toBe('Dana')
  })

  it('the just-saved snapshot wins over a profile that has not refetched yet', () => {
    // What keeps Save from closing the modal onto a render that reopens it.
    const stale = profile({ contact_number: null, skill_level: null })
    expect(readProfileDetails(stale, L7).complete).toBe(false)
    const fresh = readProfileDetails(stale, L7, { contact_number: '0509999999', skill_level: 3.5 })
    expect(fresh).toEqual({ complete: true, name: 'Dana Cohen', phone: '+972 0509999999', level: '3.5 (B2)' })
  })
})
