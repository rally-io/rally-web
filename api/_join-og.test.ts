import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from './join-og'

const SHELL = `<head>
<title>Rally</title>
<meta property="og:title" content="Rally" />
<meta property="og:description" content="old" />
<meta property="og:image" content="/og-image.jpg" />
<meta property="og:url" content="https://rallypadel.app" />
<meta name="twitter:image" content="/og-image.jpg" />
</head>`

const req = (slug: string) => ({ query: { slug }, headers: { host: 'rallypadel.app', 'x-forwarded-proto': 'https' } }) as unknown as VercelRequest

function makeRes() {
  const res = {
    body: '', statusCode: 0, headers: {} as Record<string, string>,
    setHeader(k: string, v: string) { this.headers[k] = v },
    status(code: number) { this.statusCode = code; return this },
    send(body: string) { this.body = body; return this },
  }
  return res as typeof res & VercelResponse
}

const ok = (body: unknown, text = false) => ({ ok: true, status: 200, text: async () => (text ? (body as string) : ''), json: async () => body })
const notFound = { ok: false, status: 404, text: async () => '', json: async () => ({}) }

const CONFIG = {
  data: {
    name: 'Acme Padel Day', customer_name: 'Acme', club_name: 'Padel TLV',
    start_at: '2026-11-12T15:00:00Z', end_at: '2026-11-12T19:00:00Z',
    landing_config: {
      locale: 'en',
      components: [
        { type: 'hero', enabled: true, title: 'Acme Cup', image_url: 'https://cdn/acme.jpg' },
        { type: 'details', enabled: true, date_label: 'Thursday 12 Nov', time_label: '17:00–21:00' },
      ],
    },
  },
}

/** Shell for index.html; `corporate` decides what the API's config endpoint answers. */
function mockFetch(corporate: (url: string, init?: RequestInit) => unknown) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/index.html')) return ok(SHELL, true)
    return corporate(String(url), init)
  })
}

beforeEach(() => { vi.stubGlobal('fetch', mockFetch(() => notFound)) })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('api/join-og — API first', () => {
  it('builds the card from the public config: title, description, image, noindex', async () => {
    const fetchMock = mockFetch(() => ok(CONFIG))
    vi.stubGlobal('fetch', fetchMock)
    const res = makeRes()
    await handler(req('acme-day'), res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('<title>Acme Cup · Rally</title>')
    expect(res.body).toContain('<meta property="og:description" content="Acme · Thursday 12 Nov · 17:00–21:00 · Padel TLV" />')
    expect(res.body).toContain('<meta property="og:image" content="https://cdn/acme.jpg" />')
    expect(res.body).toContain('<meta property="og:url" content="https://rallypadel.app/join/acme-day" />')
    expect(res.body).toContain('noindex')
    const call = fetchMock.mock.calls.find(([u]) => String(u).includes('/public/corporate-events/'))!
    expect(String(call[0])).toMatch(/\/public\/corporate-events\/acme-day$/)
    expect((call[1] as RequestInit).signal).toBeInstanceOf(AbortSignal)
  })

  it('falls back to the event name and the start/end times when the hero and details are off', async () => {
    const body = { data: { ...CONFIG.data, landing_config: { locale: 'en', components: [] } } }
    vi.stubGlobal('fetch', mockFetch(() => ok(body)))
    const res = makeRes()
    await handler(req('acme-day'), res)
    expect(res.body).toContain('<title>Acme Padel Day · Rally</title>')
    expect(res.body).toContain('17:00–21:00') // 15:00Z–19:00Z in Israel time
    expect(res.body).toContain('content="/og-image.jpg"') // shell image untouched
  })

  it('uses the hero image as og:image (made absolute) even when the hero text is switched off, and its title otherwise', async () => {
    const body = { data: { ...CONFIG.data, landing_config: { locale: 'en', components: [{ type: 'hero', enabled: false, title: 'Ignored', image_url: '/uploads/acme.jpg' }] } } }
    vi.stubGlobal('fetch', mockFetch(() => ok(body)))
    const res = makeRes()
    await handler(req('acme-day'), res)
    expect(res.body).toContain('<meta property="og:image" content="https://rallypadel.app/uploads/acme.jpg" />')
    expect(res.body).toContain('<meta name="twitter:image" content="https://rallypadel.app/uploads/acme.jpg" />')
    expect(res.body).toContain('<title>Acme Padel Day · Rally</title>')
  })

  it('prefers the API over the registry for the same slug', async () => {
    vi.stubGlobal('fetch', mockFetch(() => ok(CONFIG)))
    const res = makeRes()
    await handler(req('samsung-fold8'), res)
    expect(res.body).toContain('<title>Acme Cup · Rally</title>')
  })

  it('falls back to the static registry on a 404', async () => {
    const res = makeRes()
    await handler(req('samsung-fold8'), res)
    expect(res.statusCode).toBe(200)
    expect(res.body).not.toContain('<title>Rally</title>')
    expect(res.body).toContain('noindex')
  })

  it('falls back to the registry when the API throws', async () => {
    vi.stubGlobal('fetch', mockFetch(() => { throw new Error('network down') }))
    const res = makeRes()
    await handler(req('samsung-fold8'), res)
    expect(res.body).not.toContain('<title>Rally</title>')
  })

  it('serves the bare shell for a slug in neither the API nor the registry', async () => {
    const res = makeRes()
    await handler(req('nope'), res)
    expect(res.body).toBe(SHELL)
  })

  it('serves the bare shell when the config has no name', async () => {
    vi.stubGlobal('fetch', mockFetch(() => ok({ data: { customer_name: 'x' } })))
    const res = makeRes()
    await handler(req('nope'), res)
    expect(res.body).toBe(SHELL)
  })

  it('gives up on a slow API after ~1.5s and uses the registry instead of hanging', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (String(url).endsWith('/index.html')) return Promise.resolve(ok(SHELL, true))
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    }))
    const res = makeRes()
    const pending = handler(req('samsung-fold8'), res)
    await vi.advanceTimersByTimeAsync(1600)
    await pending
    expect(res.statusCode).toBe(200)
    expect(res.body).not.toContain('<title>Rally</title>') // registry card, not the bare shell
  })

  it('never 500s when the shell fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down') }))
    const res = makeRes()
    await handler(req('acme-day'), res)
    expect(res.statusCode).toBe(200)
    expect(res.headers['Cache-Control']).toBe('no-store')
  })
})
