import { beforeEach, describe, expect, it } from 'vitest'
import { authPath, getAuthReturnTo, safeReturnTo, sanitizeReturnTo } from './authReturn'

beforeEach(() => { sessionStorage.clear(); window.history.replaceState({}, '', '/') })
describe('auth return destinations', () => {
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/%5cevil.test', '/%2fevil.test', '/\nevil', '/%0aevil', '/login?next=/tournaments/1', '/auth/callback', '/set-password', '/foo/../login', '/%61uth/callback', '/%', undefined, null])('rejects unsafe destination %s', value => {
    expect(safeReturnTo(value)).toBe('/')
  })
  it('keeps tournament query values encoded once through every auth transition', () => {
    const next = '/tournaments/1?partner=one%20two#register'
    expect(safeReturnTo(next)).toBe(next)
    expect(new URLSearchParams(authPath('/auth/verify-email', next).split('?')[1]).get('next')).toBe(next)
  })
  it('uses explicit next before storage, rejecting an unsafe explicit next', () => {
    sessionStorage.setItem('rally:auth-return', '/tournaments/old')
    window.history.replaceState({}, '', '/login?next=%2Ftournaments%2Fnew')
    expect(getAuthReturnTo()).toBe('/tournaments/new')
    window.history.replaceState({}, '', '/login?next=https://evil.test')
    expect(getAuthReturnTo()).toBe('/')
    window.history.replaceState({}, '', '/login')
    expect(getAuthReturnTo()).toBe('/tournaments/old')
  })
})

// Ported from the deleted src/lib/returnTo.ts: the payment pages need
// "rejected" and "home" to be distinguishable, and share these rules.
describe('sanitizeReturnTo', () => {
  it.each(['//evil.example/x', 'https://evil.example/x', 'join/acme', '/\\evil.example', '', null, undefined])(
    'is null for the unsafe destination %s, so the caller keeps its own default',
    value => { expect(sanitizeReturnTo(value)).toBeNull() },
  )
  it('keeps a same-origin path, including a bare "/"', () => {
    expect(sanitizeReturnTo('/join/acme')).toBe('/join/acme')
    expect(sanitizeReturnTo('/join/acme?x=1')).toBe('/join/acme?x=1')
    expect(sanitizeReturnTo('/')).toBe('/')
  })
})
