import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearStoredRegistration, readStoredRegistration, storageKey, writeStoredRegistration } from '../storage'

afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })

describe('registration token storage', () => {
  it('keys by slug under rally:corp:<slug> and round-trips', () => {
    expect(storageKey('acme-day')).toBe('rally:corp:acme-day')
    expect(writeStoredRegistration('acme-day', { registration_id: 'r1', access_token: 't1' })).toBe(true)
    expect(JSON.parse(localStorage.getItem('rally:corp:acme-day')!)).toEqual({ registration_id: 'r1', access_token: 't1' })
    expect(readStoredRegistration('acme-day')).toEqual({ registration_id: 'r1', access_token: 't1' })
    expect(readStoredRegistration('other')).toBeNull()
  })

  it('ignores corrupt or incomplete values', () => {
    localStorage.setItem('rally:corp:x', '{not json')
    expect(readStoredRegistration('x')).toBeNull()
    localStorage.setItem('rally:corp:x', JSON.stringify({ registration_id: 'r' }))
    expect(readStoredRegistration('x')).toBeNull()
  })

  it('never throws when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readStoredRegistration('a')).toBeNull()
    expect(writeStoredRegistration('a', { registration_id: 'r', access_token: 't' })).toBe(false)
    expect(() => clearStoredRegistration('a')).not.toThrow()
  })

  it('clears', () => {
    writeStoredRegistration('a', { registration_id: 'r', access_token: 't' })
    clearStoredRegistration('a')
    expect(readStoredRegistration('a')).toBeNull()
  })
})
