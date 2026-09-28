import { describe, it, expect } from 'vitest'
import { CORPORATE_EVENTS, eventPagePathForTournament, getCorporateEvent, type CorporateEvent } from './corporateEvents'

describe('corporateEvents', () => {
  it('every entry declares a mode, and the two legacy entries are lead-mode', () => {
    for (const [slug, ev] of Object.entries(CORPORATE_EVENTS)) {
      expect(ev.slug).toBe(slug)
      expect(['lead', 'tournament']).toContain(ev.mode)
    }
    expect(getCorporateEvent('samsung-fold8')?.mode).toBe('lead')
    expect(getCorporateEvent('dani-shoval')?.mode).toBe('lead')
  })

  it('a lead entry carries a corporate_ sheet source; a tournament entry carries a tournament id', () => {
    for (const ev of Object.values(CORPORATE_EVENTS)) {
      if (ev.mode === 'lead') expect(ev.sheetSource).toMatch(/^corporate_[a-z0-9_]{1,40}$/)
      else expect(ev.tournamentId).toMatch(/^[0-9a-f-]{36}$/)
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
    expect(lead.mode).toBe('lead')
    expect(tournament.mode).toBe('tournament')
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
  // change here, alongside rally-api's EVENT_PAGE_ONLY_TOURNAMENTS.
  it('only the Holon Israel Open sends its tournament page to its event page', () => {
    const redirecting = Object.values(CORPORATE_EVENTS)
      .filter((ev) => ev.mode === 'tournament' && ev.redirectFromTournamentPage)
      .map((ev) => ev.slug)
    expect(redirecting).toEqual(['holon-israel-open-2026'])
  })

  it('maps that tournament id to its event page, and nothing else to anything', () => {
    expect(eventPagePathForTournament('7acb6027-33df-456a-8d3c-6ba4073b72ef')).toBe('/join/holon-israel-open-2026')
    expect(eventPagePathForTournament('00000000-0000-0000-0000-000000000000')).toBeNull()
    expect(eventPagePathForTournament(undefined)).toBeNull()
  })

  it('returns null for an unknown or missing slug', () => {
    expect(getCorporateEvent('nope')).toBeNull()
    expect(getCorporateEvent(undefined)).toBeNull()
  })
})

describe('the Holon Israel Open level categories', () => {
  it('offers every tournament band from 2 to 5, as tournaments write them', () => {
    const event = getCorporateEvent('holon-israel-open-2026')
    expect(event?.mode).toBe('tournament')
    expect(event && event.mode === 'tournament' ? event.competeLevels : undefined).toEqual([
      '2.0 - 2.5 (D1)',
      '2.5 - 3.0 (D1 - C2)',
      '3.0 - 3.5 (C2 - C1)',
      '3.5 - 4.0 (C1 - B2)',
      '4.0 - 4.5 (B2 - B1)',
      '4.5 - 5.0 (B1 - A)',
    ])
  })
})
