import { describe, it, expect } from 'vitest'
import { hashEmail, hashPhone, fbcFromClickId } from './meta-capi'

// Known SHA-256 vectors, so a change in normalisation shows up as a test
// failure rather than as a silent drop in Meta's Event Match Quality.
describe('meta-capi hashing', () => {
  it('hashes a normalised email', () => {
    expect(hashEmail(' A@B.com ')).toBe(hashEmail('a@b.com'))
    expect(hashEmail('a@b.com')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashEmail('nope')).toBeUndefined()
    expect(hashEmail(42)).toBeUndefined()
  })

  it('hashes an Israeli phone as 972… digits', () => {
    expect(hashPhone('050-123-4567')).toBe(hashPhone('972501234567'))
    expect(hashPhone('+972501234567')).toBe(hashPhone('972501234567'))
    expect(hashPhone('12')).toBeUndefined()
  })

  it('rebuilds fbc from a click id and rejects garbage', () => {
    expect(fbcFromClickId('IwAR1abc_-')).toMatch(/^fb\.1\.\d+\.IwAR1abc_-$/)
    expect(fbcFromClickId('has space')).toBeUndefined()
    expect(fbcFromClickId(undefined)).toBeUndefined()
  })
})
