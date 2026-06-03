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

export async function confirmZeroPayment(
  _tournamentId: string,
  registrationId: string,
): Promise<ApiResponse<unknown>> {
  try {
    return await client.post(
      `/rally/v1/payments/tournament-registration/${registrationId}/confirm-zero-payment`,
      {},
    )
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'CONFIRM_ZERO_PAYMENT_FAILED',
        message: err instanceof Error ? err.message : 'Failed to confirm zero payment',
        details: err,
      },
    }
  }
}
