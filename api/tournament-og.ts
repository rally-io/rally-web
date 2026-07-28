import type { VercelRequest, VercelResponse } from '@vercel/node'
// package.json sets "type": "module", so this function runs as ESM on Vercel
// and Node's resolver demands an explicit extension on relative imports. The
// extensionless form crashes the module at load with ERR_MODULE_NOT_FOUND,
// taking down every /tournaments/:id request before the handler runs.
import { injectOg } from '../src/lib/og.js'

const API_BASE = (
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://localhost:8080'
).replace(/\/$/, '')

// /tournaments/:id shares its prefix with a static sibling route, and Vercel's
// :id matches that segment too. Serving the plain shell for it skips a lookup
// that can never succeed — the SPA router takes it from there either way.
const NON_ID_SEGMENTS = new Set(['summary'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id ?? '')
  const host = req.headers.host ?? 'rallypadel.app'
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const baseHtmlUrl = `${proto}://${host}/index.html`

  const sendHtml = (html: string) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).send(html)
  }

  const sendFallback = () => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).send('<!doctype html><title>Rally</title>')
  }

  let baseHtml: string
  try {
    const shell = await fetch(baseHtmlUrl)
    if (!shell.ok) {
      sendFallback()
      return
    }
    baseHtml = await shell.text()
  } catch {
    sendFallback()
    return
  }

  if (!id || NON_ID_SEGMENTS.has(id)) return sendHtml(baseHtml)

  try {
    // GET /rally/v1/tournaments/{id} takes optional auth (rally-api's
    // get_optional_user_id never raises), so an anonymous fetch is a 200.
    const r = await fetch(`${API_BASE}/rally/v1/tournaments/${encodeURIComponent(id)}`)
    if (!r.ok) return sendHtml(baseHtml)
    const body = await r.json()
    const tournament = body?.data
    if (!tournament?.name) return sendHtml(baseHtml)
    return sendHtml(
      injectOg(baseHtml, {
        title: tournament.name,
        // An empty description renders as a blank line in the share card, so
        // fall back to the host club rather than shipping nothing.
        description: tournament.description || tournament.club_name || '',
        image: tournament.image_url ?? tournament.thumb_url ?? null,
        url: `${proto}://${host}/tournaments/${id}`,
      }),
    )
  } catch {
    return sendHtml(baseHtml)
  }
}
