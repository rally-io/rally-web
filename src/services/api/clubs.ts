// src/services/api/clubs.ts
import client from './client'
import type { ApiResponse, Club, CursorMeta } from '@/types/api'

// `view: 'web'` asks the API for the web allowlist payload (no
// available_slots or other business fields). Old servers ignore it.
//
// `show_without_availability: true` mirrors the mobile app's default filter
// (rally-mobile DEFAULT_FILTERS). The API defaults it to *false*, which drops
// every club with no bookable slot computed for today — that is almost all of
// them, since CRM/external clubs never have slots computed in Rally. Without
// this the clubs page shows a single club. Callers can still override it.
export async function getClubs(
  params: Record<string, any> = {},
): Promise<ApiResponse<Club[], CursorMeta>> {
  return client.get('/rally/v1/clubs/', {
    params: { view: 'web', show_without_availability: true, ...params },
    paramsSerializer: { indexes: null },
  })
}

export async function getClub(
  clubId: string,
  params: Record<string, any> = {},
): Promise<ApiResponse<Club>> {
  return client.get(`/rally/v1/clubs/${clubId}`, { params: { view: 'web', ...params } })
}