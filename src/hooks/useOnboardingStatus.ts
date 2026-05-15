// src/hooks/useOnboardingStatus.ts
import { useQuery } from '@tanstack/react-query'
import { getOnboardingStatus } from '@/services/api/profile'
import type { OnboardingStatus } from '@/types/api'

export function useOnboardingStatus() {
  return useQuery({
    queryKey: ['onboarding-status'],
    queryFn: async (): Promise<OnboardingStatus | null> => {
      const result = await getOnboardingStatus()
      if (!result.success) return null
      return result.data
    },
    staleTime: 30 * 1000, // 30 seconds — updates after profile save
  })
}