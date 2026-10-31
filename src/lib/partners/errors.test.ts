import { describe, expect, it } from 'vitest'
import { classifyPartnerError } from './errors'

describe('classifyPartnerError: one UI behaviour per error code', () => {
  it.each([
    ['FEATURE_DISABLED', 404, 'unavailable'],
    ['POOL_NOT_FOUND', 404, 'unavailable'],
    ['POOL_CLOSED', 409, 'closed'],
    ['PLAYER_UNAVAILABLE', 409, 'player_gone'],
    ['PLAYER_NOT_FOUND', 404, 'player_gone'],
    ['UNDO_NOT_ALLOWED', 409, 'undo_refused'],
    ['RATE_LIMITED', 429, 'rate_limited'],
    // Never sent by this client; if one ever arrives it is a bug, shown as a generic error.
    ['SWIPE_SELF', 400, 'other'],
    ['POOL_KIND_UNSUPPORTED', 400, 'other'],
    // An unrelated 404 that does carry a code is not "the finder is missing".
    ['SOMETHING_ELSE', 404, 'other'],
  ])('%s (%i) → %s', (code, status, kind) => {
    // The shape the shared client rejects with for an enveloped error.
    expect(classifyPartnerError({ status, code, message: 'x' })).toBe(kind)
  })

  it('a 429 without a code is still rate limiting', () => {
    expect(classifyPartnerError({ status: 429, code: 'SERVER_ERROR', message: 'Too many requests' })).toBe('rate_limited')
  })

  it("a bare 404 (an API without the partner routes) is unavailable", () => {
    expect(classifyPartnerError({ isNotFound: true, status: 404, message: 'Not found' })).toBe('unavailable')
  })

  it('a network failure, or something that is not an error at all, is "other", never a throw', () => {
    expect(classifyPartnerError({ code: 'NETWORK_ERROR', message: 'Network error' })).toBe('other')
    expect(classifyPartnerError(new TypeError('Failed to fetch'))).toBe('other')
    expect(classifyPartnerError(undefined)).toBe('other')
    expect(classifyPartnerError('boom')).toBe('other')
  })
})
