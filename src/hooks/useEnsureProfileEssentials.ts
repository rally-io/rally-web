import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppSession } from '@/hooks/useAppSession'
import { useAuth } from '@/hooks/useAuth'
import { createPlayerProfile } from '@/services/api/auth'
import { updateProfile } from '@/services/api/profile'
import { DEFAULT_COUNTRY } from '@/constants/countryCodes'
import { normalizeSkillLevel } from '@/lib/skillLevel'
import type { ProfileUpdateRequest } from '@/types/api'

export interface ProfileEssentialsInput {
  firstName: string
  lastName: string
  /** Israeli local digits, trunk 0 stripped (see components/corporate/phone.ts). */
  phone: string
  skillLevel: number | null
  /**
   * Authorises replacing a level the profile ALREADY has. Off by default: a
   * rated level (`match_rating`, no snapshot) would otherwise be destroyed by
   * a form that merely prefilled it. The corporate page sets this only after
   * the player opens the level editor themselves and moves the slider.
   */
  overwriteStoredLevel?: boolean
}

/**
 * rally-api refuses `register` until the profile has `contact_number` and
 * `skill_level` (profile_service.REQUIRED_FOR). This writes what the corporate
 * page collected BEFORE the register call, so the employee never meets the
 * generic /profile/edit page:
 *  - no `players` row yet (`profile_incomplete`) → POST /rally/v1/players/
 *  - row exists (`ready`)                        → PATCH only what is null
 * A stored phone is NEVER overwritten, and a stored level only when the caller
 * passes `overwriteStoredLevel` (the player edited it on purpose — otherwise a
 * rated/verified level with no snapshot would be destroyed); names are editable.
 */
export function useEnsureProfileEssentials() {
  const { status, playerProfile, refetchOnboarding } = useAppSession()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const phoneLocked = !!playerProfile?.contact_number
  const levelLocked = normalizeSkillLevel(playerProfile?.skill_level) != null

  const ensure = useCallback(
    async (input: ProfileEssentialsInput): Promise<void> => {
      if (status === 'profile_incomplete') {
        const res = await createPlayerProfile({
          first_name: input.firstName,
          last_name: input.lastName,
          email: user?.email ?? '',
          contact_number: input.phone,
          country_code: DEFAULT_COUNTRY.dial,
          ...(input.skillLevel != null ? { skill_level: input.skillLevel } : {}),
        })
        if (!res.success) throw new Error(res.error?.message ?? 'PROFILE_CREATE_FAILED')
      } else if (status === 'ready') {
        // `status` is derived from the ONBOARDING query alone; `playerProfile` is a
        // second query, enabled only once `has_player_profile` is true. So a `ready`
        // session with a null profile is every cold load for one HTTP GET — and is
        // permanent if that query fails. The guards below read "is this field null?"
        // off `playerProfile`; against a null profile they all read as null and would
        // PATCH a stored phone/level away, destroying a rated level with no snapshot.
        // Absent is not empty: refuse rather than guess.
        if (!playerProfile) throw new Error('PROFILE_NOT_LOADED')
        const patch: ProfileUpdateRequest = {}
        if (input.firstName && input.firstName !== (playerProfile?.first_name ?? '')) {
          patch.first_name = input.firstName
        }
        if (input.lastName && input.lastName !== (playerProfile?.last_name ?? '')) {
          patch.last_name = input.lastName
        }
        if (!playerProfile?.contact_number && input.phone) {
          patch.contact_number = input.phone
          patch.country_code = DEFAULT_COUNTRY.dial
        }
        const storedLevel = normalizeSkillLevel(playerProfile?.skill_level)
        if (
          input.skillLevel != null &&
          (storedLevel == null ||
            // An opened editor left untouched sends the same number — comparing
            // here means "opened it" never costs a write.
            (input.overwriteStoredLevel && input.skillLevel !== storedLevel))
        ) {
          patch.skill_level = input.skillLevel
        }
        if (Object.keys(patch).length > 0) {
          const res = await updateProfile(patch)
          if (!res.success) throw new Error(res.error?.message ?? 'PROFILE_UPDATE_FAILED')
        }
      } else {
        throw new Error('SESSION_NOT_READY')
      }
      await refetchOnboarding()
      await queryClient.invalidateQueries({ queryKey: ['player-profile-me'] })
    },
    [status, playerProfile, user?.email, refetchOnboarding, queryClient],
  )

  return { ensure, status, playerProfile, phoneLocked, levelLocked }
}
