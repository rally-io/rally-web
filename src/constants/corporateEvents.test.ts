import { describe, it, expect } from 'vitest'
import {
  CORPORATE_EVENTS, eventPagePathForTournament, getCorporateEvent,
  type CorporateEvent, type CorporateHubEvent, type CorporateTournamentEvent,
} from './corporateEvents'

describe('corporateEvents', () => {
  it('every entry declares a mode, and the two legacy entries are lead-mode', () => {
    for (const [slug, ev] of Object.entries(CORPORATE_EVENTS)) {
      expect(ev.slug).toBe(slug)
      expect(['lead', 'tournament', 'hub']).toContain(ev.mode)
    }
    expect(getCorporateEvent('samsung-fold8')?.mode).toBe('lead')
    expect(getCorporateEvent('dani-shoval')?.mode).toBe('lead')
  })

  it('a lead entry carries a corporate_ sheet source; a tournament entry carries a tournament id', () => {
    for (const ev of Object.values(CORPORATE_EVENTS)) {
      if (ev.mode === 'lead') expect(ev.sheetSource).toMatch(/^corporate_[a-z0-9_]{1,40}$/)
      else if (ev.mode === 'tournament') expect(ev.tournamentId).toMatch(/^[0-9a-f-]{36}$/)
    }
  })

  it('narrows by mode at the type level', () => {
    const lead: CorporateEvent = {
      mode: 'lead', slug: 'x', sheetSource: 'corporate_x', company: 'X', tournamentName: 'X Cup',
      clubName: 'C', clubAddress: 'A', heroImage: '/x.jpg', dateLabel: 'd', timeLabel: '10:00–12:00',
    }
    const tournament: CorporateEvent = {
      mode: 'tournament', slug: 'y', tournamentId: '00000000-0000-0000-0000-000000000000',
      company: 'Y', tournamentName: 'Y Cup', clubName: 'C', clubAddress: 'A', heroImage: '/y.jpg',
      dateLabel: 'd', timeLabel: '10:00–12:00',
    }
    const hub: CorporateEvent = {
      mode: 'hub', slug: 'z', categories: ['y'],
      company: 'Z', tournamentName: 'Z Cup', clubName: 'C', clubAddress: 'A', heroImage: '/z.jpg',
      dateLabel: 'd', timeLabel: '10:00–12:00',
    }
    expect(lead.mode).toBe('lead')
    expect(tournament.mode).toBe('tournament')
    expect(hub.mode).toBe('hub')
  })

  // A local heroImage is served from public/ AND is the link preview's og:image
  // (api/join-og.ts), so a renamed or deleted file ships as a broken hero and an
  // imageless WhatsApp card — `heroImage` is just a string, nothing else notices.
  // Listed with `import.meta.glob`, not `fs`: this file lives under src/, which has
  // no Node types. NOT an api/ test: every file in api/, tests included, counts
  // toward Vercel's 12-function Hobby limit, and main sits exactly at it.
  it('every local hero image exists in public/', () => {
    const publicFiles = Object.keys(import.meta.glob('/public/**/*.{jpg,jpeg,png,webp}'))
      .map((path) => path.replace(/^\/public/, ''))
    for (const ev of Object.values(CORPORATE_EVENTS)) {
      if (!ev.heroImage || /^https?:/.test(ev.heroImage)) continue
      expect(publicFiles, `${ev.slug}: ${ev.heroImage}`).toContain(ev.heroImage)
    }
  })

  // The owner asked for this ONE tournament (2026-09-28). A second one is a deliberate
  it('no tournament redirects to an event page when standard flow is enabled', () => {
    const redirecting = Object.values(CORPORATE_EVENTS)
      .filter((ev) => ev.mode === 'tournament' && ev.redirectFromTournamentPage)
      .map((ev) => ev.slug)
    expect(redirecting).toEqual([])
  })

  it('maps tournament id to null when redirection is disabled', () => {
    expect(eventPagePathForTournament('7acb6027-33df-456a-8d3c-6ba4073b72ef')).toBeNull()
    expect(eventPagePathForTournament('00000000-0000-0000-0000-000000000000')).toBeNull()
    expect(eventPagePathForTournament(undefined)).toBeNull()
  })

  it('returns null for an unknown or missing slug', () => {
    expect(getCorporateEvent('nope')).toBeNull()
    expect(getCorporateEvent(undefined)).toBeNull()
  })
})

describe('the Holon Israel Open hub', () => {
  const hub = () => {
    const event = getCorporateEvent('holon-israel-open-2026')
    if (event?.mode !== 'hub') throw new Error('the Israel Open hub is missing')
    return event as CorporateHubEvent
  }
  const categories = () => hub().categories.map((slug) => {
    const event = getCorporateEvent(slug)
    if (event?.mode !== 'tournament') throw new Error(`${slug} is not a tournament entry`)
    return event as CorporateTournamentEvent
  })

  it('is a hub with the five level categories, lowest level first', () => {
    expect(categories().map((c) => c.levelLabel)).toEqual([
      '2.0–2.5 (D2–D1)',
      '2.5–3.0 (D1–C2)',
      '3.0–3.5 (C2–C1)',
      '3.5–4.0 (C1–B2)',
      '4.0–5.0 (B2–A)',
    ])
  })

  it('points every category at a different tournament, never at the original one', () => {
    const ids = categories().map((c) => c.tournamentId)
    expect(new Set(ids).size).toBe(ids.length)
    // 7acb6027-… is the closed parent the registrations were split out of.
    expect(ids).not.toContain('7acb6027-33df-456a-8d3c-6ba4073b72ef')
  })

  it('links each category back to the hub, which links to it', () => {
    for (const category of categories()) {
      expect(category.hubSlug).toBe('holon-israel-open-2026')
    }
    for (const ev of Object.values(CORPORATE_EVENTS)) {
      if (ev.mode === 'tournament' && ev.hubSlug) {
        const hubEvent = getCorporateEvent(ev.hubSlug)
        expect(hubEvent?.mode, `${ev.slug} names ${ev.hubSlug}`).toBe('hub')
        expect(hubEvent?.mode === 'hub' ? hubEvent.categories : []).toContain(ev.slug)
      }
    }
  })

  it('keeps the residents\' waiver on every category — it only exists on the event page', () => {
    for (const category of categories()) {
      expect(category.feeWaiver).toEqual({ type: 'holon_resident' })
    }
  })

  it('asks no level and no day on a category page — the category is both', () => {
    for (const category of categories()) {
      expect(category.competeLevels).toBeUndefined()
      expect(category.preferredDays).toBeUndefined()
    }
  })

  it('has no category that is itself a hub', () => {
    for (const slug of hub().categories) expect(getCorporateEvent(slug)?.mode).toBe('tournament')
  })
})
