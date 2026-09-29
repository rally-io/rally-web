import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppSession } from '@/hooks/useAppSession'
import { useAuth } from '@/hooks/useAuth'
import { createPlayerProfile } from '@/services/api/auth'
import { updateProfile } from '@/services/api/profile'
import { DEFAULT_COUNTRY } from '@/constants/countryCodes'
import { normalizeSkillLevel, typedBounds } from '@/lib/skillLevel'
import { useRefreshSkillLadder, useSkillLadder } from '@/hooks/useSkillLadder'
import { LevelWriteRefusedError, apiFailureMessage, levelBase, levelWriteFields, levelWriteRefusal } from '@/lib/levelWrite'
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

/** An Error a caller can switch on: `.code` is rally-api's `error_code`. */
export type ProfileEssentialsError = Error & { code?: string }

/**
 * Keep the server's error CODE, not just its message. The message is English
 * ("A player with this mobile number already exists."), and a bare Error carrying
 * only that left the details modal nothing to translate — it showed one generic
 * "check your phone and level" for every failure, including a number that simply
 * belongs to another account, where neither field was wrong.
 */
function apiError(err: { code?: string; message?: string } | null | undefined, fallback: string): ProfileEssentialsError {
  return Object.assign(new Error(err?.message ?? fallback), { code: err?.code })
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
  const ladder = useSkillLadder()
  const refreshLadder = useRefreshSkillLadder()
  const skillBounds = useMemo(() => typedBounds(ladder), [ladder])

  const phoneLocked = !!playerProfile?.contact_number
  const levelLocked = normalizeSkillLevel(playerProfile?.skill_level, skillBounds) != null

  const ensure = useCallback(
    async (input: ProfileEssentialsInput): Promise<void> => {
      // Contract §7: a refused level means this page's copy of the level or of the scale is
      // stale — reload both before telling the player, so their next try starts from the truth.
      const throwIfLevelRefused = async (res: unknown) => {
        const refusal = levelWriteRefusal(res)
        if (!refusal) return
        refreshLadder()
        await refetchOnboarding()
        await queryClient.invalidateQueries({ queryKey: ['player-profile-me'] })
        throw new LevelWriteRefusedError(refusal, apiFailureMessage(res) ?? refusal)
      }
      if (status === 'profile_incomplete') {
        const res = await createPlayerProfile({
          first_name: input.firstName,
          last_name: input.lastName,
          email: user?.email ?? '',
          contact_number: input.phone,
          country_code: DEFAULT_COUNTRY.dial,
          ...(input.skillLevel != null ? levelWriteFields(input.skillLevel, ladder) : {}),
        })
        if (!res.success) {
          await throwIfLevelRefused(res)
          throw apiError(res.error, 'PROFILE_CREATE_FAILED')
        }
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
        const storedLevel = normalizeSkillLevel(playerProfile?.skill_level, skillBounds)
        if (
          input.skillLevel != null &&
          (storedLevel == null ||
            // An opened editor left untouched sends the same number — comparing
            // here means "opened it" never costs a write.
            (input.overwriteStoredLevel && input.skillLevel !== storedLevel))
        ) {
          // Contract §7: tag the scale, and name the level being replaced — without the base
          // rally-api ignores a change to an already-chosen level on this general update.
          Object.assign(patch, levelWriteFields(input.skillLevel, ladder), {
            skill_level_base: levelBase(playerProfile.skill_level, ladder),
          })
        }
        if (Object.keys(patch).length > 0) {
          const res = await updateProfile(patch)
          if (!res.success) {
            await throwIfLevelRefused(res)
            throw apiError(res.error, 'PROFILE_UPDATE_FAILED')
          }
        }
      } else {
        throw new Error('SESSION_NOT_READY')
      }
      await refetchOnboarding()
      await queryClient.invalidateQueries({ queryKey: ['player-profile-me'] })
    },
    [status, playerProfile, user?.email, refetchOnboarding, queryClient, skillBounds, ladder, refreshLadder],
  )

  return { ensure, status, playerProfile, phoneLocked, levelLocked }
}
