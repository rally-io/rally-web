import { describe, it, expect } from 'vitest'
import {
  parseTournamentFilters,
  writeTournamentFilters,
  toServerParams,
  matchesFilters,
  hasClientFilters,
  activeFilterCount,
  monthOptionsFrom,
  EMPTY_FILTERS,
  SKILL_BUCKETS,
} from './tournamentFilters'
import type { Tournament } from '@/types/api'

const CLUB_A = '11111111-1111-1111-1111-111111111111'
const CLUB_B = '22222222-2222-2222-2222-222222222222'

const parse = (query: string) => parseTournamentFilters(new URLSearchParams(query))

function tournament(over: Partial<Tournament> = {}): Tournament {
  return {
    id: 't1',
    name: 'Test',
    format: 'doubles',
    start_date: '2026-07-04T09:00:00',
    end_date: '2026-07-04T18:00:00',
    registration_deadline: '2026-07-01T00:00:00',
    skill_level_min: 3.0,
    skill_level_max: 3.5,
    skill_level: '3.0 - 3.5 (C1)',
    entry_fee: 400,
    image_url: null,
    thumb_url: null,
    structure: 'groups',
    club_name: 'Padel Time',
    registration_id: null,
    registration_status: null,
    available_seats: 4,
    ...over,
  } as Tournament
}

describe('parseTournamentFilters', () => {
  it('reads nothing out of a bare URL', () => {
    expect(parse('')).toEqual(EMPTY_FILTERS)
  })

  it('parses every dimension', () => {
    const f = parse(`clubs=${CLUB_A}&organizers=dana-cohen&skill=advanced&month=2026-07`)
    expect(f).toEqual({
      clubIds: [CLUB_A],
      organizerSlugs: ['dana-cohen'],
      skills: ['advanced'],
      months: ['2026-07'],
    })
  })

  it('drops values that fail their guard instead of forwarding them', () => {
    const f = parse('clubs=not-a-uuid&organizers=has%20space&skill=grandmaster&month=2026-13')
    expect(f).toEqual(EMPTY_FILTERS)
  })

  it('keeps the valid half of a mixed list', () => {
    expect(parse(`clubs=${CLUB_A},nope`).clubIds).toEqual([CLUB_A])
    expect(parse('month=2026-07,2026-99').months).toEqual(['2026-07'])
  })

  it('de-duplicates and sorts so the query key is stable', () => {
    expect(parse(`clubs=${CLUB_B},${CLUB_A},${CLUB_B}`).clubIds).toEqual([CLUB_A, CLUB_B])
  })
})

describe('writeTournamentFilters', () => {
  it('deletes the param when a dimension empties out — a bare URL is the default', () => {
    const out = writeTournamentFilters(new URLSearchParams('clubs=' + CLUB_A + '&tab=history'), {
      ...EMPTY_FILTERS,
    })
    expect(out.get('clubs')).toBeNull()
    expect(out.get('tab')).toBe('history') // unrelated params survive
  })

  it('round-trips through the URL', () => {
    const filters = {
      clubIds: [CLUB_A],
      organizerSlugs: ['dana-cohen'],
      skills: ['pro' as const],
      months: ['2026-07'],
    }
    const out = writeTournamentFilters(new URLSearchParams(), filters)
    expect(parseTournamentFilters(out)).toEqual(filters)
  })
})

describe('toServerParams', () => {
  it('sends only the dimensions the API can filter on', () => {
    const params = toServerParams({
      clubIds: [CLUB_A],
      organizerSlugs: ['dana-cohen'],
      skills: ['advanced'],
      months: ['2026-07'],
    })
    expect(params).toEqual({ club_ids: [CLUB_A], manager_slugs: ['dana-cohen'] })
  })

  it('omits empty dimensions entirely', () => {
    expect(toServerParams(EMPTY_FILTERS)).toEqual({})
  })
})

