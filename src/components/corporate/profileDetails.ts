import { formatLevelWithTier } from '@/lib/skillTiers'
import { normalizeSkillLevel } from '@/lib/skillLevel'
import { DEFAULT_COUNTRY } from '@/constants/countryCodes'
import type { PlayerMe } from '@/types/api'

export interface ProfileDetails {
  /** Every essential is on the profile — the register call will not be refused. */
  complete: boolean
  name: string | null
  phone: string | null
  /** Already formatted for display: "4.5 (B1)". */
  level: string | null
}

/**
 * What the profile holds, ready to show.
 *
 * Read off the SAVED profile, never off form state, so it can only ever report
 * what actually landed. rally-api refuses `register` without a phone and a
 * level (`profile_service.REQUIRED_FOR`), and a draw sheet without a name is
 * useless, so all three are required for `complete`.
 *
 * `justSaved` is what the details modal has written, ahead of the profile query
 * catching up. Without it, Save would close the modal and the very next render
 * would decide the profile is still incomplete and open it again.
 */
export function readProfileDetails(
  profile: PlayerMe | null,
  justSaved?: Partial<PlayerMe> | null,
): ProfileDetails {
  const merged = justSaved ? { ...profile, ...justSaved } : profile
  const name = [merged?.first_name, merged?.last_name].filter((part) => part?.trim()).join(' ')
  // `normalizeSkillLevel`, not the raw column: mobile writes 0 at
  // complete-profile to mean "not chosen", and a raw read would both format it
  // as a plausible "0.0 (D2)" and call the profile complete — the modal would
  // never open and rally-api would refuse the register the player then makes.
  const level = normalizeSkillLevel(merged?.skill_level)
  const details: Omit<ProfileDetails, 'complete'> = {
    name: name || null,
    // PlayerMe carries no country_code, so the dial prefix comes from the
    // shared constant — the same assumption the phone field itself makes.
    phone: merged?.contact_number ? `${DEFAULT_COUNTRY.dial} ${merged.contact_number}` : null,
    level: level == null ? null : formatLevelWithTier(level),
  }
  return { ...details, complete: !!(details.name && details.phone && details.level) }
}
