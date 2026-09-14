import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}))

import client, { __setApiBridge } from './client'

function rejected() {
  // axios stores interceptors as {fulfilled, rejected}; index 0 is the one client.ts registered.
  const handlers = (client.interceptors.response as unknown as { handlers: { rejected: (e: unknown) => Promise<unknown> }[] }).handlers
  return handlers[0].rejected
}

function profileError(config: Record<string, unknown>) {
  return {
    config,
    response: {
      status: 422,
      data: { success: false, error: { code: 'PROFILE_FIELDS_REQUIRED', message: 'Profile fields required to perform this action', details: { missing_fields: [] } } },
    },
  }
}

describe('client — PROFILE_FIELDS_REQUIRED redirect', () => {
  const bridge = { redirectToProfileEdit: vi.fn(), forceSignOut: vi.fn(async () => {}) }
  beforeEach(() => { vi.clearAllMocks(); __setApiBridge(bridge) })

  it('redirects by default', async () => {
    await expect(rejected()(profileError({}))).rejects.toMatchObject({ code: 'PROFILE_FIELDS_REQUIRED' })
    expect(bridge.redirectToProfileEdit).toHaveBeenCalledTimes(1)
  })

  it('does not redirect when the request opted out', async () => {
    await expect(rejected()(profileError({ skipProfileRedirect: true }))).rejects.toMatchObject({ code: 'PROFILE_FIELDS_REQUIRED' })
    expect(bridge.redirectToProfileEdit).not.toHaveBeenCalled()
  })
})
