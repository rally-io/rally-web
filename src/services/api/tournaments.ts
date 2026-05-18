// src/services/api/tournaments.ts
import client from './client'
import type {
  ApiResponse, Tournament, TournamentDetail, RegistrationDetail, PlayerSearchResult,
} from '@/types/api'

export interface TournamentListParams {
  type?: 'upcoming' | 'my'
  cursor?: string
  limit?: number
  search?: string
  show_cancelled?: boolean
}

export async function getTournaments(
  params: TournamentListParams = {},
): Promise<ApiResponse<{ items: Tournament[]; next_cursor: string | null }>> {
  return client.get('/rally/v1/tournaments/', { params })
}

export async function getTournament(
  tournamentId: string,
): Promise<ApiResponse<TournamentDetail>> {
  return client.get(`/rally/v1/tournaments/${tournamentId}`)
}

export async function getRegistration(
  tournamentId: string,
  registrationId: string,
): Promise<ApiResponse<RegistrationDetail>> {
  return client.get(
    `/rally/v1/tournaments/${tournamentId}/registrations/${registrationId}`,
  )
}

export async function searchPlayers(
  query: string,
): Promise<ApiResponse<PlayerSearchResult[]>> {
  return client.get('/rally/v1/players/search', { params: { query } })
}

/**
 * Zero-amount confirm. BACKEND-CONFIRM: mobile uses
 * payments/tournament-registration/{rid}/confirm-zero-payment; the unification
 * doc exposes POST /rally/v1/tournaments/{tid}/registrations/{rid}/pay.
 * Isolated here so a later swap is a one-line change.
 */
export async function confirmZeroPayment(
  tournamentId: string,
  registrationId: string,
): Promise<ApiResponse<unknown>> {
  return client.post(
    `/rally/v1/tournaments/${tournamentId}/registrations/${registrationId}/pay`,
    {},
  )
}
