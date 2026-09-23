import { describe, expect, it } from 'vitest'
import { ltrIsolate } from './bidi'

describe('ltrIsolate', () => {
  it('wraps the token in LRI … PDI so it survives inside a Hebrew sentence', () => {
    expect(ltrIsolate('72%')).toBe('⁦72%⁩')
    expect(ltrIsolate('4.25')).toBe('⁦4.25⁩')
  })
})
