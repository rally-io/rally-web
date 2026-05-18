import { createContext, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  // Resolves when a players row is known to exist. Rejects if the user cancels the modal
  // or is signed out and can't continue.
  ensurePlayerProfile: () => Promise<void>
  // Imperative opener for the blocking ProfileCompletionModal. Set by the modal mount.
  // Accepts null to allow unregistration on unmount.
  __setBlockingHandlers: (handlers: { open: () => Promise<void> } | null) => void
  // Removes all session-related query cache immediately. Call this before signOut() so
  // the old profile data is gone before the session clears, preventing a stale-data flash.
  clearSession: () => void
}

export const AppSessionContext = createContext<AppSessionContextValue | null>(null)

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const { session, isLoading: authLoading, signOut } = useAuth()
  const queryClient = useQueryClient()
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

  // The blocking ProfileCompletionModal registers its "open and wait for completion" handler here.
  const blockingHandlers = useRef<{ open: () => Promise<void> } | null>(null)
  const __setBlockingHandlers = useCallback((h: { open: () => Promise<void> } | null) => {
    blockingHandlers.current = h
  }, [])

  const ensurePlayerProfile = useCallback(async () => {
    // Caller responsibilities: caller is expected to handle the rejection case
    // (e.g. don't fire the gated mutation if the user cancelled the modal).
    if (status === 'ready') return
    if (status === 'signed_out') throw new Error('SIGNED_OUT')
    if (status === 'profile_error') throw new Error('PROFILE_ERROR')
    if (!blockingHandlers.current) {
      throw new Error('ProfileCompletionModal is not mounted; cannot create player row')
    }
    await blockingHandlers.current.open()
    await refetchOnboarding()
  }, [status, refetchOnboarding])

  // Wire the axios bridge so the 403 interceptor can fire ensurePlayerProfile / signOut.
  useEffect(() => {
    __setApiBridge({
      ensurePlayerProfile,
      forceSignOut: async () => {
        await signOut()
        queryClient.clear()
      },
    })
    return () => __setApiBridge(null)
  }, [ensurePlayerProfile, signOut, queryClient])

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
    ensurePlayerProfile,
    __setBlockingHandlers,
    clearSession,
  }), [status, onboardingStatus, playerProfile, refetchOnboarding, ensurePlayerProfile, __setBlockingHandlers, clearSession])

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>
}
