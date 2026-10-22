import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  hasSeenSwipeHint, hasSeenWhatsAppNote, markSwipeHintSeen, markWhatsAppNoteSeen, recallPoolId, rememberPoolId,
} from './storage'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('partner storage', () => {
  it('remembers a pool id per tournament', () => {
    expect(recallPoolId('t-1')).toBeNull()
    rememberPoolId('t-1', 'pool-1')
    rememberPoolId('t-2', 'pool-2')
    expect(recallPoolId('t-1')).toBe('pool-1')
    expect(recallPoolId('t-2')).toBe('pool-2')
    expect(localStorage.getItem('rally:partners:pool:t-1')).toBe('pool-1')
  })

  it('remembers the WhatsApp note and the swipe hint separately', () => {
    expect(hasSeenWhatsAppNote()).toBe(false)
    expect(hasSeenSwipeHint()).toBe(false)
    markWhatsAppNoteSeen()
    expect(hasSeenWhatsAppNote()).toBe(true)
    expect(hasSeenSwipeHint()).toBe(false)
    markSwipeHintSeen()
    expect(hasSeenSwipeHint()).toBe(true)
  })

  it('never throws when storage is blocked: reads are "don\'t know", writes are dropped', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => rememberPoolId('t-1', 'pool-1')).not.toThrow()
    expect(() => markWhatsAppNoteSeen()).not.toThrow()
    expect(() => markSwipeHintSeen()).not.toThrow()
    expect(recallPoolId('t-1')).toBeNull()
    expect(hasSeenWhatsAppNote()).toBe(false)
    expect(hasSeenSwipeHint()).toBe(false)
  })
})
