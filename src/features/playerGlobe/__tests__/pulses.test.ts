import { describe, expect, it } from 'vitest'
import { PULSE_GAIN } from '../constants'
import { mulberry32 } from '../lib/random'
import { makePicker, makeSlots, pulseGain } from '../lib/pulses'

describe('makePicker', () => {
  it('returns null when there is nothing to pick from', () => {
    expect(makePicker([], [])).toBeNull()
  })

  it('only ever returns one of its indices', () => {
    const pick = makePicker([4, 9, 21], [1, 2, 3], mulberry32(1))
    expect(pick).not.toBeNull()
    for (let i = 0; i < 500; i++) expect([4, 9, 21]).toContain(pick!())
  })

  it('never picks a zero-weight edge and favours the heavy one', () => {
    const pick = makePicker([0, 1, 2], [0, 1, 9], mulberry32(7))!
    const counts = [0, 0, 0]
    for (let i = 0; i < 2000; i++) counts[pick()] += 1
    expect(counts[0]).toBe(0)
    expect(counts[2]).toBeGreaterThan(counts[1] * 4)
  })
})

describe('pulseGain', () => {
  it('rises with games and caps at PULSE_GAIN', () => {
    expect(pulseGain(1)).toBeLessThan(pulseGain(20))
    expect(pulseGain(34)).toBeCloseTo(PULSE_GAIN, 9)
    expect(pulseGain(500)).toBeCloseTo(PULSE_GAIN, 9)
    expect(pulseGain(0)).toBeCloseTo(PULSE_GAIN * 0.7, 9)
  })
})

describe('makeSlots', () => {
  it('starts every slot idle and staggered from the first frame', () => {
    const slots = makeSlots(3)
    expect(slots).toHaveLength(3)
    for (const s of slots) {
      expect(s.li).toBe(-1)
      expect(s.at).toBeLessThan(0)
    }
  })
})
