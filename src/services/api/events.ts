// src/services/api/events.ts
import client from './client'
import type { ApiResponse } from '@/types/api'

/**
 * Minimal event shape we need for payment polling
 * (PAYMENT_SPEC.md §6.4 — `joined === true` confirms the participation).
 * The full event detail page (future phase) will likely extend this.
 */
export interface EventDetail {
  id: string
  joined: boolean
}

export async function getEvent(eventId: string): Promise<ApiResponse<EventDetail>> {
  return client.get(`/rally/v1/events/${eventId}`)
}

export async function releaseEvent(
  eventId: string,
): Promise<ApiResponse<{ released: boolean }>> {
  try {
    return await client.post(`/rally/v1/events/${eventId}/release`, {})
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: err?.code ?? 'SERVER_ERROR',
        message: err?.message ?? 'An unexpected error occurred',
        details: null,
      },
    }
  }
}