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