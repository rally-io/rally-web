// src/services/api/tournaments.ts
import client from './client'
import type {
  ApiResponse, Tournament, TournamentDetail, RegistrationDetail, TournamentParticipants,
  RegisterPayload, TournamentRegistrationResult,
} from '@/types/api'

export interface TournamentListParams {
  type?: 'upcoming' | 'my'
  scope?: 'open' | 'past'
  cursor?: string
  limit?: number
  search?: string
  show_cancelled?: boolean
  club_id?: string
  /** See the default below — only pass this to opt *out*. */
  include_live?: boolean
  club_ids?: string[]
  sort?: 'soonest' | 'latest'
}

export interface TournamentFilterClub {
  id: string
  name: string
  count: number
}

export async function getTournaments(
  params: TournamentListParams = {},
): Promise<ApiResponse<{ items: Tournament[]; next_cursor: string | null }>> {
  return client.get('/rally/v1/tournaments/', {
    // Tournaments under way (status=in_progress) are in neither the open nor
    // the past listing while they are being played. The site wants them —
    // that is what the LIVE badge is for — so every web listing opts in.
    params: { include_live: true, ...params },
    // FastAPI expects repeated club_ids=…&club_ids=…; axios default emits club_ids[]=
    paramsSerializer: { indexes: null },
  })
}

export async function getTournament(
  tournamentId: string,
): Promise<ApiResponse<TournamentDetail>> {
  return client.get(`/rally/v1/tournaments/${tournamentId}`)
}

export async function getTournamentParticipants(
  tournamentId: string,
): Promise<ApiResponse<TournamentParticipants>> {
  // limit=100 covers realistic tournament sizes (~32 pairs max) in one page.
  return client.get(`/rally/v1/tournaments/${tournamentId}/participants`, {
    params: { limit: 100 },
  })
}

export async function getTournamentFilterOptions(
  search?: string,
): Promise<ApiResponse<{ clubs: TournamentFilterClub[] }>> {
  // include_live mirrors the list call above so counts match what the list shows
  return client.get('/rally/v1/tournaments/filter-options', {
    // search has min_length=1 on the API — omit entirely rather than send ''
    params: { include_live: true, ...(search ? { search } : {}) },
  })
}

export async function getRegistration(
  tournamentId: string,
  registrationId: string,
): Promise<ApiResponse<RegistrationDetail>> {
  return client.get(
    `/rally/v1/tournaments/${tournamentId}/registrations/${registrationId}`,
  )
}

export async function registerTournament(
  tournamentId: string,
  payload: RegisterPayload,
): Promise<ApiResponse<TournamentRegistrationResult>> {
  return client.post(`/rally/v1/tournaments/${tournamentId}/register`, payload)
}