describe('matchesFilters', () => {
  it('passes everything when no client filter is set', () => {
    expect(matchesFilters(tournament(), EMPTY_FILTERS)).toBe(true)
    expect(hasClientFilters(EMPTY_FILTERS)).toBe(false)
  })

  it('ignores the server-side dimensions — they are already applied by the API', () => {
    expect(matchesFilters(tournament(), { ...EMPTY_FILTERS, clubIds: [CLUB_B] })).toBe(true)
    expect(hasClientFilters({ ...EMPTY_FILTERS, clubIds: [CLUB_B] })).toBe(false)
  })

  it('matches a skill bucket that the tournament range overlaps', () => {
    const tr = tournament({ skill_level_min: 3.0, skill_level_max: 3.5 })
    expect(matchesFilters(tr, { ...EMPTY_FILTERS, skills: ['intermediate'] })).toBe(true)
    expect(matchesFilters(tr, { ...EMPTY_FILTERS, skills: ['pro'] })).toBe(false)
  })

  it('does not count a range that only touches a bucket endpoint', () => {
    const tr = tournament({ skill_level_min: 2.5, skill_level_max: 4.0 })
    expect(matchesFilters(tr, { ...EMPTY_FILTERS, skills: ['beginner'] })).toBe(false)
    expect(matchesFilters(tr, { ...EMPTY_FILTERS, skills: ['advanced'] })).toBe(false)
    expect(matchesFilters(tr, { ...EMPTY_FILTERS, skills: ['intermediate'] })).toBe(true)
  })

  it('places a single-level tournament in exactly one bucket', () => {
    const tr = tournament({ skill_level_min: 4.0, skill_level_max: 4.0 })
    expect(matchesFilters(tr, { ...EMPTY_FILTERS, skills: ['intermediate'] })).toBe(false)
    expect(matchesFilters(tr, { ...EMPTY_FILTERS, skills: ['advanced'] })).toBe(true)
  })

  it('keeps an open-to-all tournament in every skill bucket', () => {
    const tr = tournament({ skill_level_min: 0, skill_level_max: 0 })
    for (const b of SKILL_BUCKETS) {
      expect(matchesFilters(tr, { ...EMPTY_FILTERS, skills: [b.id] })).toBe(true)
    }
  })

  it('ORs within a dimension and ANDs across dimensions', () => {
    const tr = tournament({ start_date: '2026-07-04T09:00:00' })
    expect(matchesFilters(tr, { ...EMPTY_FILTERS, skills: ['pro', 'intermediate'] })).toBe(true)
    expect(
      matchesFilters(tr, { ...EMPTY_FILTERS, skills: ['intermediate'], months: ['2026-08'] }),
    ).toBe(false)
  })

  it('matches the month of the start date', () => {
    const tr = tournament({ start_date: '2026-07-04T09:00:00' })
    expect(matchesFilters(tr, { ...EMPTY_FILTERS, months: ['2026-07'] })).toBe(true)
    expect(matchesFilters(tr, { ...EMPTY_FILTERS, months: ['2026-06'] })).toBe(false)
  })

  it('drops an item whose start date cannot be read rather than showing it under a month', () => {
    const tr = tournament({ start_date: 'not a date' })
    expect(matchesFilters(tr, { ...EMPTY_FILTERS, months: ['2026-07'] })).toBe(false)
  })
})

describe('monthOptionsFrom', () => {
  it('lists each month once, newest first for a history view', () => {
    const items = [
      tournament({ id: 'a', start_date: '2026-07-04T09:00:00' }),
      tournament({ id: 'b', start_date: '2026-06-04T09:00:00' }),
      tournament({ id: 'c', start_date: '2026-07-20T09:00:00' }),
    ]
    const opts = monthOptionsFrom(items, 'desc', 'en-US')
    expect(opts.map((o) => o.value)).toEqual(['2026-07', '2026-06'])
    expect(opts[0].label).toMatch(/July/)
  })

  it('skips unparseable dates', () => {
    expect(monthOptionsFrom([tournament({ start_date: '' })], 'asc', 'en-US')).toEqual([])
  })
})

describe('activeFilterCount', () => {
  it('counts every selected value across dimensions', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
    expect(
      activeFilterCount({
        clubIds: [CLUB_A, CLUB_B],
        organizerSlugs: ['dana-cohen'],
        skills: ['pro'],
        months: [],
      }),
    ).toBe(4)
  })
})
