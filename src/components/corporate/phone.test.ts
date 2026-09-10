import { describe, it, expect } from 'vitest'
import { normalizeIsraeliLocal, isValidIsraeliLocal } from './phone'

describe('normalizeIsraeliLocal', () => {
  it('keeps digits only, strips the trunk 0 and caps at 9', () => {
    expect(normalizeIsraeliLocal('050-123-4567')).toBe('501234567')
    expect(normalizeIsraeliLocal('0501234567890')).toBe('501234567')
    expect(normalizeIsraeliLocal('  52 999 8877 ')).toBe('529998877')
  })
})

describe('isValidIsraeliLocal', () => {
  it('accepts 8–9 digits and nothing else', () => {
    expect(isValidIsraeliLocal('501234567')).toBe(true)
    expect(isValidIsraeliLocal('31234567')).toBe(true)
    expect(isValidIsraeliLocal('5012345')).toBe(false)
    expect(isValidIsraeliLocal('')).toBe(false)
  })
})
