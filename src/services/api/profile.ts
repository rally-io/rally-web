// src/services/api/profile.ts
import client from './client'
import type { ApiResponse, OnboardingStatus, ProfileUpdateRequest } from '@/types/api'

export async function getOnboardingStatus(): Promise<ApiResponse<OnboardingStatus>> {
  return client.get('/web/v1/me/onboarding-status')
}

export async function updateProfile(data: ProfileUpdateRequest): Promise<ApiResponse<any>> {
  return client.patch('/rally/v1/players/me', data)
}

export async function registerTournament(tournamentId: string, data: any): Promise<ApiResponse<any>> {
  return client.post(`/rally/v1/tournaments/${tournamentId}/register`, data)
}