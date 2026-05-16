// src/services/api/client.ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { supabase } from '@/lib/supabase'
import { isAuthError } from '@/lib/auth'

// Bridge to AppSessionContext — set once when the provider mounts.
// Kept here (not React) so axios stays free of React imports.
type ApiBridge = {
  ensurePlayerProfile: () => Promise<void>
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

// Augment config so we can tag retried requests.
type RetryableConfig = InternalAxiosRequestConfig & { __retried?: boolean }

client.interceptors.request.use(async (config) => {
  // Honor an explicit opt-out for unauthenticated endpoints (e.g. check-email).
  if (config.headers?.['X-Skip-Auth']) {
    delete config.headers['X-Skip-Auth']
    if (config.headers) delete config.headers.Authorization
    return config
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${session.access_token}`
  } else if (config.headers) {
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

    const { status, data, config } = error.response
    const retryableConfig = config as RetryableConfig | undefined
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

    // --- 403 — onboarding-related, single retry path ---
    const needsPlayerRow =
      code === 'PROFILE_FIELDS_REQUIRED' ||
      code === 'PLAYER_NOT_FOUND' ||
      (typeof detailMsg === 'string' && /player.*(not.*found|profile.*incomplete)/i.test(detailMsg))

    if (status === 403 && needsPlayerRow && !retryableConfig?.__retried && _bridge && retryableConfig) {
      try {
        await _bridge.ensurePlayerProfile()
        retryableConfig.__retried = true
        return client.request(retryableConfig)
      } catch {
        // user closed/cancelled the blocking modal — fall through to normal rejection
      }
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
