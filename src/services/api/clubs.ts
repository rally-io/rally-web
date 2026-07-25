// src/services/api/clubs.ts
import client from './client'
import type { ApiResponse, Club, CursorMeta } from '@/types/api'

// `view: 'web'` asks the API for the web allowlist payload (no
// available_slots or other business fields). Old servers ignore it.
export async function getClubs(
  params: Record<string, any> = {},
): Promise<ApiResponse<Club[], CursorMeta>> {
  return client.get('/rally/v1/clubs/', {
    params: { view: 'web', ...params },
    paramsSerializer: { indexes: null },
  })
}

export async function getClub(
  clubId: string,
  params: Record<string, any> = {},
): Promise<ApiResponse<Club>> {
  return client.get(`/rally/v1/clubs/${clubId}`, { params: { view: 'web', ...params } })
}