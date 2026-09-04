// src/lib/tournamentCta.ts — ported 1:1 from rally-mobile's ctaFor.ts (mobile parity)

export type TournamentCta = 'register' | 'join_waitlist' | 'waiting' | 'my_registration' | 'none'

/**
 * The detail-screen CTA, as a pure function of four facts.
 *
 * Deliberately does NOT consider `has_draw`: whether a board exists is a CRM
 * concern, and a player who is told "registration is closed because a board
 * exists" has been told something that is no longer true since Phase A.
 *
 * Adaptation from mobile: mobile gates on `status === 'registration_open'`,
 * a field it can always trust. Web's `status` is feature-detected — absent on
 * API builds predating it (`Tournament.status?`) — and the page already has
 * its own reliable open/closed signal, `isRegistrationOpen(registration_deadline)`
 * (see tournamentHelpers.ts). So this takes that boolean instead of the raw
 * status string, to avoid forcing every "none" branch on missing `status`.
 */
export function ctaFor(args: {
  isOpen: boolean
  isFull: boolean
  waitlistEnabled: boolean
  myWaitlistEntry: { position: number } | null
  myRegistration: unknown | null
}): TournamentCta {
  if (args.myRegistration) return 'my_registration'
  if (args.myWaitlistEntry) return 'waiting'
  if (!args.isOpen) return 'none'
  if (!args.isFull) return 'register'
  return args.waitlistEnabled ? 'join_waitlist' : 'none'
}
