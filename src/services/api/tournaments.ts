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
 * Confirm a tournament registration whose amount due is 0.
 *
 * Uses the payments endpoint, which takes no body. Do NOT switch this to
 * POST /rally/v1/tournaments/{tid}/registrations/{rid}/pay — that route exists
 * but its TournamentPaymentConfirmRequest requires a `payment_reference`
 * string, so an empty body 422s every time, and it writes a revenue-ledger
 * entry that makes no sense for a ₪0 registration.
 */
export async function confirmZeroPayment(
  registrationId: string,
): Promise<ApiResponse<unknown>> {
  return client.post(
    `/rally/v1/payments/tournament-registration/${registrationId}/confirm-zero-payment`,
  )
}
