// src/services/api/clubs.ts
import client from './client'
import type { ApiResponse, Club, CursorMeta } from '@/types/api'

export async function getClubs(
  params: Record<string, any> = {},
): Promise<ApiResponse<Club[], CursorMeta>> {
  return client.get('/web/v1/clubs/', {
    params,
    paramsSerializer: { indexes: null },
  })
}

export async function getClub(
  clubId: string,
  params: Record<string, any> = {},
): Promise<ApiResponse<Club>> {
  return client.get(`/web/v1/clubs/${clubId}`, { params })
}