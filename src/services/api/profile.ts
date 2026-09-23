// src/services/api/profile.ts
import client from './client'
import type {
  ApiResponse,
  OnboardingStatus,
  PlayerMe,
  ProfileUpdateRequest,
} from '@/types/api'

export async function getOnboardingStatus(): Promise<ApiResponse<OnboardingStatus>> {
  return client.get('/rally/v1/me/onboarding-status')
}

/** Returns the updated profile — the reveal dialog on EditProfilePage reads the engine's
    fresh `level_verified` / `level_reliability` from it instead of guessing. */
export async function updateProfile(data: ProfileUpdateRequest): Promise<ApiResponse<PlayerMe>> {
  return client.patch('/rally/v1/players/', data)
}

export async function getMyPlayerProfile(): Promise<ApiResponse<PlayerMe>> {
  return client.get('/rally/v1/players/me') as Promise<ApiResponse<PlayerMe>>
}
