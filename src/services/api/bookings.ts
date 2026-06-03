// src/services/api/bookings.ts
import client from './client'
import type { ApiResponse, BookingRequest, BookingResponse } from '@/types/api'

export async function bookCourt(data: BookingRequest): Promise<ApiResponse<BookingResponse>> {
  return client.post('/rally/v1/bookings/', data)
}

export async function getBooking(bookingId: string): Promise<ApiResponse<BookingResponse>> {
  return client.get(`/rally/v1/bookings/${bookingId}`)
}

export async function releaseBookingHold(
  bookingId: string,
): Promise<ApiResponse<{ released: boolean }>> {
  try {
    return await client.post(`/rally/v1/bookings/${bookingId}/release`, {})
  } catch (err: any) {
    return { success: false, error: { code: err?.code ?? 'SERVER_ERROR', message: err?.message ?? 'An unexpected error occurred', details: null } }
  }
}