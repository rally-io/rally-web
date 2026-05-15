// src/services/api/clubs.ts
import client from './client'
import type { ApiResponse, Club } from '@/types/api'

export async function getClubs(params: Record<string, any> = {}): Promise<ApiResponse<{ items: Club[]; next_cursor: string | null }>> {
  return client.get('/web/v1/clubs/', { params })
}

export async function getClub(clubId: string, params: Record<string, any> = {}): Promise<ApiResponse<Club>> {
  return client.get(`/web/v1/clubs/${clubId}`, { params })
}