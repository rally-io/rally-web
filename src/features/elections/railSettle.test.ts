import { describe, expect, it } from 'vitest'
import { keepsSettle, settleAt } from './railSettle'

describe('settleAt', () => {
  it('settles on the nearer club', () => {
    expect(settleAt(4.3)).toEqual({ to: 4, from: 4.3 })
    expect(settleAt(4.6)).toEqual({ to: 5, from: 4.6 })
  })

  it('does nothing when a club is already open', () => {
    expect(settleAt(4)).toBeNull()
    expect(settleAt(0)).toBeNull()
  })
})

describe('keepsSettle', () => {
  const s = { to: 5, from: 4.6 }

  it('stays while the scroll heads towards the settled club', () => {
    expect(keepsSettle(s, 4.6)).toBe(true)
    expect(keepsSettle(s, 4.8)).toBe(true)
    expect(keepsSettle(s, 4.99)).toBe(true)
  })

  it('lets go once the scroll reaches or passes the settled club', () => {
    expect(keepsSettle(s, 5)).toBe(false)
    expect(keepsSettle(s, 5.2)).toBe(false)
  })

  it('lets go once the scroll heads back the other way', () => {
    expect(keepsSettle(s, 4.5)).toBe(false)
    expect(keepsSettle(s, 4.1)).toBe(false)
  })

  it('stays through a few px of drift', () => {
    expect(keepsSettle(s, 4.58)).toBe(true)
  })

  it('works settling back to the club before', () => {
    const back = { to: 4, from: 4.3 }
    expect(keepsSettle(back, 4.1)).toBe(true)
    expect(keepsSettle(back, 3.9)).toBe(false)
    expect(keepsSettle(back, 4.5)).toBe(false)
  })
})
