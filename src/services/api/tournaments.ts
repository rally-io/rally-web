// src/services/api/tournaments.ts
import client from './client'
import type { ApiResponse, Tournament } from '@/types/api'

export async function getTournaments(params: Record<string, any> = {}): Promise<ApiResponse<{ items: Tournament[]; next_cursor: string | null }>> {
  return client.get('/web/v1/tournaments/', { params })
}

export async function getTournament(tournamentId: string): Promise<ApiResponse<Tournament>> {
  return client.get(`/web/v1/tournaments/${tournamentId}`)
}