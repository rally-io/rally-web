import { createContext, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getOnboardingStatus, getMyPlayerProfile } from '@/services/api/profile'
import { __setApiBridge } from '@/services/api/client'
import type { OnboardingStatus, PlayerMe } from '@/types/api'

export type AppSessionStatus =
  | 'loading'
  | 'signed_out'
  | 'profile_error'
  | 'profile_incomplete'
  | 'ready'

export interface AppSessionContextValue {
  status: AppSessionStatus
  onboardingStatus: OnboardingStatus | null
  playerProfile: PlayerMe | null
  refetchOnboarding: () => Promise<void>
  // Removes all session-related query cache immediately. Call this before signOut() so
  // the old profile data is gone before the session clears, preventing a stale-data flash.
  clearSession: () => void
}

export const AppSessionContext = createContext<AppSessionContextValue | null>(null)

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const { session, isLoading: authLoading, signOut } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const isSignedIn = !!session

  const {
    data: onboardingData,
    error: onboardingError,
    isLoading: onboardingLoading,
    refetch,
  } = useQuery({
    queryKey: ['onboarding-status'],
    enabled: isSignedIn,
    queryFn: async () => {
      const result = await getOnboardingStatus()
      if (!result.success) throw new Error(result.error.message ?? 'Onboarding status failed')
      return result.data
    },
    staleTime: 30 * 1000,
    retry: 1,
  })

  const onboardingStatus: OnboardingStatus | null = onboardingData ?? null
  const hasPlayerProfile = onboardingStatus?.has_player_profile ?? false

  const { data: playerProfileData } = useQuery({
    queryKey: ['player-profile-me'],
    enabled: isSignedIn && hasPlayerProfile,
    queryFn: async () => {
      const result = await getMyPlayerProfile()
      if (!result.success) throw new Error(result.error.message ?? 'Player profile fetch failed')
      return result.data
    },
    staleTime: 60 * 1000,
    retry: 1,
  })

  const playerProfile: PlayerMe | null = playerProfileData ?? null

  const status: AppSessionStatus = useMemo(() => {
    if (authLoading) return 'loading'
    if (!isSignedIn) return 'signed_out'
    if (onboardingLoading && !onboardingStatus) return 'loading'
    if (onboardingError) return 'profile_error'
    if (!onboardingStatus) return 'loading'
    return onboardingStatus.has_player_profile ? 'ready' : 'profile_incomplete'
  }, [authLoading, isSignedIn, onboardingLoading, onboardingError, onboardingStatus])

  const refetchOnboarding = useCallback(async () => {
    await refetch()
  }, [refetch])

  const clearSession = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['onboarding-status'] })
    queryClient.removeQueries({ queryKey: ['player-profile-me'] })
  }, [queryClient])

  // Wire the axios bridge so the 403/422 interceptor can redirect to /profile/edit
  // and 401 can force-sign-out.
  useEffect(() => {
    __setApiBridge({
      redirectToProfileEdit: () => {
        // Carry the page the user was on (e.g. a tournament they were trying to
        // register for) so EditProfilePage can send them straight back once
        // their profile is complete, instead of stranding them on /profile/edit.
        const returnTo = `${location.pathname}${location.search}`
        navigate(`/profile/edit?returnTo=${encodeURIComponent(returnTo)}`)
      },
      forceSignOut: async () => {
        await signOut()
        queryClient.clear()
      },
    })
    return () => __setApiBridge(null)
  }, [navigate, signOut, queryClient, location.pathname, location.search])

  // When session becomes null, drop all cached profile data.
  useEffect(() => {
    if (!isSignedIn) {
      queryClient.removeQueries({ queryKey: ['onboarding-status'] })
      queryClient.removeQueries({ queryKey: ['player-profile-me'] })
    }
  }, [isSignedIn, queryClient])

  const value = useMemo<AppSessionContextValue>(() => ({
    status,
    onboardingStatus,
    playerProfile,
    refetchOnboarding,
    clearSession,
  }), [status, onboardingStatus, playerProfile, refetchOnboarding, clearSession])

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>
}
