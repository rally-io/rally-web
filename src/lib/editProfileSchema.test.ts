import { describe, expect, it } from 'vitest'
import { buildEditProfileSchema } from './editProfileSchema'
import { typedBounds } from './skillLevel'
import { FALLBACK_LADDERS } from './skillLadder'

describe('buildEditProfileSchema', () => {
  const on7 = buildEditProfileSchema(typedBounds(FALLBACK_LADDERS[7]))
  const on5 = buildEditProfileSchema(typedBounds(FALLBACK_LADDERS[5]))

  it('accepts up to typed_max on the 1–7 ladder', () => {
    expect(on7.safeParse({ skill_level: 7 }).success).toBe(true)
    expect(on7.safeParse({ skill_level: 6.5 }).success).toBe(true)
    expect(on7.safeParse({ skill_level: 7.01 }).success).toBe(false)
  })

  it('refuses anything above 5.0 on the 1–5 ladder, as the API would', () => {
    expect(on5.safeParse({ skill_level: 5 }).success).toBe(true)
    expect(on5.safeParse({ skill_level: 5.01 }).success).toBe(false)
    expect(on5.safeParse({ skill_level: 6.5 }).success).toBe(false)
  })

  it('keeps "not chosen" valid and a sub-scale number invalid', () => {
    expect(on5.safeParse({ skill_level: null }).success).toBe(true)
    expect(on5.safeParse({}).success).toBe(true)
    expect(on5.safeParse({ skill_level: 0.5 }).success).toBe(false)
  })
})
