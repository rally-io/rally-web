// src/services/api/profile.ts
import client from './client'
import type {
  ApiResponse,
  OnboardingStatus,
  PlayerMe,
  ProfileUpdateRequest,
  TournamentRegistrationResponse,
  RegisterPayload,
} from '@/types/api'

export async function getOnboardingStatus(): Promise<ApiResponse<OnboardingStatus>> {
  return client.get('/rally/v1/me/onboarding-status')
}

export async function updateProfile(data: ProfileUpdateRequest): Promise<ApiResponse<unknown>> {
  return client.patch('/rally/v1/players/', data)
}

export async function registerTournament(
  tournamentId: string,
  data: RegisterPayload,
): Promise<ApiResponse<TournamentRegistrationResponse>> {
  return client.post(`/rally/v1/tournaments/${tournamentId}/register`, data)
}

export async function getMyPlayerProfile(): Promise<ApiResponse<PlayerMe>> {
  return client.get('/rally/v1/players/me') as Promise<ApiResponse<PlayerMe>>
}
