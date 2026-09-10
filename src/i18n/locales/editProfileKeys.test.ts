import { describe, it, expect } from 'vitest'
import he from './he.json'
import en from './en.json'

/**
 * The onboarding details step's Global Constraint is "the copy is exactly the
 * spec's table", and the step is now on the critical path for every sign-up — a
 * key that lands in one locale only would ship a raw `edit_profile.x` string to
 * whichever half of the users reads the other language.
 */
function flat(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [prefix]
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flat(v, prefix ? `${prefix}.${k}` : k),
  )
}

const heEdit = (he as Record<string, unknown>).edit_profile
const enEdit = (en as Record<string, unknown>).edit_profile

describe('edit_profile copy parity', () => {
  it('he and en carry the same edit_profile.* keys', () => {
    expect(new Set(flat(heEdit))).toEqual(new Set(flat(enEdit)))
  })

  it('every edit_profile.* value is a non-empty string in both locales', () => {
    for (const [locale, tree] of [['he', heEdit], ['en', enEdit]] as const) {
      const flatKeys = flat(tree)
      for (const key of flatKeys) {
        const value = key.split('.').reduce<unknown>(
          (acc, part) => (acc as Record<string, unknown>)?.[part],
          tree,
        )
        expect(typeof value, `${locale} edit_profile.${key}`).toBe('string')
        expect((value as string).trim(), `${locale} edit_profile.${key}`).not.toBe('')
      }
    }
  })

  it('carries the keys the details step reads at runtime', () => {
    const REQUIRED = [
      'onboardingTitle', 'onboardingSubtitle', 'requiredNote', 'continue', 'continueTournament',
      'registrationTitle', 'registrationSubtitle', 'registrationRequirements',
      'skillEmpty', 'skillNote', 'notYou', 'missingNotice', 'stillMissing',
      'missing.name', 'missing.phone', 'missing.level',
      'validation.skillRequired', 'validation.otpSendFailed', 'validation.otpInvalid',
      'validation.phoneNotVerified', 'savedRefreshFailed',
    ]
    for (const key of REQUIRED) {
      for (const [locale, tree] of [['he', heEdit], ['en', enEdit]] as const) {
        const value = key.split('.').reduce<unknown>(
          (acc, part) => (acc as Record<string, unknown>)?.[part],
          tree,
        )
        expect(value, `${locale} edit_profile.${key}`).toBeTruthy()
      }
    }
  })

  it('the interpolated copy keeps its {{fields}} placeholder in both locales', () => {
    for (const tree of [heEdit, enEdit] as Record<string, string>[]) {
      expect(tree.missingNotice).toContain('{{fields}}')
      expect(tree.stillMissing).toContain('{{fields}}')
    }
  })

  it('confirmSkill is gone from both locales', () => {
    expect((heEdit as Record<string, unknown>).confirmSkill).toBeUndefined()
    expect((enEdit as Record<string, unknown>).confirmSkill).toBeUndefined()
  })
})
