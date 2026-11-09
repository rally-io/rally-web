import axios, { isAxiosError } from 'axios'
import type {
  ApiFailure, PublicCorporateEvent, PublicRegistrationRequest, PublicRegistrationResult,
  PublicRegistrationStatus, PublicRoster,
} from './types'

/**
 * Deliberately NOT the shared `services/api/client.ts` instance: that one attaches a Supabase
 * access token, force-signs-out on 401 and opens the profile modal on 403. A corporate guest has
 * no account — the registration token (or the roster token in the path) is the only credential.
 * Same pattern as `features/publicTournament/api/publicBracket.ts`.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

export const publicClient = axios.create({ baseURL: API_BASE_URL, timeout: 30_000 })

export const TOKEN_HEADER = 'X-Registration-Token'

/** Everything the API wraps in its `{success, data}` envelope. */
function unwrap<T>(body: unknown): T {
  const b = body as { data?: unknown } | null
  return (b && typeof b === 'object' && 'data' in b ? b.data : body) as T
}

/** Any thrown value -> the `{status, code, message, details}` shape the rest of the web uses. */
export function toApiFailure(error: unknown): ApiFailure {
  if (isAxiosError(error)) {
    if (!error.response) return { status: null, code: 'NETWORK_ERROR', message: 'Network error' }
    const { status, data } = error.response
    const err = (data as { error?: unknown } | undefined)?.error
    if (err && typeof err === 'object') {
      const e = err as { code?: string; message?: string; details?: Record<string, unknown> }
      return {
        status,
        code: e.code ?? (status === 429 ? 'RATE_LIMITED' : 'SERVER_ERROR'),
        message: e.message ?? '',
        details: e.details,
      }
    }
    return { status, code: status === 429 ? 'RATE_LIMITED' : 'SERVER_ERROR', message: typeof err === 'string' ? err : '' }
  }
  const e = error as Partial<ApiFailure> | null
  return {
    status: typeof e?.status === 'number' ? e.status : null,
    code: typeof e?.code === 'string' ? e.code : 'UNKNOWN',
    message: typeof e?.message === 'string' ? e.message : '',
    details: e?.details,
  }
}

/** `null` for an unknown/draft slug (404) — the caller falls back to the legacy registry. */
export async function fetchCorporateEvent(slug: string): Promise<PublicCorporateEvent | null> {
  try {
    const { data } = await publicClient.get(`/public/corporate-events/${encodeURIComponent(slug)}`)
    return unwrap<PublicCorporateEvent>(data)
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

export async function registerForEvent(
  slug: string,
  body: PublicRegistrationRequest,
): Promise<PublicRegistrationResult> {
  try {
    const { data } = await publicClient.post(
      `/public/corporate-events/${encodeURIComponent(slug)}/registrations`,
      body,
    )
    return unwrap<PublicRegistrationResult>(data)
  } catch (error) {
    throw toApiFailure(error)
  }
}

export async function fetchRegistrationStatus(
  registrationId: string,
  token: string,
): Promise<PublicRegistrationStatus> {
  try {
    const { data } = await publicClient.get(
      `/public/corporate-registrations/${encodeURIComponent(registrationId)}`,
      { headers: { [TOKEN_HEADER]: token } },
    )
    return unwrap<PublicRegistrationStatus>(data)
  } catch (error) {
    throw toApiFailure(error)
  }
}

/** One participant's files, as multipart `for_player` + `files[]`. */
export async function uploadCorporateEvidence(
  registrationId: string,
  token: string,
  forPlayer: 1 | 2,
  files: File[],
): Promise<void> {
  const form = new FormData()
  form.append('for_player', String(forPlayer))
  for (const file of files) form.append('files[]', file)
  try {
    await publicClient.post(
      `/public/corporate-registrations/${encodeURIComponent(registrationId)}/evidence`,
      form,
      // Clearing Content-Type lets the browser write the multipart boundary itself.
      { headers: { [TOKEN_HEADER]: token, 'Content-Type': undefined } },
    )
  } catch (error) {
    throw toApiFailure(error)
  }
}

export async function fetchRoster(rosterToken: string): Promise<PublicRoster> {
  try {
    const { data } = await publicClient.get(`/public/corporate-roster/${encodeURIComponent(rosterToken)}`)
    return unwrap<PublicRoster>(data)
  } catch (error) {
    throw toApiFailure(error)
  }
}
