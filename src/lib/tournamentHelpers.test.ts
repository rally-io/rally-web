import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  isRegistrationOpen, isTournamentLive, liveResultsPath, parseSkillLevel,
  formatTournamentSkillRange,
  getSkillLevelName, formatTournamentDateRange, formatCurrency,
  registrationSummaryKey,
  registrationSummary,
  isLastSpots,
  orderLiveFirstKeepingPromoted,
  orderLiveFirst,
} from './tournamentHelpers'

/** ISO-ish local timestamp `offsetHours` from now, in the API's format. */
function hoursFromNow(offsetHours: number): string {
  const d = new Date(Date.now() + offsetHours * 3_600_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

describe('isTournamentLive', () => {
  it('live while now sits inside the date window', () => {
    expect(isTournamentLive({
      start_date: hoursFromNow(-2), end_date: hoursFromNow(2),
    })).toBe(true)
  })
  it('not live before it starts or after it ends', () => {
    expect(isTournamentLive({
      start_date: hoursFromNow(2), end_date: hoursFromNow(4),
    })).toBe(false)
    expect(isTournamentLive({
      start_date: hoursFromNow(-4), end_date: hoursFromNow(-2),
    })).toBe(false)
  })
  it('in_progress alone does not make it live — a bracket can be published early', () => {
    expect(isTournamentLive({
      start_date: hoursFromNow(2), end_date: hoursFromNow(4),
      status: 'in_progress',
    })).toBe(false)
    // …and a tournament left on in_progress forever stops being live on time.
    expect(isTournamentLive({
      start_date: hoursFromNow(-30), end_date: hoursFromNow(-25),
      status: 'in_progress',
    })).toBe(false)
  })

  it('is live when in_progress and inside the window', () => {
    expect(isTournamentLive({
      start_date: hoursFromNow(-1), end_date: hoursFromNow(3),
      status: 'in_progress',
    })).toBe(true)
  })
  it('completed or cancelled is never live, whatever the dates say', () => {
    for (const status of ['completed', 'cancelled', 'rejected']) {
      expect(isTournamentLive({
        start_date: hoursFromNow(-2), end_date: hoursFromNow(2), status,
      })).toBe(false)
    }
  })
  it('falls back to the window when status is absent (older API)', () => {
    expect(isTournamentLive({
      start_date: hoursFromNow(-1), end_date: hoursFromNow(1),
      status: undefined,
    })).toBe(true)
  })
  it('is not live on unparseable dates', () => {
    expect(isTournamentLive({ start_date: '', end_date: '' })).toBe(false)
  })
})

describe('liveResultsPath', () => {
  it('matches the CRM share-link shape', () => {
    expect(liveResultsPath('abc123')).toBe('/live/abc123')
  })
})

describe('isRegistrationOpen', () => {
  it('treats empty/invalid as open', () => {
    expect(isRegistrationOpen('')).toBe(true)
    expect(isRegistrationOpen('not-a-date')).toBe(true)
  })
  it('open when deadline in the future', () => {
    expect(isRegistrationOpen('2999-01-01')).toBe(true)
  })
  it('closed when deadline in the past', () => {
    expect(isRegistrationOpen('2000-01-01')).toBe(false)
  })
})

describe('parseSkillLevel', () => {
  it('splits range and level', () => {
    expect(parseSkillLevel('2.5 - 3.8 (C2)')).toEqual({ range: '2.5 - 3.8', level: 'C2' })
  })
  it('range only', () => {
    expect(parseSkillLevel('2.5 - 3.8')).toEqual({ range: '2.5 - 3.8', level: null })
  })
  it('level only', () => {
    expect(parseSkillLevel('C2')).toEqual({ range: null, level: 'C2' })
  })
  it('null input', () => {
    expect(parseSkillLevel(null)).toEqual({ range: null, level: null })
  })
})

describe('formatTournamentSkillRange', () => {
  it('single value when equal', () => {
    expect(formatTournamentSkillRange(3, 3)).toBe('3.0')
  })
  it('max - min order with LTR marks when different', () => {
    expect(formatTournamentSkillRange(2.5, 3.8)).toBe('‎3.8 - 2.5‎')
  })
})

describe('getSkillLevelName', () => {
  it('all levels when no bounds', () => {
    expect(getSkillLevelName(0, 0)).toBe('All Levels')
  })
  it('buckets by average', () => {
    // Without a `t` the helper returns the i18n key — assert the bucketing.
    expect(getSkillLevelName(1, 2)).toBe('tournament.skillLevelBeginner')
    expect(getSkillLevelName(3, 3.5)).toBe('tournament.skillLevelIntermediate')
    expect(getSkillLevelName(4, 5)).toBe('tournament.skillLevelAdvanced')
    expect(getSkillLevelName(6, 6)).toBe('tournament.skillLevelPro')
  })
})

describe('formatTournamentDateRange', () => {
  it('same day en-US', () => {
    expect(formatTournamentDateRange('2026-06-01', '2026-06-01', 'en-US'))
      .toContain('June')
  })
  it('different months en-US contains both', () => {
    const s = formatTournamentDateRange('2026-06-01', '2026-07-02', 'en-US')
    expect(s).toContain('Jun')
    expect(s).toContain('Jul')
  })
})

describe('formatCurrency', () => {
  it('prefixes shekel', () => {
    expect(formatCurrency(120)).toBe('₪120')
  })
  it('falls back to ₪0 for non-finite', () => {
    expect(formatCurrency(Number.NaN)).toBe('₪0')
  })
})

describe('registrationSummaryKey', () => {
  it('closed past deadline', () => {
    expect(registrationSummaryKey('2000-01-01').key)
      .toBe('tournament.tournamentDetailRegistrationClosed')
  })
  it('ends in N days', () => {
    const d = new Date(); d.setDate(d.getDate() + 5)
    const r = registrationSummaryKey(d.toISOString())
    expect(r.key).toBe('tournament.tournamentDetailRegistrationEndsInDays')
    expect(r.params).toEqual({ count: 5 })
  })
})

describe('registrationSummary', () => {
  const t = (confirmed?: number | null, cap?: number | null) => ({
    confirmed_registrations: confirmed,
    max_participants: cap,
  })

  it('reports how full and how big, so a card can show the size of the draw', () => {
    expect(registrationSummary(t(12, 16))).toEqual({ registered: 12, capacity: 16 })
  })

  it('reports zero registrations rather than hiding them', () => {
    // A player still learns the size from "0/32", which is the point.
    expect(registrationSummary(t(0, 32))).toEqual({ registered: 0, capacity: 32 })
  })

  it('reports a full draw', () => {
    expect(registrationSummary(t(16, 16))).toEqual({ registered: 16, capacity: 16 })
  })

  it('stays quiet without a cap: a count with nothing to divide by has no size', () => {
    expect(registrationSummary(t(9, 0))).toBeNull()
    expect(registrationSummary(t(9, null))).toBeNull()
  })

  it('stays quiet on an API build that omits the count — not "0 of 16"', () => {
    // The null check has to be explicit: zero is now a real value to show, so
    // a falsy check would turn "field absent" into "nobody registered".
    expect(registrationSummary(t(null, 16))).toBeNull()
    expect(registrationSummary({ max_participants: 16 })).toBeNull()
    expect(registrationSummary({})).toBeNull()
  })
})

describe('isLastSpots', () => {
  it('is true only in the narrow band where it is honest', () => {
    expect(isLastSpots(1)).toBe(true)
    expect(isLastSpots(2)).toBe(true)
  })

  it('is false at three seats and above', () => {
    expect(isLastSpots(3)).toBe(false)
    expect(isLastSpots(16)).toBe(false)
  })

  it('is false at zero — that is full, not nearly full', () => {
    expect(isLastSpots(0)).toBe(false)
  })

  it('is false when the seat count is missing rather than guessing', () => {
    expect(isLastSpots(undefined)).toBe(false)
    expect(isLastSpots(null)).toBe(false)
  })
})

describe('orderLiveFirstKeepingPromoted', () => {
  type Fixture = {
    id: string
    start_date: string
    end_date: string
    placement?: { promoted: boolean } | null
  }
  // Live/not-live windows just need to satisfy isTournamentLive; promoted
  // items are skipped by the live check entirely, so their dates don't
  // matter for these tests and are left as an arbitrary future window.
  const liveItem = (id: string, promoted = false): Fixture => ({
    id,
    start_date: hoursFromNow(-1),
    end_date: hoursFromNow(1),
    ...(promoted ? { placement: { promoted: true } } : {}),
  })
  const notLiveItem = (id: string, promoted = false): Fixture => ({
    id,
    start_date: hoursFromNow(2),
    end_date: hoursFromNow(4),
    ...(promoted ? { placement: { promoted: true } } : {}),
  })
  const ids = (list: Fixture[]) => list.map((tr) => tr.id)

  it('matches the old live-first partition when nothing is promoted', () => {
    const list = [notLiveItem('O1'), liveItem('L1'), notLiveItem('O2'), liveItem('L2')]
    const oldPartition = [...list.filter(isTournamentLive), ...list.filter((tr) => !isTournamentLive(tr))]
    expect(ids(orderLiveFirstKeepingPromoted(list))).toEqual(ids(oldPartition))
    expect(ids(orderLiveFirstKeepingPromoted(list))).toEqual(['L1', 'L2', 'O1', 'O2'])
  })

  it('keeps promoted items pinned while hoisting live organic items around them', () => {
    // [L1, P1, L2, P2, O1], both promoted items NOT live -> unchanged. The
    // old "hoist every live item to the front of the whole list" partition
    // would instead pull L1 and L2 together and push P1/P2 down to be
    // adjacent at positions 3-4 — exactly the regression this guards.
    const list = [
      liveItem('L1'), notLiveItem('P1', true), liveItem('L2'), notLiveItem('P2', true), notLiveItem('O1'),
    ]
    expect(ids(orderLiveFirstKeepingPromoted(list))).toEqual(['L1', 'P1', 'L2', 'P2', 'O1'])
  })

  it('hoists an organic live item past organic-not-live slots without disturbing promoted slots', () => {
    // [O1, P1, L1, P2] -> [L1, P1, O1, P2]: L1 hoists ahead of O1 within the
    // organic slots (0 and 2), while P1 and P2 never move from slots 1 and 3.
    const list = [
      notLiveItem('O1'), liveItem('P1', true), liveItem('L1'), notLiveItem('P2', true),
    ]
    expect(ids(orderLiveFirstKeepingPromoted(list))).toEqual(['L1', 'P1', 'O1', 'P2'])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not drop an item whose liveness flips between two Date.now() reads (single-pass partition)', () => {
    // Two separate `.filter(isTournamentLive)` passes over the same item
    // each call `Date.now()` once. If the item's start date falls between
    // those two reads, the first read says "not live yet" (excluded from
    // the live half) and the second says "live now" (excluded from the
    // not-live half too, since `!true` is false) — the item vanishes from
    // both halves and `organicOrdered[i++]` yields `undefined` at its slot.
    // A single pass reads `Date.now()` once per item and can't produce that
    // gap. Every fixture is built with the *real* clock, before the spy.
    const start = Date.now()
    const flipsAt = start + 500
    const flipItem = {
      id: 'FLIP',
      start_date: new Date(flipsAt).toISOString(),
      end_date: new Date(start + 3_600_000).toISOString(),
    }
    let calls = 0
    vi.spyOn(Date, 'now').mockImplementation(() => (calls++ === 0 ? start : flipsAt + 1))
    const result = orderLiveFirstKeepingPromoted([flipItem])
    expect(result.map((tr) => tr?.id)).toEqual(['FLIP'])
  })
})

describe('orderLiveFirst', () => {
  type Fixture = {
    id: string
    start_date: string
    end_date: string
    placement?: { promoted: boolean } | null
  }
  const liveItem = (id: string, promoted = false): Fixture => ({
    id,
    start_date: hoursFromNow(-1),
    end_date: hoursFromNow(1),
    ...(promoted ? { placement: { promoted: true } } : {}),
  })
  const notLiveItem = (id: string, promoted = false): Fixture => ({
    id,
    start_date: hoursFromNow(2),
    end_date: hoursFromNow(4),
    ...(promoted ? { placement: { promoted: true } } : {}),
  })
  const ids = (list: Fixture[]) => list.map((tr) => tr.id)

  it('is the identity-plus-live-first partition when nothing is promoted, same as orderLiveFirstKeepingPromoted', () => {
    const list = [notLiveItem('O1'), liveItem('L1'), notLiveItem('O2'), liveItem('L2')]
    expect(ids(orderLiveFirst(list))).toEqual(['L1', 'L2', 'O1', 'O2'])
  })

  it('ignores placement entirely — promoted items are not pinned and can end up adjacent or reordered', () => {
    // Same input as the "keeps promoted items pinned" case above, but here
    // nothing is pinned: P1 and P2 sort by liveness like everything else.
    // This is deliberate — see the function's docstring — used only once a
    // client-side filter has already broken the served-index contract.
    const list = [
      liveItem('L1'), notLiveItem('P1', true), liveItem('L2'), notLiveItem('P2', true), notLiveItem('O1'),
    ]
    expect(ids(orderLiveFirst(list))).toEqual(['L1', 'L2', 'P1', 'P2', 'O1'])
  })
})

