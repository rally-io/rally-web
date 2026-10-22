import { describe, expect, it } from 'vitest'
import {
  FLICK_MIN_DX, SWIPE_FRACTION, SWIPE_VELOCITY, VELOCITY_WINDOW_MS, releaseOutcome, releaseVelocity, swipeOutcome,
} from './swipe'

const W = 400 // a card on the 420 px column
const LINE = W * SWIPE_FRACTION // 112 px

describe('swipeOutcome', () => {
  it.each([
    ['past the line to the right', LINE + 1, 0, 'like'],
    ['past the line to the left', -LINE - 1, 0, 'pass'],
    ['short of the line, slow', LINE - 1, 0, null],
    ['short of the line the other way, slow', -LINE + 1, 0, null],
    ['a fast flick right', FLICK_MIN_DX + 1, SWIPE_VELOCITY + 0.1, 'like'],
    ['a fast flick left', -FLICK_MIN_DX - 1, -SWIPE_VELOCITY - 0.1, 'pass'],
    ['a flick too short to count', FLICK_MIN_DX - 1, SWIPE_VELOCITY + 1, null],
    ['moving right but flicked back left', 40, -SWIPE_VELOCITY - 1, null],
  ])('%s', (_label, dx, vx, expected) => {
    expect(swipeOutcome(dx, vx, W)).toBe(expected)
  })
})

describe('releaseOutcome', () => {
  it('counts a release for the card grabbed at the start', () => {
    expect(releaseOutcome('a', 'a', LINE + 1, 0, W)).toBe('like')
  })

  it('gives no outcome when the top card changed mid-drag', () => {
    expect(releaseOutcome('a', 'b', LINE + 1, 0, W)).toBeNull()
  })

  it('gives no outcome without a grab', () => {
    expect(releaseOutcome(null, 'a', LINE + 1, 0, W)).toBeNull()
  })
})

describe('releaseVelocity', () => {
  it('is px per ms over the last stretch of the drag', () => {
    expect(releaseVelocity([{ x: 0, t: 0 }, { x: 40, t: 20 }, { x: 80, t: 40 }])).toBe(2)
  })

  it('ignores samples older than the window, so a slow drag that ends in a flick is a flick', () => {
    const slow = [{ x: 0, t: 0 }, { x: 10, t: 500 }]
    const flick = [{ x: 10, t: 510 }, { x: 60, t: 540 }]
    expect(releaseVelocity([...slow, ...flick])).toBeCloseTo(50 / 40)
  })

  it('a pause before letting go is no speed', () => {
    expect(releaseVelocity([{ x: 0, t: 0 }, { x: 80, t: 40 }, { x: 80, t: 40 + VELOCITY_WINDOW_MS + 1 }])).toBe(0)
  })

  it('too short a span (or nothing) is no speed', () => {
    expect(releaseVelocity([{ x: 0, t: 0 }, { x: 30, t: 2 }])).toBe(0)
    expect(releaseVelocity([])).toBe(0)
  })
})
