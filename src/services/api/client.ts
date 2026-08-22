// src/services/api/client.ts
import axios, { AxiosError } from 'axios'
import { supabase } from '@/lib/supabase'
import { isAuthError } from '@/lib/auth'

// Bridge to AppSessionContext — set once when the provider mounts.
// Kept here (not React) so axios stays free of React imports.
type ApiBridge = {
  redirectToProfileEdit: () => void
  forceSignOut: () => Promise<void>
}
let _bridge: ApiBridge | null = null
export function __setApiBridge(bridge: ApiBridge | null) {
  _bridge = bridge
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use(async (config) => {
  // Tag every web request so rally-api can redirect Grow callbacks to the
  // web return URL instead of the mobile deep link (PAYMENT_BACKEND_DELTA.md §1).
  config.headers = config.headers ?? {}
  config.headers['X-Rally-Client'] = 'web'

  // Honor an explicit opt-out for unauthenticated endpoints (e.g. check-email).
  if (config.headers['X-Skip-Auth']) {
    delete config.headers['X-Skip-Auth']
    delete config.headers.Authorization
    return config
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  } else {
    delete config.headers.Authorization
  }
  return config
})

client.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError<any>) => {
    if (!error.response) {
      return Promise.reject({ code: 'NETWORK_ERROR', message: 'Network error' })
    }

    const { status, data } = error.response
    const code: string | undefined = data?.error?.code
    const detailMsg: string | undefined =
      (typeof data?.error === 'string' ? data.error : data?.error?.message) ?? data?.detail

    // --- 401 — authentication failed ---
    if (status === 401) {
      if (isAuthError(detailMsg) || isAuthError(data?.detail) || isAuthError(code)) {
        await _bridge?.forceSignOut()
      }
      return Promise.reject({
        isUnauthorized: true,
        status,
        code: code ?? 'UNAUTHORIZED',
        message: detailMsg ?? 'Authentication required',
      })
    }

    // --- missing/incomplete player profile, redirect to the profile edit page ---
    // PROFILE_FIELDS_REQUIRED is raised by rally-api as a 422 (e.g. tournament
    // registration missing contact_number/skill_level) — PLAYER_NOT_FOUND-style
    // checks are 403. Catch both; this used to only check 403, which meant the
    // 422 case never actually triggered the redirect.
    const needsPlayerRow =
      code === 'PROFILE_FIELDS_REQUIRED' ||
      code === 'PLAYER_NOT_FOUND' ||
      (typeof detailMsg === 'string' && /player.*(not.*found|profile.*incomplete)/i.test(detailMsg))

    if ((status === 403 || status === 422) && needsPlayerRow) {
      _bridge?.redirectToProfileEdit()
    }

    // --- generic rejection (preserves existing rejection shape) ---
    if (data?.success === false && data?.error) {
      return Promise.reject({
        status,
        code,
        message: detailMsg,
        details: typeof data.error === 'object' ? data.error.details : undefined,
      })
    }
    if (status === 404) {
      return Promise.reject({ isNotFound: true, status, message: detailMsg ?? 'Not found' })
    }
    if (detailMsg) {
      return Promise.reject({ status, code: code ?? 'SERVER_ERROR', message: detailMsg })
    }
    return Promise.reject({ status, code: 'SERVER_ERROR', message: 'An unexpected error occurred' })
  },
)

export default client
