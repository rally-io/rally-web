import type { OnboardingStatus } from '@/types/api'

/** The onboarding-status steps a player must have before using the site. */
export const REQUIRED_STEPS = ['first_name', 'contact_number', 'skill_level'] as const

export function computeNeedsDetails(status: OnboardingStatus | null): boolean {
  if (!status) return false
  if (!status.has_player_profile) return true
  return status.missing_steps.some((step) => (REQUIRED_STEPS as readonly string[]).includes(step))
}

// Routes that either ARE the details step, are part of authentication, collect the
// details themselves (/join/*), are mid-payment, are a bare spectator screen
// (/live/:token), or are legal pages a player may need to read before finishing.
// React Router matches routes case-insensitively, so these must too — every regex
// carries the `i` flag. The routes that can't have a nested path also tolerate an
// optional trailing slash.
const EXEMPT = [
  /^\/profile\/edit\/?$/i,
  /^\/auth(\/|$)/i,
  /^\/login(\/|$)/i,
  /^\/set-password(\/|$)/i,
  /^\/join(\/|$)/i,
  /^\/payment-method\/?$/i,
  /^\/payments(\/|$)/i,
  /^\/live(\/|$)/i,
  /^\/terms\/?$/i,
  /^\/privacy\/?$/i,
]

export function isOnboardingGateExempt(pathname: string): boolean {
  return EXEMPT.some((re) => re.test(pathname))
}

/** Tournament pages keep their own copy on the details step; everything else is onboarding. */
export function detailsPurpose(pathname: string): 'tournament' | 'onboarding' {
  return /^\/tournaments\//i.test(pathname) ? 'tournament' : 'onboarding'
}
