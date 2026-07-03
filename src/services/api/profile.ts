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

export async function updateProfile(data: ProfileUpdateRequest): Promise<ApiResponse<unknown>> {
  return client.patch('/rally/v1/players/', data)
}

export async function getMyPlayerProfile(): Promise<ApiResponse<PlayerMe>> {
  return client.get('/rally/v1/players/me') as Promise<ApiResponse<PlayerMe>>
}
