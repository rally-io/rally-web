import { describe, expect, it } from 'vitest'
import en from '@/i18n/locales/en.json'
import he from '@/i18n/locales/he.json'
import { COURT_SIDES, SLOTS } from '@/lib/partners/reasons'

/**
 * The partner deck's dynamic keys, which literalKeys.test.ts cannot see: `partners.side.${side}`
 * and `partners.slot.${slot}` (lib/partners/reasons, PartnerCard), `partners.status.${status}`
 * (PartnerSearchDrawer), and the plural families, each of which needs every form the locale's
 * plural rules can pick — i18next does not fall back from `_two` to `_other`, it shows the key.
 */
type Bundle = Record<string, unknown>

const STATUSES = ['liked', 'matched', 'passed']
const PLURALS = [
  'partners.reason.playedWith',
  'partners.reason.playedAgainst',
  'partners.reason.mutualPartners',
  'partners.reason.sharedTournaments',
  'partners.matchesCount',
]

const lookup = (bundle: Bundle, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in (node as Bundle)) return (node as Bundle)[part]
    return undefined
  }, bundle)

const DYNAMIC = [
  ...[...COURT_SIDES].map((side) => `partners.side.${side}`),
  ...[...SLOTS].map((slot) => `partners.slot.${slot}`),
  ...STATUSES.map((status) => `partners.status.${status}`),
]

describe.each([
  ['en', en as Bundle],
  ['he', he as Bundle],
])('partners keys in %s.json', (lang, bundle) => {
  it('every side, slot and search status the code can ask for', () => {
    expect(DYNAMIC.filter((key) => typeof lookup(bundle, key) !== 'string')).toEqual([])
  })

  it('every plural form the language can pick', () => {
    const forms = new Intl.PluralRules(lang).resolvedOptions().pluralCategories
    const missing = PLURALS.flatMap((key) => forms.map((form) => `${key}_${form}`)).filter(
      (key) => typeof lookup(bundle, key) !== 'string',
    )
    expect(missing).toEqual([])
  })
})

it('Hebrew has a form for exactly two, so the plural check above is not vacuous', () => {
  expect(new Intl.PluralRules('he').resolvedOptions().pluralCategories).toContain('two')
})
