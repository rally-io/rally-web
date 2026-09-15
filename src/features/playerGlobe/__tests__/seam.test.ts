import { describe, expect, it } from 'vitest'
import { seamPoints } from '../lib/seam'

describe('seamPoints', () => {
  it('lies exactly on the unit sphere (a + b = 1 keeps the curve on the ball)', () => {
    const pts = seamPoints(720)
    for (const [x, y, z] of pts) {
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9)
    }
  })

  it('is one closed curve', () => {
    const pts = seamPoints(720)
    const [first, last] = [pts[0], pts[pts.length - 1]]
    expect(first[0]).toBeCloseTo(last[0], 9)
    expect(first[1]).toBeCloseTo(last[1], 9)
    expect(first[2]).toBeCloseTo(last[2], 9)
    expect(pts).toHaveLength(721)
  })

  it('is tilted off the poles, so the auto-rotation shows it sweeping', () => {
    // the untilted curve's extreme y is 2*sqrt(ab); after the tilt nothing sits on the pole
    const maxY = Math.max(...seamPoints(720).map((p) => Math.abs(p[1])))
    expect(maxY).toBeLessThan(1)
  })
})
