import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestPhoneOtp, verifyPhoneOtp, resendVerificationEmail, updateAccountPassword } from './auth'
const mocks = vi.hoisted(() => ({ post: vi.fn(), setSession: vi.fn(), resend: vi.fn(), getSession: vi.fn() }))
vi.mock('./client', () => ({ default: { post: mocks.post } }))
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { setSession: mocks.setSession, resend: mocks.resend, getSession: mocks.getSession } } }))
beforeEach(() => vi.resetAllMocks())
afterEach(() => vi.unstubAllGlobals())
const phone = { country_code: '+972', contact_number: '0501234567' }
describe('existing-player phone authentication', () => {
  it('uses the unauthenticated existing-player router, rejecting HTTP 200 success:false', async () => {
    mocks.post.mockResolvedValue({ success: false, error: 'SMS unavailable' })
    await expect(requestPhoneOtp(phone)).rejects.toBe('SMS unavailable')
    expect(mocks.post).toHaveBeenCalledWith('/rally/v1/auth/phone/request-otp', phone, { headers: { 'X-Skip-Auth': '1' } })
  })
  it('never creates a session from a failed verification response or missing tokens', async () => {
    mocks.post.mockResolvedValueOnce({ success: false, error: 'Invalid code', data: { accessToken: 'bad', refreshToken: 'bad' } })
    await expect(verifyPhoneOtp(phone, '123456')).rejects.toBe('Invalid code')
    mocks.post.mockResolvedValue({ success: true, data: {} })
    await expect(verifyPhoneOtp(phone, '123456')).rejects.toThrow('Invalid OTP response')
    expect(mocks.setSession).not.toHaveBeenCalled()
  })
  it('adopts the verified session and forwards SDK errors', async () => {
    mocks.post.mockResolvedValue({ success: true, data: { accessToken: 'access', refreshToken: 'refresh' } })
    mocks.setSession.mockResolvedValue({ data: { session: {} }, error: null })
    await verifyPhoneOtp(phone, '123456')
    expect(mocks.setSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' })
    mocks.setSession.mockResolvedValue({ data: { session: null }, error: new Error('session rejected') })
    await expect(verifyPhoneOtp(phone, '123456')).rejects.toThrow('session rejected')
  })
  it('preserves next in verification emails without relying on browser storage', async () => {
    mocks.resend.mockResolvedValue({ error: null })
    await resendVerificationEmail(' PLAYER@Example.com ', '/tournaments/final')
    expect(mocks.resend).toHaveBeenCalledWith({ type: 'signup', email: 'player@example.com', options: { emailRedirectTo: window.location.origin + '/auth/callback?next=%2Ftournaments%2Ffinal' } })
  })
})

describe('password recovery account binding', () => {
  it('does not update a different account that signed in before submission', async () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'b' }, access_token: 'token-b' } }, error: null })
    await expect(updateAccountPassword('Password1', 'a')).rejects.toThrow('Recovery session changed')
    expect(request).not.toHaveBeenCalled()
  })
  it('pins the request token so a subsequent account switch cannot change its target', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'a' }, access_token: 'token-a' } }, error: null })
    const request = vi.fn().mockImplementation(async () => {
      mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'b' }, access_token: 'token-b' } }, error: null })
      return { ok: true, json: async () => ({ id: 'a' }) }
    })
    vi.stubGlobal('fetch', request)
    await updateAccountPassword('Password1', 'a')
    expect(request).toHaveBeenCalledWith(expect.stringContaining('/auth/v1/user'), expect.objectContaining({ method: 'PUT', headers: expect.objectContaining({ Authorization: 'Bearer token-a' }), body: JSON.stringify({ password: 'Password1' }) }))
    expect(mocks.setSession).not.toHaveBeenCalled()
  })
})
