import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import en from '@/i18n/locales/en.json'
import he from '@/i18n/locales/he.json'
import { FALLBACK_LADDERS } from '@/lib/skillLadder'
import { scaleCopyValues } from '@/lib/skillScaleCopy'

/** Every string value in a bundle, with its dotted key. */
function strings(node: unknown, prefix = ''): Array<[string, string]> {
  if (typeof node === 'string') return [[prefix, node]]
  if (node === null || typeof node !== 'object') return []
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
    strings(v, prefix ? `${prefix}.${k}` : k),
  )
}

/** The copy that names the scale. Each must be interpolated from the ladder, in both languages. */
const SCALE_KEYS = ['level_page.intro1', 'level.explainer.level.body']

describe('no translation restates the 1–7 scale', () => {
  it.each([
    ['en', en],
    ['he', he],
  ])('%s.json holds no 7.0 / 7.00 / A1 / A2', (_lng, bundle) => {
    // The scale lives in the served ladder. A literal here is the next "1.0 – 7.0" that ships
    // after the flip.
    const offenders = strings(bundle).filter(([, value]) => /(^|[^\d.])7\.00?(?!\d)|\bA[12]\b/.test(value))
    expect(offenders).toEqual([])
  })

  it.each(['en', 'he'])('%s: the scale sentences follow the ladder they are given', (lng) => {
    const t = i18n.getFixedT(lng)
    for (const key of SCALE_KEYS) {
      const on7 = t(key, { ...scaleCopyValues(FALLBACK_LADDERS[7]) })
      const on5 = t(key, { ...scaleCopyValues(FALLBACK_LADDERS[5]) })
      expect(on7, key).toMatch(/7\.00?/)
      expect(on5, key).toMatch(/5\.00?/)
      expect(on5, key).not.toMatch(/7\.00?/)
      expect(on5, key).not.toContain('{{')
    }
  })
})
