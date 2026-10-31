import type { PlayerMe } from '@/types/api'

/**
 * The registering player's own details, for telling them apart from the partner
 * they enter. Ported from rally-mobile `src/lib/partners/selfPartner.ts`.
 */
export interface PartnerSelf {
  id: string
  firstName?: string | null
  lastName?: string | null
  /** National number, as the profile stores it and the invite form takes it. */
  phone?: string | null
  /** Dialling code, e.g. '+972'. */
  countryCode?: string | null
}

/** The signed-in player as a `PartnerSelf`, or undefined without a profile to compare against. */
export function partnerSelfFromProfile(profile: PlayerMe | null | undefined): PartnerSelf | undefined {
  if (!profile) return undefined
  return {
    id: profile.player_id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.contact_number,
    countryCode: profile.country_code,
  }
}

/** Dialling code + national digits, or null when either half is missing. */
function phoneKey(countryCode?: string | null, phone?: string | null): string | null {
  const cc = (countryCode ?? '').replace(/\D/g, '')
  const raw = (phone ?? '').trim()
  let national = raw.replace(/\D/g, '')
  if (!cc || !national) return null
  // A pasted international number carries the dialling code in front.
  if (raw.startsWith('+') && national.startsWith(cc)) national = national.slice(cc.length)
  // The trunk 0 of a local number ("050…") is not part of the number.
  national = national.replace(/^0+/, '')
  return national ? `${cc}:${national}` : null
}

/** Is this the player's own number? Mirrors rally-api's check in partner_rules.py. */
export function isOwnPhone(self: PartnerSelf | undefined, countryCode: string, phone: string): boolean {
  if (!self) return false
  const mine = phoneKey(self.countryCode, self.phone)
  return mine !== null && mine === phoneKey(countryCode, phone)
}

const nameKey = (name?: string | null) => (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

/** Did they type their own first and last name? Namesakes exist, so this only warns. */
export function isOwnName(self: PartnerSelf | undefined, firstName: string, lastName: string): boolean {
  if (!self) return false
  const first = nameKey(firstName)
  const last = nameKey(lastName)
  return first !== '' && last !== '' && first === nameKey(self.firstName) && last === nameKey(self.lastName)
}
