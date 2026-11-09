import { describe, expect, it } from 'vitest'
import { CORPORATE_EVENTS } from './corporateEvents'
import vercel from '../../vercel.json'

/**
 * rally-api refuses to let a manager claim these slugs for a CRM-built event
 * (`CORPORATE_RESERVED_SLUGS` in rally-api app/schemas/corporate.py), because the web serves them
 * from the hardcoded registry. The two lists are kept in sync by hand — copy any change in either
 * place into the other. This is the web half of the "no collision" test: every slug this repo
 * serves from the registry, or redirects, MUST be in the API's list.
 *
 * The dispatcher is API-first, so a collision would silently hand a legacy link to whoever
 * registered the slug in the CRM.
 */
const API_RESERVED = new Set([
  'samsung-fold8', 'dani-shoval', 'holon-israel-open-2026', 'israel-open-2026', 'holon',
  'roster', 'admin', 'api', 'new', 'edit',
  'holon-israel-open-2026-d2-d1', 'holon-israel-open-2026-d1-c2', 'holon-israel-open-2026-c2-c1',
  'holon-israel-open-2026-c1-b2', 'holon-israel-open-2026-b2-a',
])

describe('hardcoded corporate slugs vs the API reserved list', () => {
  it('has registry entries to check', () => {
    expect(Object.keys(CORPORATE_EVENTS).length).toBeGreaterThan(0)
  })

  it.each(Object.keys(CORPORATE_EVENTS))('registry slug %s is reserved in rally-api', (slug) => {
    expect(API_RESERVED.has(slug), `${slug} is served by corporateEvents.ts but not reserved in rally-api CORPORATE_RESERVED_SLUGS`).toBe(true)
  })

  it('every registry key equals its entry slug', () => {
    for (const [key, event] of Object.entries(CORPORATE_EVENTS)) expect(event.slug).toBe(key)
  })

  it('every vercel.json redirect on /join/* or /holon is reserved too', () => {
    const sources = vercel.redirects.map((r) => r.source).filter((s) => s.startsWith('/join/') || s === '/holon')
    expect(sources.length).toBeGreaterThan(0)
    for (const source of sources) expect(API_RESERVED.has(source.split('/').pop()!), source).toBe(true)
  })

  it('reserves the route word the roster URL uses', () => {
    expect(API_RESERVED.has('roster')).toBe(true)
  })
})

describe('vercel.json /join routing', () => {
  const sources = vercel.rewrites.map((r) => r.source)

  it('sends the two-segment roster path to the SPA shell, never through join-og', () => {
    const roster = vercel.rewrites.find((r) => r.source === '/join/:slug/roster/:token')
    expect(roster?.destination).toBe('/index.html')
    // First match wins: it must come before anything that could claim /join/*.
    expect(sources.indexOf('/join/:slug/roster/:token')).toBeLessThan(sources.indexOf('/join/:slug'))
  })

  it('still unfurls the single-segment event link through join-og', () => {
    expect(vercel.rewrites.find((r) => r.source === '/join/:slug')?.destination).toBe('/api/join-og?slug=:slug')
  })
})
