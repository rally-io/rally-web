import client from './client'
import type { ApiResponse, PlayerCreatePayload, PlayerMe } from '@/types/api'
import { supabase } from '@/lib/supabase'

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
  return result.data
}

// POST /rally/v1/players/ — creates the players row. Uses get_current_user (any Supabase session).
export async function createPlayerProfile(
  payload: PlayerCreatePayload,
): Promise<ApiResponse<PlayerMe>> {
  return client.post('/rally/v1/players/', payload) as Promise<ApiResponse<PlayerMe>>
}

// Wraps Supabase's resend so the UI doesn't depend on the SDK directly.
export async function resendVerificationEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw error
}
