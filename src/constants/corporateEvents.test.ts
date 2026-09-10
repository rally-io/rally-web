import { describe, it, expect } from 'vitest'
import { CORPORATE_EVENTS, getCorporateEvent, type CorporateEvent } from './corporateEvents'

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

  it('returns null for an unknown or missing slug', () => {
    expect(getCorporateEvent('nope')).toBeNull()
    expect(getCorporateEvent(undefined)).toBeNull()
  })
})
