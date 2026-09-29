import { describe, expect, it } from 'vitest'
import en from '@/i18n/locales/en.json'
import he from '@/i18n/locales/he.json'

/**
 * Every literal translation key in the app resolves in BOTH locale files.
 *
 * rally-web writes `t('k', { defaultValue: 'English' })` in places, and i18next returns that
 * defaultValue silently when `k` is missing — so a Hebrew visitor (the default language) reads
 * English (wiki gotchas/web-i18n-defaultvalue-hides-missing-keys). Nothing else catches it: tsc
 * does not type keys, and src/test-setup.ts forces English for every component test. en.json is
 * checked too, because `fallbackLng` is Hebrew: a key missing there shows English visitors Hebrew.
 *
 * Literal keys only. Dynamic keys (`t(\`level.explainer.${block.key}.body\`)`, `t(b.labelKey)`)
 * need explicit lists next to the code that builds them.
 *
 * Sources come in through `import.meta.glob`, never `fs`: tsconfig's `"types": ["vitest/globals"]`
 * makes a `node:fs` import break `tsc -b` (see leagueRanking's noPhysicalDirection.test.ts).
 */
const SOURCES = import.meta.glob(
  ['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/**/__tests__/**'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

type Bundle = Record<string, unknown>

const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other']
const KEY_PATTERNS = [/\bt\(\s*'([^'\n]+)'/g, /\bt\(\s*"([^"\n]+)"/g, /\bi18nKey=["']([^"'\n]+)["']/g]
const KEY_SHAPE = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$/

function lookup(bundle: Bundle, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in (node as Bundle)) return (node as Bundle)[part]
    return undefined
  }, bundle)
}

function resolves(bundle: Bundle, key: string): boolean {
  if (typeof lookup(bundle, key) === 'string') return true
  return PLURAL_SUFFIXES.some((suffix) => typeof lookup(bundle, `${key}_${suffix}`) === 'string')
}

/** key → the first file that uses it, so a failure names where to look. */
const USED = new Map<string, string>()
for (const [file, source] of Object.entries(SOURCES)) {
  for (const pattern of KEY_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const key = match[1]
      if (KEY_SHAPE.test(key) && !USED.has(key)) USED.set(key, file)
    }
  }
}

const missingFrom = (bundle: Bundle) =>
  [...USED].filter(([key]) => !resolves(bundle, key)).map(([key, file]) => `${key}  (${file})`)

describe('literal i18n keys', () => {
  it('sees the whole app — a scan that finds a handful of keys is blind, not clean', () => {
    // 894 literal keys on rally-web origin/main f554ad05 (2026-09-24).
    expect(USED.size).toBeGreaterThan(800)
    expect(USED.get('edit_profile.skillNote')).toBe('/src/components/profile/SkillLevelSlider.tsx')
  })

  it('can fail: an absent key is reported, a plural family is not', () => {
    expect(resolves(he as Bundle, 'edit_profile.skillNote')).toBe(true)
    expect(resolves(he as Bundle, 'edit_profile.noSuchKey')).toBe(false)
    expect(resolves(he as Bundle, 'league.search.count')).toBe(true)
  })

  it('every literal key exists in he.json', () => {
    expect(missingFrom(he as Bundle)).toEqual([])
  })

  it('every literal key exists in en.json', () => {
    expect(missingFrom(en as Bundle)).toEqual([])
  })
})
