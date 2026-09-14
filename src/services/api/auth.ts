import client from './client'
import type { ApiResponse, PlayerCreatePayload, PlayerMe } from '@/types/api'
import { supabase } from '@/lib/supabase'
import { authPath, getAuthReturnTo } from '@/lib/authReturn'

// GET /rally/v1/players/check-email — drives sign-in vs sign-up branching.
// Backend returns ApiResponse<boolean>. Per WEB_AUTH_SPEC §6, this endpoint is unauthenticated.
export async function checkEmailExists(email: string): Promise<boolean> {
  const lower = email.trim().toLowerCase()
  const result = (await client.get(
    `/rally/v1/players/check-email?email=${encodeURIComponent(lower)}`,
    { headers: { 'X-Skip-Auth': '1' } }, // request interceptor strips Authorization for this call
  )) as ApiResponse<boolean>
  if (!result.success) {
    throw new Error(result.error.message ?? 'Failed to check email')
  }
  if (typeof result.data !== 'boolean') throw new Error('Invalid email lookup response')
  return result.data
}

// POST /rally/v1/players/ — creates the players row. Uses get_current_user (any Supabase session).
export async function createPlayerProfile(
  payload: PlayerCreatePayload,
): Promise<ApiResponse<PlayerMe>> {
  return client.post('/rally/v1/players/', payload) as Promise<ApiResponse<PlayerMe>>
}

// Wraps Supabase's resend so the UI doesn't depend on the SDK directly.
export async function resendVerificationEmail(email: string, next = getAuthReturnTo()): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: window.location.origin + authPath('/auth/callback', next) },
  })
  if (error) throw error
}

type Phone = { country_code: string; contact_number: string }
type PhoneResult = { success: boolean; data?: { accessToken?: string; refreshToken?: string }; error?: unknown }

export async function requestPhoneOtp(phone: Phone): Promise<void> {
  const result = await client.post('/rally/v1/auth/phone/request-otp', phone, { headers: { 'X-Skip-Auth': '1' } }) as PhoneResult
  if (result.success !== true) throw result.error ?? new Error('Phone request failed')
}

export async function verifyPhoneOtp(phone: Phone, otp: string): Promise<void> {
  const result = await client.post('/rally/v1/auth/phone/verify-otp', { ...phone, otp }, { headers: { 'X-Skip-Auth': '1' } }) as PhoneResult
  if (result.success !== true) throw result.error ?? new Error('Invalid OTP')
  if (!result.data?.accessToken || !result.data.refreshToken) throw new Error('Invalid OTP response')
  const { data, error } = await supabase.auth.setSession({ access_token: result.data.accessToken, refresh_token: result.data.refreshToken })
  if (error) throw error
  if (!data.session) throw new Error('Invalid OTP session')
}

export async function updateAccountPassword(password: string, expectedUserId?: string): Promise<void> {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!session || (expectedUserId && session.user.id !== expectedUserId)) {
    throw new Error('Recovery session changed')
  }
  // Pin this request to the recovered account. SDK updateUser re-reads shared
  // storage after an async lock, which could pick up another tab's new account.
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const result = await response.json()
  if (!response.ok) throw { ...result, status: response.status }
  if (result.id !== session.user.id) throw new Error('Recovery session changed')
}
