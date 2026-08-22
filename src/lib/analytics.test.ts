import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { normalizeEmail, normalizePhone, trackLead, trackDownload, META_PIXEL_ID } from './analytics'

describe('normalisation for Meta advanced matching', () => {
  it('lower-cases and trims emails, drops non-addresses', () => {
    expect(normalizeEmail('  Almog@Hunt.co.il ')).toBe('almog@hunt.co.il')
    expect(normalizeEmail('not an email')).toBeUndefined()
    expect(normalizeEmail('')).toBeUndefined()
  })

  it('turns Israeli local numbers into 972… digits', () => {
    expect(normalizePhone('050-123-4567')).toBe('972501234567')
    expect(normalizePhone('+972 50 123 4567')).toBe('972501234567')
    expect(normalizePhone('00972501234567')).toBe('972501234567')
    expect(normalizePhone('501234567')).toBe('972501234567')
    expect(normalizePhone('12')).toBeUndefined()
    expect(normalizePhone('')).toBeUndefined()
  })
})

describe('trackLead', () => {
  const fbq = vi.fn()
  const gtag = vi.fn()
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    window.fbq = fbq
    window.gtag = gtag
    fetchSpy = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)
  })
  afterEach(() => {
    fbq.mockReset()
    gtag.mockReset()
    vi.unstubAllGlobals()
    delete window.fbq
    delete window.gtag
  })

  it('fires the pixel, GA4 and the CAPI relay with one shared event id', () => {
    trackLead('contact_form', { segment: 'club', email: 'A@B.com', phone: '0501234567' })

    // advanced matching re-init, then the Lead event
    expect(fbq).toHaveBeenCalledWith('init', META_PIXEL_ID, { em: 'a@b.com', ph: '972501234567' })
    const lead = fbq.mock.calls.find((c) => c[0] === 'track' && c[1] === 'Lead')!
    expect(lead[2]).toEqual({ content_category: 'contact_form', content_name: 'club' })
    const eventId = (lead[3] as { eventID: string }).eventID
    expect(eventId).toBeTruthy()

    expect(gtag).toHaveBeenCalledWith(
      'event',
      'generate_lead',
      expect.objectContaining({ lead_source: 'contact_form', lead_segment: 'club' }),
    )

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/meta-capi')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.event_name).toBe('Lead')
    expect(body.event_id).toBe(eventId)
    expect(body.user_data).toEqual({ em: 'a@b.com', ph: '972501234567' })
  })

  it('skips advanced matching when the form has no contact details', () => {
    trackLead('tournament_updates')
    expect(fbq).not.toHaveBeenCalledWith('init', expect.anything(), expect.anything())
    expect(fbq).toHaveBeenCalledWith(
      'track',
      'Lead',
      { content_category: 'tournament_updates' },
      expect.objectContaining({ eventID: expect.any(String) }),
    )
  })

  it('never throws when the pixel and GA4 are blocked', () => {
    delete window.fbq
    delete window.gtag
    expect(() => trackDownload('app_store')).not.toThrow()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
