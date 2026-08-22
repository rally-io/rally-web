// src/services/api/players.ts
import client from './client'
import type { ApiResponse, PlayerSearchResult } from '@/types/api'

export async function searchPlayers(
  query: string,
): Promise<ApiResponse<PlayerSearchResult[]>> {
  return client.get('/rally/v1/players/search', { params: { query } })
}

// --- Phone verification (onboarding / profile edit) ---
// Deliberately separate from Supabase phone-login OTP — see rally-api's
// PlayerService.request_phone_verification docstring: this never touches
// Supabase's auth.users.phone uniqueness slot.

export async function checkPhoneAvailable(
  countryCode: string,
  contactNumber: string,
): Promise<ApiResponse<{ available: boolean }>> {
  return client.post('/rally/v1/players/phone/check', {
    country_code: countryCode,
    contact_number: contactNumber,
  })
}

export async function requestPhoneVerificationOtp(
  countryCode: string,
  contactNumber: string,
): Promise<ApiResponse<{ message: string }>> {
  return client.post('/rally/v1/players/phone/request-otp', {
    country_code: countryCode,
    contact_number: contactNumber,
  })
}

export async function verifyPhoneVerificationOtp(
  countryCode: string,
  contactNumber: string,
  otp: string,
): Promise<ApiResponse<{ verified: boolean }>> {
  return client.post('/rally/v1/players/phone/verify-otp', {
    country_code: countryCode,
    contact_number: contactNumber,
    otp,
  })
}
