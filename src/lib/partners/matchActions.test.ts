import { describe, expect, it } from 'vitest'
import { buildWhatsAppLink, registerStateOf } from './matchActions'
import { makeMatch } from './testCards'

describe('registerStateOf', () => {
  it.each([
    [true, false, 'register'],
    [true, true, 'register'],
    [false, true, 'already'],
    [false, false, 'none'],
  ])('can_register_together=%s registered_together=%s → %s', (can, registered, expected) => {
    expect(registerStateOf(makeMatch({ can_register_together: can, registered_together: registered }))).toBe(expected)
  })
})

describe('buildWhatsAppLink', () => {
  it('appends the localized opening line, URL-encoded (the API sends the bare link)', () => {
    expect(buildWhatsAppLink('https://wa.me/972501234567', 'Hi! Summer Cup & more?')).toBe(
      'https://wa.me/972501234567?text=Hi!%20Summer%20Cup%20%26%20more%3F',
    )
  })
})
