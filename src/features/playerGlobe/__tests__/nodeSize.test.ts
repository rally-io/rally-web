import { describe, expect, it } from 'vitest'
import { NODE_BASE, NODE_REFERENCE_COUNT, NODE_SIZE_FACTOR_MAX, NODE_SIZE_FACTOR_MIN } from '../constants'
import { nodeRadius, nodeScale, nodeSizeFactor, spriteScale } from '../lib/nodeSize'

describe('nodeSizeFactor', () => {
  it('is 1 at the reference population', () => {
    expect(nodeSizeFactor(NODE_REFERENCE_COUNT)).toBeCloseTo(1, 9)
  })

  it('grows for a small ball and shrinks for a crowded one, preserving covered area', () => {
    expect(nodeSizeFactor(NODE_REFERENCE_COUNT / 4)).toBeCloseTo(Math.min(2, NODE_SIZE_FACTOR_MAX), 9)
    expect(nodeSizeFactor(NODE_REFERENCE_COUNT * 4)).toBeCloseTo(Math.max(0.5, NODE_SIZE_FACTOR_MIN), 9)
    expect(nodeSizeFactor(60)).toBeGreaterThan(1)
    expect(nodeSizeFactor(240)).toBeLessThan(1)
  })

  it('is clamped at both ends and safe for an empty ball', () => {
    expect(nodeSizeFactor(1)).toBe(NODE_SIZE_FACTOR_MAX)
    expect(nodeSizeFactor(0)).toBe(NODE_SIZE_FACTOR_MAX)
    expect(nodeSizeFactor(100000)).toBe(NODE_SIZE_FACTOR_MIN)
  })
})

describe('node sizes take the population factor', () => {
  const lone = { connections: 0 }
  it('scales portrait, radius and sprite together', () => {
    expect(nodeScale(lone)).toBeCloseTo(NODE_BASE, 9)
    expect(nodeScale(lone, 2)).toBeCloseTo(NODE_BASE * 2, 9)
    expect(nodeRadius(lone, 2)).toBeCloseTo(NODE_BASE, 9)
    expect(spriteScale(lone, 2) / spriteScale(lone)).toBeCloseTo(2, 9)
  })
})
