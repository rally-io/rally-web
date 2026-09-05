import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from './player-season-og'

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

/** Serves the shell for index.html and `apiBody` for the player lookup. */
function mockFetch(apiBody: unknown, apiOk = true) {
  return vi.fn(async (url: string) => {
    if (String(url).endsWith('/index.html')) return ok(SHELL, true)
    return apiOk ? ok(apiBody) : { ok: false, text: async () => '', json: async () => ({}) }
  })
}

const player = (over: Record<string, unknown> = {}) => ({
  data: {
    season: { name: 'Season 1', counting_results: 4 },
    player_id: 'p1',
    first_name: 'Noa',
    last_name: 'Levi',
    avatar_url: 'https://cdn/noa.jpg',
    avatar_clean_url: 'https://cdn/noa-cutout.png',
    points: 421,
    global_rank: 47,
    rank_change: 4,
    results: [],
    ...over,
  },
})

beforeEach(() => { vi.stubGlobal('fetch', mockFetch(player())) })
afterEach(() => { vi.unstubAllGlobals() })

describe('api/player-season-og', () => {
  it('injects the player name, rank and points into the shell', async () => {
    const res = makeRes()
    await handler(makeReq('p1'), res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('Noa Levi')
    expect(res.body).toContain('#47')
    expect(res.body).toContain('421 points')
    expect(res.body).toContain(
      '<meta property="og:url" content="https://rallypadel.app/ranking/player/p1" />',
    )
  })

  it('prefers the plain avatar over the cut-out', async () => {
    // The cut-out is a transparent PNG meant to sit on the app's own background.
    // On a share card's arbitrary backdrop the plain photo reads better.
    const res = makeRes()
    await handler(makeReq('p1'), res)

    expect(res.body).toContain('https://cdn/noa.jpg')
    expect(res.body).not.toContain('noa-cutout')
  })

  it('describes an unranked player without printing a null rank', async () => {
    // A player with no counted results has points and no position yet. That is a
    // real state, and "#null" in a share card is the visible symptom of ignoring it.
    vi.stubGlobal('fetch', mockFetch(player({ global_rank: null })))
    const res = makeRes()
    await handler(makeReq('p1'), res)

    expect(res.body).toContain('421 points')
    expect(res.body).not.toContain('#null')
    expect(res.body).not.toContain('#undefined')
  })

  it('falls back to the untouched shell when the player is not found', async () => {
    vi.stubGlobal('fetch', mockFetch({}, false))
    const res = makeRes()
    await handler(makeReq('nope'), res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('<meta property="og:title" content="Rally" />')
  })

  it('falls back to the untouched shell when the API throws', async () => {
    // A share card is a nicety; a broken one must never take the page down with it.
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).endsWith('/index.html')) return ok(SHELL, true)
      throw new Error('network')
    }))
    const res = makeRes()
    await handler(makeReq('p1'), res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('<meta property="og:title" content="Rally" />')
  })

  it('serves the shell unchanged when no id is supplied', async () => {
    const res = makeRes()
    await handler(makeReq(''), res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('<meta property="og:title" content="Rally" />')
  })
})
