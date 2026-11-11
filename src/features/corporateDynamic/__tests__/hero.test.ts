import { describe, expect, it } from 'vitest'
import { detailLabelsFor, headingFor, pageTitleFor } from '../hero'
import { config, eventFixture } from './fixtures'

const withHero = (patch: object, enabled = true) =>
  eventFixture({
    landing_config: config({ components: config().components.map((c) => (c.type === 'hero' ? { ...c, enabled, ...patch } : c)) as never }),
  })

describe('headingFor', () => {
  it('reads title, subtitle, banner and logo from the hero component', () => {
    const h = headingFor(withHero({ image_url: 'https://cdn/banner.jpg', company_logo_url: 'https://cdn/logo.png' }))
    expect(h).toEqual({ title: 'Acme Padel Day', subtitle: 'Bring a colleague', imageUrl: 'https://cdn/banner.jpg', logoUrl: 'https://cdn/logo.png' })
    expect(pageTitleFor(eventFixture())).toBe('Acme Padel Day · Acme')
  })

  it('treats missing, null and blank images as none', () => {
    expect(headingFor(withHero({ image_url: null, company_logo_url: '  ' }))).toMatchObject({ imageUrl: '', logoUrl: '' })
    expect(headingFor(eventFixture({ landing_config: config({ components: [] }) }))).toMatchObject({ imageUrl: '', logoUrl: '' })
  })

  it('switching the hero off drops the custom text but keeps uploaded artwork', () => {
    const h = headingFor(withHero({ title: 'Custom', subtitle: 'Sub', image_url: 'https://cdn/b.jpg', company_logo_url: 'https://cdn/l.png' }, false))
    expect(h).toEqual({ title: 'Acme Padel Day', subtitle: '', imageUrl: 'https://cdn/b.jpg', logoUrl: 'https://cdn/l.png' })
  })
})

describe('detailLabelsFor', () => {
  it('returns the manager\'s labels, and reports the component off', () => {
    expect(detailLabelsFor(eventFixture())).toEqual({ enabled: true, date: 'Thursday 12 Nov', time: '17:00–21:00', venue: 'Padel TLV, Tel Aviv' })
    const off = eventFixture({ landing_config: config({ components: config().components.map((c) => (c.type === 'details' ? { ...c, enabled: false } : c)) as never }) })
    expect(detailLabelsFor(off).enabled).toBe(false)
  })
})
