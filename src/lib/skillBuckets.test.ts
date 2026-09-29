import { describe, expect, it } from 'vitest'
import { FALLBACK_LADDERS } from './skillLadder'
import { SKILL_BUCKETS, bucketForLevel, bucketOfBand, bucketRange } from './skillBuckets'

const L7 = FALLBACK_LADDERS[7]
const L5 = FALLBACK_LADDERS[5]

describe('skill buckets are defined by band', () => {
  it('D is Beginner, C + B2 Intermediate, B1 Advanced, A Pro — on both ladders', () => {
    const byCode = (ladder: typeof L7) => Object.fromEntries(ladder.bands.map((b) => [b.code, bucketOfBand(b)]))
    expect(byCode(L7)).toEqual({
      D2: 'beginner', D1: 'beginner', C2: 'intermediate', C1: 'intermediate', B2: 'intermediate',
      B1: 'advanced', A2: 'pro', A1: 'pro',
    })
    expect(byCode(L5)).toEqual({
      D2: 'beginner', D1: 'beginner', C2: 'intermediate', C1: 'intermediate', B2: 'intermediate',
      B1: 'advanced', A: 'pro',
    })
  })

  it('a 4.7 player is Advanced (B1) on the 1–7 ladder and Pro (A) on the 1–5 ladder', () => {
    expect(bucketForLevel(4.7, L7)).toBe('advanced')
    expect(bucketForLevel(4.7, L5)).toBe('pro')
  })

  it('a 4.35 player is Advanced on the 1–5 ladder; the cuts at 2.5 and 4.0 never move', () => {
    expect(bucketForLevel(4.35, L5)).toBe('advanced')
    for (const ladder of [L7, L5]) {
      expect(bucketForLevel(2.49, ladder)).toBe('beginner')
      expect(bucketForLevel(2.5, ladder)).toBe('intermediate')
      expect(bucketForLevel(3.99, ladder)).toBe('intermediate')
      expect(bucketForLevel(4.0, ladder)).toBe('advanced')
    }
  })

  it('Pro starts at A: 5.0 on the 1–7 ladder (it was 5.5), 4.5 on the 1–5 ladder', () => {
    expect(bucketForLevel(5.2, L7)).toBe('pro')
    expect(bucketForLevel(4.99, L7)).toBe('advanced')
    expect(bucketForLevel(4.49, L5)).toBe('advanced')
    expect(bucketForLevel(4.5, L5)).toBe('pro')
  })

  it('spans are read off the ladder', () => {
    expect(bucketRange('advanced', L7)).toEqual({ min: 4, max: 5 })
    expect(bucketRange('pro', L7)).toEqual({ min: 5, max: 7 })
    expect(bucketRange('advanced', L5)).toEqual({ min: 4, max: 4.5 })
    expect(bucketRange('pro', L5)).toEqual({ min: 4.5, max: 5 })
    expect(bucketRange('beginner', L5)).toEqual({ min: 1, max: 2.5 })
    expect(bucketRange('intermediate', L5)).toEqual({ min: 2.5, max: 4 })
  })

  it('lists the four buckets in order, each with its label key', () => {
    expect(SKILL_BUCKETS.map((b) => b.id)).toEqual(['beginner', 'intermediate', 'advanced', 'pro'])
  })
})
