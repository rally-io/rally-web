import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  isValidNewPassword,
  isAuthError,
  isProfileComplete,
} from './auth'

describe('EMAIL_REGEX', () => {
  it.each([
    ['ada@example.com', true],
    ['ADA@EXAMPLE.CO.UK', true],
    ['no-at-sign.com', false],
    ['', false],
    ['a@b', false],
    ['a@b.c', true],
    ['  a@b.c', false], // whitespace not allowed
  ])('matches %s -> %s', (input, expected) => {
    expect(isValidEmail(input)).toBe(expected)
  })
})

describe('PASSWORD_REGEX (signup)', () => {
  it.each([
    ['Aa345678', true],
    ['Short1A', false],     // 7 chars
    ['nouppercase1', false],
    ['NoDigitsHere', false],
    ['Valid12345', true],
    ['', false],
  ])('matches %s -> %s', (input, expected) => {
    expect(isValidNewPassword(input)).toBe(expected)
  })
})

describe('isAuthError', () => {
  it.each([
    ['JWT expired', true],
    ['could not validate credentials', true],
    ['Unauthorized', true],
    ['not authenticated', true],
    ['invalid token', true],
    ['Token expired', true],
    ['refresh token revoked', true],
    ['network error', false],
    ['Validation failed', false],
    ['', false],
  ])('flags %s -> %s', (msg, expected) => {
    expect(isAuthError(msg)).toBe(expected)
  })

  it('handles null/undefined safely', () => {
    expect(isAuthError(null)).toBe(false)
    expect(isAuthError(undefined)).toBe(false)
  })
})

describe('isProfileComplete', () => {
  it('returns true if any of first_name/last_name/contact_number is set', () => {
    expect(isProfileComplete({ first_name: 'Ada', last_name: '', contact_number: '' })).toBe(true)
    expect(isProfileComplete({ first_name: '', last_name: 'L', contact_number: '' })).toBe(true)
    expect(isProfileComplete({ first_name: '', last_name: '', contact_number: '501234567' })).toBe(true)
  })
  it('returns false if all three are empty/null', () => {
    expect(isProfileComplete({ first_name: '', last_name: '', contact_number: '' })).toBe(false)
    expect(isProfileComplete({ first_name: null, last_name: null, contact_number: null })).toBe(false)
    expect(isProfileComplete(null)).toBe(false)
  })
})
