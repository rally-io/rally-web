import { describe, expect, it } from 'vitest'
import { FALLBACK_LADDERS } from './skillLadder'
import { scaleCopyValues } from './skillScaleCopy'

const LRI = '⁦'
const PDI = '⁩'

describe('scaleCopyValues', () => {
  it('reads 1.0 and 7.0 off the 1–7 ladder', () => {
    expect(scaleCopyValues(FALLBACK_LADDERS[7])).toEqual({
      min: `${LRI}1.0${PDI}`,
      max: `${LRI}7.0${PDI}`,
      minPrecise: `${LRI}1.00${PDI}`,
      maxPrecise: `${LRI}7.00${PDI}`,
    })
  })

  it('reads 1.0 and 5.0 off the 1–5 ladder', () => {
    expect(scaleCopyValues(FALLBACK_LADDERS[5])).toEqual({
      min: `${LRI}1.0${PDI}`,
      max: `${LRI}5.0${PDI}`,
      minPrecise: `${LRI}1.00${PDI}`,
      maxPrecise: `${LRI}5.00${PDI}`,
    })
  })

  it('every value is one LTR-isolated token, so Hebrew copy cannot reorder it', () => {
    for (const token of Object.values(scaleCopyValues(FALLBACK_LADDERS[5]))) {
      expect(token.startsWith(LRI) && token.endsWith(PDI)).toBe(true)
      expect(token.split(LRI)).toHaveLength(2)
    }
  })
})
