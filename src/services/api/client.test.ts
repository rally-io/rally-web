import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase BEFORE importing the client so the interceptor sees a stubbed getSession.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}))

describe('axios client request interceptor', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('sets X-Rally-Client: web on every outgoing request', async () => {
    const { default: client } = await import('./client')

    // Grab the request interceptor handler directly via the public axios API.
    // interceptors.request.handlers[0].fulfilled is the function we attached in client.ts.
    // @ts-expect-error — private but stable across axios 1.x.
    const handler = client.interceptors.request.handlers[0].fulfilled
    const config = await handler({ headers: {} as any })

    expect(config.headers['X-Rally-Client']).toBe('web')
  })

  it('keeps X-Rally-Client when skip-auth is set (only Authorization is stripped)', async () => {
    const { default: client } = await import('./client')
    // @ts-expect-error — private but stable.
    const handler = client.interceptors.request.handlers[0].fulfilled
    const config = await handler({ headers: { 'X-Skip-Auth': '1' } as any })

    expect(config.headers['X-Rally-Client']).toBe('web')
    expect(config.headers.Authorization).toBeUndefined()
  })
})

describe('axios client response interceptor — profile-edit redirect bridge', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('redirects to profile edit on a 422 PROFILE_FIELDS_REQUIRED (e.g. tournament registration)', async () => {
    const { default: client, __setApiBridge } = await import('./client')
    const redirectToProfileEdit = vi.fn()
    __setApiBridge({ redirectToProfileEdit, forceSignOut: vi.fn() })

    // @ts-expect-error — private but stable.
    const rejected = client.interceptors.response.handlers[0].rejected
    await rejected!({
      response: {
        status: 422,
        data: {
          success: false,
          error: { code: 'PROFILE_FIELDS_REQUIRED', message: 'Profile fields required', details: null },
        },
      },
    }).catch(() => {})

    expect(redirectToProfileEdit).toHaveBeenCalledTimes(1)
  })

  it('still redirects on the pre-existing 403 PLAYER_NOT_FOUND case', async () => {
    const { default: client, __setApiBridge } = await import('./client')
    const redirectToProfileEdit = vi.fn()
    __setApiBridge({ redirectToProfileEdit, forceSignOut: vi.fn() })

    // @ts-expect-error — private but stable.
    const rejected = client.interceptors.response.handlers[0].rejected
    await rejected!({
      response: {
        status: 403,
        data: {
          success: false,
          error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found', details: null },
        },
      },
    }).catch(() => {})

    expect(redirectToProfileEdit).toHaveBeenCalledTimes(1)
  })
})