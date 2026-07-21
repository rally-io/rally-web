// src/services/api/bookings.ts
import client from './client'
import type { ApiResponse, BookingResponse } from '@/types/api'

// Read-only: used by useEntityPolling on the grace-period confirming page.
export async function getBooking(bookingId: string): Promise<ApiResponse<BookingResponse>> {
  return client.get(`/rally/v1/bookings/${bookingId}`)
}
