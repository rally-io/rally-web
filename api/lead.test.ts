import { describe, it, expect } from 'vitest'
import { isAllowedSource } from './lead'

// The Apps Script names the Google Sheet tab after `source` verbatim, so this
// predicate is the only thing between an arbitrary POST and an arbitrary tab.
describe('isAllowedSource', () => {
  it('accepts the three fixed marketing sources', () => {
    expect(isAllowedSource('coach_application')).toBe(true)
    expect(isAllowedSource('contact_form')).toBe(true)
    expect(isAllowedSource('crm_waitlist')).toBe(true)
  })

  it('accepts a well-formed corporate source', () => {
    expect(isAllowedSource('corporate_acme')).toBe(true)
    expect(isAllowedSource('corporate_acme_ltd_2026')).toBe(true)
  })

  it('requires the corporate_ prefix', () => {
    expect(isAllowedSource('acme')).toBe(false)
    expect(isAllowedSource('corporate')).toBe(false)
    expect(isAllowedSource('corporate_')).toBe(false)
    expect(isAllowedSource('_corporate_acme')).toBe(false)
  })

  it('rejects characters that have no business in a sheet tab name', () => {
    expect(isAllowedSource('corporate_ACME')).toBe(false)
    expect(isAllowedSource('corporate_a b')).toBe(false)
    expect(isAllowedSource('corporate_a-b')).toBe(false)
    expect(isAllowedSource("corporate_a'b")).toBe(false)
    expect(isAllowedSource('corporate_a/b')).toBe(false)
    expect(isAllowedSource('corporate_a\nb')).toBe(false)
  })

  it('rejects a suffix long enough to be abusive', () => {
    expect(isAllowedSource(`corporate_${'a'.repeat(40)}`)).toBe(true)
    expect(isAllowedSource(`corporate_${'a'.repeat(41)}`)).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isAllowedSource(undefined)).toBe(false)
    expect(isAllowedSource(null)).toBe(false)
    expect(isAllowedSource(42)).toBe(false)
    expect(isAllowedSource(['contact_form'])).toBe(false)
    expect(isAllowedSource({ toString: () => 'contact_form' })).toBe(false)
  })
})
