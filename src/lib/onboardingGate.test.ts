import { describe, expect, it } from 'vitest'
import { computeNeedsDetails, detailsPurpose, isOnboardingGateExempt } from './onboardingGate'

const base = { is_authenticated: true, has_player_profile: true, completion_percent: 100, completed_steps: [], missing_steps: [] as string[] }

describe('computeNeedsDetails', () => {
  it('is false with no status yet', () => expect(computeNeedsDetails(null)).toBe(false))
  it('is true without a player profile', () => expect(computeNeedsDetails({ ...base, has_player_profile: false })).toBe(true))
  it('is true when a required step is missing', () => {
    expect(computeNeedsDetails({ ...base, missing_steps: ['skill_level'] })).toBe(true)
    expect(computeNeedsDetails({ ...base, missing_steps: ['contact_number'] })).toBe(true)
    expect(computeNeedsDetails({ ...base, missing_steps: ['first_name'] })).toBe(true)
  })
  it('ignores non-required steps', () => expect(computeNeedsDetails({ ...base, missing_steps: ['player_profile_photo'] })).toBe(false))
})

describe('isOnboardingGateExempt', () => {
  it.each([
    '/profile/edit', '/auth/callback', '/login', '/set-password', '/join/acme',
    '/payment-method', '/payments/return', '/terms', '/privacy',
    '/Join/acme', '/AUTH/callback', '/Profile/Edit', '/PAYMENTS/return',
    '/profile/edit/',
    // A shared live-bracket link is a bare spectator screen — gating it would
    // bounce a signed-in but incomplete player away from someone else's game.
    '/live/abc', '/live', '/LIVE/abc',
  ])('exempts %s', (p) => {
    expect(isOnboardingGateExempt(p)).toBe(true)
  })
  it.each(['/', '/tournaments', '/tournaments/t-1', '/clubs/c-1', '/my-activity', '/profile/edit/extra', '/joined'])('gates %s', (p) => {
    expect(isOnboardingGateExempt(p)).toBe(false)
  })
})

describe('detailsPurpose', () => {
  it.each(['/tournaments/t-1', '/Tournaments/t-1'])('is tournament for %s', (p) => {
    expect(detailsPurpose(p)).toBe('tournament')
  })
  it.each(['/tournaments', '/'])('is onboarding for %s', (p) => {
    expect(detailsPurpose(p)).toBe('onboarding')
  })
})
