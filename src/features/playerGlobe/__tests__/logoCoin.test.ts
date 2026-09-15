import { describe, expect, it } from 'vitest'
import { LOGO_SPOTS } from '../constants'
import { chamfer, spotFrame } from '../lib/logoCoin'
import { mulberry32, valueNoise } from '../lib/random'

const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const len = (a: number[]) => Math.hypot(a[0], a[1], a[2])

describe('spotFrame', () => {
  it.each(LOGO_SPOTS.map((s) => [s[0], s[1]] as const))('is an orthonormal frame at (%d, %d)', (az, el) => {
    const { c, up, right } = spotFrame([az, el])
    expect(len(c)).toBeCloseTo(1, 9)
    expect(len(up)).toBeCloseTo(1, 9)
    expect(len(right)).toBeCloseTo(1, 9)
    expect(dot(up, c)).toBeCloseTo(0, 9)
    expect(dot(right, c)).toBeCloseTo(0, 9)
    expect(dot(right, up)).toBeCloseTo(0, 9)
  })

  it('faces the print outward: right x up points along the centre direction', () => {
    const { c, up, right } = spotFrame([135, 18])
    const outward = [
      right[1] * up[2] - right[2] * up[1],
      right[2] * up[0] - right[0] * up[2],
      right[0] * up[1] - right[1] * up[0],
    ]
    expect(dot(outward, c)).toBeCloseTo(1, 9)
  })
})

describe('chamfer', () => {
  it('measures 3 per orthogonal step and 4 per diagonal from the seed', () => {
    const S = 5
    const centre = 2 * S + 2
    const d = chamfer(S, (i) => i === centre)
    expect(d[centre]).toBe(0)
    expect(d[centre + 1]).toBe(3)
    expect(d[centre - S]).toBe(3)
    expect(d[centre - S - 1]).toBe(4)
    expect(d[centre + S + 1]).toBe(4)
    expect(d[0]).toBe(8) // two diagonal steps
  })
})

describe('random', () => {
  it('mulberry32 is deterministic for a seed', () => {
    const a = mulberry32(20260902)
    const b = mulberry32(20260902)
    for (let i = 0; i < 20; i++) expect(a()).toBe(b())
  })

  it('valueNoise stays within [0, 1]', () => {
    const noise = valueNoise(64, 32, [{ cell: 16, weight: 0.6 }, { cell: 4, weight: 0.4 }], mulberry32(3))
    expect(noise).toHaveLength(64 * 32)
    for (const v of noise) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
