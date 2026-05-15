// src/services/api/bookings.ts
import client from './client'
import type { ApiResponse, BookingRequest, BookingResponse } from '@/types/api'

export async function bookCourt(data: BookingRequest): Promise<ApiResponse<BookingResponse>> {
  return client.post('/rally/v1/bookings/', data)
}