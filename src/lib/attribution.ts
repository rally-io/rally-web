// Campaign attribution for lead forms.
//
// When a visitor lands from an ad (`?utm_*`, `fbclid`, `gclid`) we remember
// where they came from, so a lead submitted later in the session — or on a
// return visit within 30 days — carries its source into the Google Sheet.
// Without this the Sheet only says "someone filled the form"; with it every
// row says which campaign / ad paid for it.
//
// Last-touch: a new tagged visit overwrites the stored attribution. An untagged
// visit never erases a stored tagged one, but records landing page + referrer
// when nothing is stored yet (so organic leads still say where they entered).

export const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
] as const

type AttributionParam = (typeof ATTRIBUTION_PARAMS)[number]

export type Attribution = Partial<
  Record<AttributionParam | 'landing_page' | 'referrer' | 'landed_at', string>
>

const STORAGE_KEY = 'rally_attribution'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const MAX_VALUE_LEN = 200

let memory: Attribution = {}

function readStored(): Attribution {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Attribution
    if (parsed.landed_at && Date.now() - Date.parse(parsed.landed_at) > MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY)
      return {}
    }
    return parsed
  } catch {
    return {}
  }
}

function writeStored(value: Attribution) {
  memory = value
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // private mode / quota — the in-memory copy still covers this page load
  }
}

function clip(value: string): string {
  return value.length > MAX_VALUE_LEN ? value.slice(0, MAX_VALUE_LEN) : value
}

/**
 * Parse the tracking params out of a URL. Exported for tests; callers should
 * use `captureAttribution`.
 */
export function parseAttribution(search: string): Partial<Record<AttributionParam, string>> {
  const params = new URLSearchParams(search)
  const out: Partial<Record<AttributionParam, string>> = {}
  for (const key of ATTRIBUTION_PARAMS) {
    const value = params.get(key)?.trim()
    if (value) out[key] = clip(value)
  }
  return out
}

/**
 * Call once on page load (before React renders). Records campaign params from
 * the landing URL; returns whatever attribution is now in effect.
 */
export function captureAttribution(
  loc: { pathname: string; search: string } = window.location,
  referrer: string = document.referrer,
): Attribution {
  const tagged = parseAttribution(loc.search)
  const stored = readStored()
  const hasTags = Object.keys(tagged).length > 0

  if (!hasTags && Object.keys(stored).length > 0) {
    memory = stored
    return stored
  }

  const next: Attribution = {
    ...tagged,
    landing_page: clip(loc.pathname + loc.search),
    landed_at: new Date().toISOString(),
  }
  if (referrer) next.referrer = clip(referrer)
  writeStored(next)
  return next
}

/** Attribution fields to merge into a lead payload (empty object if none). */
export function getAttribution(): Attribution {
  if (Object.keys(memory).length > 0) return memory
  memory = readStored()
  return memory
}
