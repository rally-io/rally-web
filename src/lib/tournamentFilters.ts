import type { TournamentListParams } from '@/services/api/tournaments'
import type { Tournament } from '@/types/api'
import { monthKey } from '@/lib/monthGroups'
import { SKILL_MAX } from '@/lib/skillLevel'

/**
 * The tournament list filters, in one place.
 *
 * Each dimension declares where it is *resolved*: server-side (it maps to a
 * `TournamentListParams` key and the API does the work) or client-side (it
 * carries a predicate we run over the loaded page). Today `clubs` and
 * `organizers` are server-side because the API takes `club_ids` and
 * `manager_slugs`; `skill` and `month` are client-side because it takes
 * nothing equivalent — so they only narrow what has already been fetched.
 *
 * When the API grows a skill or date param, move that dimension by swapping
 * its `serverParam: null` + `matches` for a `serverParam` string. The union
 * below makes that a type error until both halves are changed, and no caller
 * needs to know: `toServerParams` and `matchesFilters` both read the table.
 */

export type SkillBucket = 'beginner' | 'intermediate' | 'advanced' | 'pro'

export interface SkillBucketDef {
  id: SkillBucket
  /** Inclusive lower bound. */
  min: number
  /** Exclusive upper bound (inclusive for the top bucket). */
  max: number
  labelKey: string
}

/**
 * Four buckets over the 1.0–7.0 rating scale. The thresholds are the ones
 * `getSkillLevelName` already uses to name a tournament's range, and the
 * labels reuse its `tournament.skillLevel*` keys, so a filter chip and a
 * tournament's own "Intermediate" label can never disagree.
 */
export const SKILL_BUCKETS: SkillBucketDef[] = [
  { id: 'beginner', min: 1.0, max: 2.5, labelKey: 'tournament.skillLevelBeginner' },
  { id: 'intermediate', min: 2.5, max: 4.0, labelKey: 'tournament.skillLevelIntermediate' },
  { id: 'advanced', min: 4.0, max: 5.5, labelKey: 'tournament.skillLevelAdvanced' },
  { id: 'pro', min: 5.5, max: SKILL_MAX, labelKey: 'tournament.skillLevelPro' },
]

export interface TournamentFilters {
  clubIds: string[]
  organizerSlugs: string[]
  skills: SkillBucket[]
  months: string[]
}

export const EMPTY_FILTERS: TournamentFilters = {
  clubIds: [],
  organizerSlugs: [],
  skills: [],
  months: [],
}

export const FILTER_KEYS = [
  'clubIds',
  'organizerSlugs',
  'skills',
  'months',
] as const satisfies readonly (keyof TournamentFilters)[]

interface BaseDimension {
  /** URL query param carrying this dimension, comma separated. */
  param: string
  /**
   * Guard applied to every value at parse time. A hand-edited, stale or
   * truncated URL must degrade to "no filter" rather than ship a bad value
   * to the API — a malformed uuid 422s the whole page.
   */
  isValid: (value: string) => boolean
}

interface ServerDimension extends BaseDimension {
  serverParam: 'club_ids' | 'manager_slugs'
}

interface ClientDimension extends BaseDimension {
  serverParam: null
  /** True when the tournament satisfies *any* of the selected values. */
  matches: (tr: Tournament, values: string[]) => boolean
}

type FilterDimension = ServerDimension | ClientDimension

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Organizer slugs fall back to the manager's uuid server-side, so both shapes
// have to pass. Length-capped: the API rejects nothing, but an unbounded URL
// value has no business reaching it.
const SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export const FILTER_DIMENSIONS: Record<keyof TournamentFilters, FilterDimension> = {
  // A list item carries `club_name` but no club id, so this one can only ever
  // be resolved by the API.
  clubIds: {
    param: 'clubs',
    isValid: (v) => UUID_RE.test(v),
    serverParam: 'club_ids',
  },
  organizerSlugs: {
    param: 'organizers',
    isValid: (v) => SLUG_RE.test(v),
    serverParam: 'manager_slugs',
  },
  skills: {
    param: 'skill',
    isValid: (v) => SKILL_BUCKETS.some((b) => b.id === v),
    serverParam: null,
    matches: (tr, values) =>
      values.some((id) => {
        const bucket = SKILL_BUCKETS.find((b) => b.id === id)
        return bucket ? skillRangeTouches(tr, bucket) : false
      }),
  },
  months: {
    param: 'month',
    isValid: (v) => MONTH_RE.test(v),
    serverParam: null,
    matches: (tr, values) => {
      const key = startMonthKey(tr.start_date)
      return key !== null && values.includes(key)
    },
  },
}

