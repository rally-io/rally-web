import { afterEach, describe, expect, it, vi } from 'vitest'
import { buzz, tick } from './vibrate'

const original = Object.getOwnPropertyDescriptor(navigator, 'vibrate')

function setVibrate(value: unknown) {
  Object.defineProperty(navigator, 'vibrate', { value, configurable: true, writable: true })
}

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'vibrate', original)
  else delete (navigator as { vibrate?: unknown }).vibrate
})

describe('vibrate', () => {
  it('ticks and buzzes where the browser can vibrate', () => {
    const vibrate = vi.fn(() => true)
    setVibrate(vibrate)
    tick()
    buzz()
    expect(vibrate).toHaveBeenNthCalledWith(1, 10)
    expect(vibrate).toHaveBeenNthCalledWith(2, [30, 40, 30])
  })

  it('does nothing where the API is absent (Safari, desktops)', () => {
    setVibrate(undefined)
    expect(() => tick()).not.toThrow()
    expect(() => buzz()).not.toThrow()
  })

  it('swallows a browser that throws', () => {
    setVibrate(() => {
      throw new Error('blocked')
    })
    expect(() => tick()).not.toThrow()
  })
})
