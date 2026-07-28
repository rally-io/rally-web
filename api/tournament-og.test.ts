import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from './tournament-og'

const SHELL = `<head>
<title>Rally</title>
<meta property="og:title" content="Rally" />
<meta property="og:description" content="old" />
<meta property="og:image" content="/og-image.jpg" />
<meta property="og:url" content="https://rallypadel.app" />
<meta name="twitter:image" content="/og-image.jpg" />
</head>`

function makeReq(id: string): VercelRequest {
  return {
    query: { id },
    headers: { host: 'rallypadel.app', 'x-forwarded-proto': 'https' },
  } as unknown as VercelRequest
}

function makeRes() {
  const res = {
    body: '',
    statusCode: 0,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) { this.headers[k] = v },
    status(code: number) { this.statusCode = code; return this },
    send(body: string) { this.body = body; return this },
  }
  return res as typeof res & VercelResponse
}

const ok = (body: unknown, text = false) => ({
  ok: true,
  text: async () => (text ? (body as string) : ''),
  json: async () => body,
})

/** Serves the shell for index.html and `apiBody` for the tournament lookup. */
function mockFetch(apiBody: unknown, apiOk = true) {
  return vi.fn(async (url: string) => {
    if (String(url).endsWith('/index.html')) return ok(SHELL, true)
    return apiOk ? ok(apiBody) : { ok: false, text: async () => '', json: async () => ({}) }
  })
}

beforeEach(() => { vi.stubGlobal('fetch', mockFetch({})) })
afterEach(() => { vi.unstubAllGlobals() })

describe('api/tournament-og', () => {
  it('injects the tournament name and image into the shell', async () => {
    vi.stubGlobal('fetch', mockFetch({
      data: {
        name: 'Summer Open',
        description: 'Doubles, all levels',
        image_url: 'https://cdn/t.jpg',
        club_name: 'Padel TLV',
      },
    }))
    const res = makeRes()
    await handler(makeReq('t-1'), res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('<title>Summer Open · Rally</title>')
    expect(res.body).toContain('content="https://cdn/t.jpg"')
    expect(res.body).toContain('<meta property="og:description" content="Doubles, all levels" />')
    expect(res.body).toContain(
      '<meta property="og:url" content="https://rallypadel.app/tournaments/t-1" />',
    )
    expect(res.body).toContain('<meta name="twitter:image" content="https://cdn/t.jpg" />')
  })

  it('falls back to thumb_url when the tournament has no full image', async () => {
    vi.stubGlobal('fetch', mockFetch({
      data: { name: 'T', description: 'd', image_url: null, thumb_url: 'https://cdn/thumb.jpg' },
    }))
    const res = makeRes()
    await handler(makeReq('t-2'), res)
    expect(res.body).toContain('content="https://cdn/thumb.jpg"')
  })

  it('falls back to the club name when the tournament has no description', async () => {
    vi.stubGlobal('fetch', mockFetch({
      data: { name: 'T', description: '', image_url: null, club_name: 'Padel TLV' },
    }))
    const res = makeRes()
    await handler(makeReq('t-3'), res)
    expect(res.body).toContain('<meta property="og:description" content="Padel TLV" />')
  })

  it('serves the untouched shell for /tournaments/summary without hitting the API', async () => {
    const fetchMock = mockFetch({ data: { name: 'should not be used' } })
    vi.stubGlobal('fetch', fetchMock)
    const res = makeRes()
    await handler(makeReq('summary'), res)

    expect(res.body).toBe(SHELL)
    // Only the shell fetch — no tournament lookup for a route that has no id.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('serves the untouched shell when the tournament lookup fails', async () => {
    vi.stubGlobal('fetch', mockFetch({}, false))
    const res = makeRes()
    await handler(makeReq('missing'), res)
    expect(res.body).toBe(SHELL)
    expect(res.statusCode).toBe(200)
  })

  it('serves the untouched shell when the payload has no name', async () => {
    vi.stubGlobal('fetch', mockFetch({ data: { description: 'orphan' } }))
    const res = makeRes()
    await handler(makeReq('t-4'), res)
    expect(res.body).toBe(SHELL)
  })

  it('never 500s when the shell fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    const res = makeRes()
    await handler(makeReq('t-5'), res)
    expect(res.statusCode).toBe(200)
    expect(res.headers['Cache-Control']).toBe('no-store')
  })
})
