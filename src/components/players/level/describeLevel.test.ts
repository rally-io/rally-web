import { describe, expect, it } from 'vitest'
import { describeLevel, type LevelDescriptor } from './describeLevel'

// spec §12: describeLevel decides every edge case; surfaces only render its output
const cases: Array<[number | null | undefined, boolean | null | undefined, number | null | undefined, LevelDescriptor]> = [
  [null, undefined, null, { state: 'none', value: null, reliability: null }],
  [undefined, true, 90, { state: 'none', value: null, reliability: null }],
  [null, true, 90, { state: 'none', value: null, reliability: null }],
  // older backend: no flag → plain number, and no reliability either
  [3.5, undefined, undefined, { state: 'unknown', value: '3.50', reliability: null }],
  [3.5, undefined, 72, { state: 'unknown', value: '3.50', reliability: null }],
  // An explicit `null` is the server declining to say — NOT a negative statement.
  // This is what a tournament guest looks like on the wire.
  [4.2, null, null, { state: 'unknown', value: '4.20', reliability: null }],
  [4.2, null, 55, { state: 'unknown', value: '4.20', reliability: null }],
  [3.5, false, null, { state: 'unverified', value: '3.50', reliability: null }],
  // fresh slider declaration: 0 % is a real reliability, not "missing"
  [3.5, false, 0, { state: 'unverified', value: '3.50', reliability: 0 }],
  [4, true, 91, { state: 'verified', value: '4.00', reliability: 91 }],
  // hysteresis band: the flag wins, not the threshold
  [4, true, 80, { state: 'verified', value: '4.00', reliability: 80 }],
  [4, true, null, { state: 'verified', value: '4.00', reliability: null }],
  [4, true, 100, { state: 'verified', value: '4.00', reliability: 100 }],
]

describe('describeLevel', () => {
  it.each(cases)('describeLevel(%s, %s, %s)', (level, verified, reliability, expected) => {
    expect(describeLevel(level, verified, reliability)).toEqual(expected)
  })

  it('always prints exactly two decimals, never locale-formatted', () => {
    expect(describeLevel(4.2, false, 10).value).toBe('4.20')
    expect(describeLevel(4.256, false, 10).value).toBe('4.26')
    expect(describeLevel(7, true, 100).value).toBe('7.00')
  })
})
