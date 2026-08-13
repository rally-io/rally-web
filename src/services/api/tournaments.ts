// src/services/api/tournaments.ts
import client from './client'
import type {
  ApiResponse, Tournament, TournamentDetail, RegistrationDetail, TournamentParticipants,
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

export async function getTournamentFilterOptions(): Promise<
  ApiResponse<{ clubs: TournamentFilterClub[] }>
> {
  // include_live mirrors the list call above so counts match what the list shows
  return client.get('/rally/v1/tournaments/filter-options', {
    params: { include_live: true },
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