/**
 * Does a tournament's rating range fall inside this bucket?
 *
 * Overlap is strict, so a 2.5–4.0 tournament is "Intermediate" only — merely
 * touching the endpoint of the bucket next door does not put it in two lists.
 * A range of 0 (or an unreadable one) means the tournament is open to every
 * level, and an open tournament belongs in every bucket rather than none.
 */
function skillRangeTouches(tr: Tournament, bucket: SkillBucketDef): boolean {
  const rawMin = Number(tr.skill_level_min)
  const rawMax = Number(tr.skill_level_max)
  if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) return true
  if (rawMin <= 0 && rawMax <= 0) return true
  const min = Math.min(rawMin, rawMax)
  const max = Math.max(rawMin, rawMax)
  if (min === max) {
    return (
      (min >= bucket.min && min < bucket.max) ||
      (bucket.max >= SKILL_MAX && min === bucket.max)
    )
  }
  return min < bucket.max && max > bucket.min
}

/** Local-time `YYYY-MM` of a start date — the same derivation `groupByMonth`
 * uses, so a month chip and a month heading always agree. */
function startMonthKey(startDate: string | null | undefined): string | null {
  if (!startDate) return null
  const d = new Date(startDate)
  if (!Number.isFinite(d.getTime())) return null
  return monthKey(d)
}

function readDimension(params: URLSearchParams, key: keyof TournamentFilters): string[] {
  const dim = FILTER_DIMENSIONS[key]
  const raw = params.get(dim.param)
  if (!raw) return []
  const values = raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && dim.isValid(v))
  return Array.from(new Set(values)).sort()
}

export function parseTournamentFilters(params: URLSearchParams): TournamentFilters {
  return {
    clubIds: readDimension(params, 'clubIds'),
    organizerSlugs: readDimension(params, 'organizerSlugs'),
    skills: readDimension(params, 'skills') as SkillBucket[],
    months: readDimension(params, 'months'),
  }
}

/** Returns a copy of `params` with the filter params rewritten; every other
 * param (tab, sort, …) is left alone, and an empty dimension is deleted so a
 * bare URL always means "no filter". */
export function writeTournamentFilters(
  params: URLSearchParams,
  next: TournamentFilters,
): URLSearchParams {
  const out = new URLSearchParams(params)
  for (const key of FILTER_KEYS) {
    const dim = FILTER_DIMENSIONS[key]
    const values = Array.from(new Set<string>(next[key])).sort()
    if (values.length === 0) out.delete(dim.param)
    else out.set(dim.param, values.join(','))
  }
  return out
}

export function toServerParams(filters: TournamentFilters): Partial<TournamentListParams> {
  const out: Record<string, string[]> = {}
  for (const key of FILTER_KEYS) {
    const dim = FILTER_DIMENSIONS[key]
    const values = filters[key] as string[]
    if (dim.serverParam !== null && values.length > 0) out[dim.serverParam] = [...values]
  }
  return out as Partial<TournamentListParams>
}

/** True when something is selected that the API did *not* apply for us — the
 * signal that the loaded pages need narrowing (and that fetching more pages
 * would surface more matches). */
export function hasClientFilters(filters: TournamentFilters): boolean {
  return FILTER_KEYS.some(
    (key) => FILTER_DIMENSIONS[key].serverParam === null && filters[key].length > 0,
  )
}

export function matchesFilters(tr: Tournament, filters: TournamentFilters): boolean {
  for (const key of FILTER_KEYS) {
    const dim = FILTER_DIMENSIONS[key]
    if (dim.serverParam !== null) continue // already applied by the API
    const values = filters[key] as string[]
    if (values.length > 0 && !dim.matches(tr, values)) return false
  }
  return true
}

export function activeFilterCount(filters: TournamentFilters): number {
  return FILTER_KEYS.reduce((sum, key) => sum + filters[key].length, 0)
}

export interface MonthOption {
  value: string
  label: string
}

/**
 * The months actually present in the loaded list, newest or oldest first.
 * Derived from the data rather than from a fixed calendar range so the chip
 * list can never offer a month with nothing behind it.
 */
export function monthOptionsFrom(
  items: { start_date: string }[],
  direction: 'asc' | 'desc',
  locale: string,
): MonthOption[] {
  const keys = new Set<string>()
  for (const item of items) {
    const key = startMonthKey(item.start_date)
    if (key) keys.add(key)
  }
  const sign = direction === 'asc' ? 1 : -1
  return Array.from(keys)
    .sort((a, b) => sign * a.localeCompare(b))
    .map((value) => {
      const [year, month] = value.split('-').map(Number)
      return {
        value,
        label: new Date(year, month - 1, 1).toLocaleDateString(locale, {
          month: 'long',
          year: 'numeric',
        }),
      }
    })
}
