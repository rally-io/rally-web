import { describe, expect, it } from 'vitest'
import fallback7Body from './skillBands.fallback7.json'
import fallback5Body from './skillBands.fallback5.json'
import { FALLBACK_LADDERS, bandForLevel, parseSkillBands, selectLadder } from './skillLadder'

const L7 = FALLBACK_LADDERS[7]
const L5 = FALLBACK_LADDERS[5]

/** A deep copy of a contract body that a test may break. */
const copy = <T,>(body: T): T => JSON.parse(JSON.stringify(body)) as T

describe('the bundled fallback ladders', () => {
  it('1–7 is the API step-0 ladder: eight codes, A2 and A1 on top', () => {
    expect(L7).toMatchObject({ level_scale: 7, scale_min: 1, scale_max: 7, typed_max: 7 })
    expect(L7.bands.map((b) => b.code)).toEqual(['D2', 'D1', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1'])
    expect(L7.bands.find((b) => b.code === 'B1')).toMatchObject({ min: 4, max: 5 })
  })

  it('1–5 is the post-flip ladder: seven codes, B1 halved, A2 + A1 merged into A', () => {
    expect(L5).toMatchObject({ level_scale: 5, scale_min: 1, scale_max: 5, typed_max: 5 })
    expect(L5.bands.map((b) => b.code)).toEqual(['D2', 'D1', 'C2', 'C1', 'B2', 'B1', 'A'])
    expect(L5.bands.find((b) => b.code === 'B1')).toMatchObject({ min: 4, max: 4.5, label: '4.0 - 4.5 (B1)' })
    expect(L5.bands.find((b) => b.code === 'A')).toMatchObject({ letter: 'A', min: 4.5, max: 5, label: '4.5 - 5.0 (A)' })
  })

  it('the two ladders agree on every band up to 4.0', () => {
    expect(L5.bands.slice(0, 5)).toEqual(L7.bands.slice(0, 5))
  })
})

describe('parseSkillBands', () => {
  it('rejects a gap between two bands', () => {
    const body = copy(fallback5Body)
    body.data.bands[0].max = 1.5
    expect(() => parseSkillBands(body)).toThrow()
  })

  it('rejects a letter that is not the first character of the code', () => {
    const body = copy(fallback7Body)
    body.data.bands[7].letter = 'B'
    expect(() => parseSkillBands(body)).toThrow()
  })

  it('rejects a typed_max above the scale', () => {
    const body = copy(fallback5Body)
    body.data.typed_max = 7
    expect(() => parseSkillBands(body)).toThrow()
  })

  it('rejects what a missing endpoint or a failure looks like', () => {
    expect(() => parseSkillBands({ detail: 'Not Found' })).toThrow()
    expect(() => parseSkillBands({ success: false, error: { code: 'X', message: 'x' } })).toThrow()
    expect(() => parseSkillBands('<!doctype html>')).toThrow()
    expect(() => parseSkillBands({ success: true, data: { ...copy(fallback5Body).data, bands: [] } })).toThrow()
  })
})

// Contract §3 (revised 2026-09-26). Rule 2 — a ladder cached across sessions — does not apply:
// the web keeps the served ladder in memory for the session only.
describe('selectLadder (contract §3)', () => {
  it('1. the ladder fetched this session wins, whatever the profile says', () => {
    expect(selectLadder(L5, 7)).toBe(L5)
    expect(selectLadder(L7, 5)).toBe(L7)
    expect(selectLadder(L5, null)).toBe(L5)
  })

  it('3. without it, the bundled ladder matching the viewer\'s most recent level_scale', () => {
    expect(selectLadder(null, 5)).toBe(L5)
    expect(selectLadder(undefined, 7)).toBe(L7)
  })

  it('4. otherwise the 1–7 ladder', () => {
    expect(selectLadder(null, null)).toBe(L7)
    expect(selectLadder(undefined, undefined)).toBe(L7)
    expect(selectLadder(null, 6)).toBe(L7)
  })
})

describe('bandForLevel', () => {
  it('4.7 is B1 on the 1–7 ladder and A on the 1–5 ladder; 4.35 is B1 on the 1–5 ladder', () => {
    expect(bandForLevel(4.7, L7).code).toBe('B1')
    expect(bandForLevel(4.7, L5).code).toBe('A')
    expect(bandForLevel(4.35, L5).code).toBe('B1')
  })

  it('is half-open, and the top band takes scale_max', () => {
    expect(bandForLevel(3.99, L5).code).toBe('B2')
    expect(bandForLevel(4.0, L5).code).toBe('B1')
    expect(bandForLevel(4.49, L5).code).toBe('B1')
    expect(bandForLevel(4.5, L5).code).toBe('A')
    expect(bandForLevel(5.0, L5).code).toBe('A')
    expect(bandForLevel(4.99, L7).code).toBe('B1')
    expect(bandForLevel(5.0, L7).code).toBe('A2')
    expect(bandForLevel(7.0, L7).code).toBe('A1')
  })

  it('clamps out-of-scale values to the end bands', () => {
    expect(bandForLevel(0, L5).code).toBe('D2')
    expect(bandForLevel(6.0, L5).code).toBe('A')
    expect(bandForLevel(9, L7).code).toBe('A1')
  })

  it('maps every band floor to its own band, on both ladders', () => {
    for (const ladder of [L7, L5]) {
      for (const band of ladder.bands) expect(bandForLevel(band.min, ladder)).toBe(band)
    }
  })
})
