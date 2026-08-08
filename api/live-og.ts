import type { VercelRequest, VercelResponse } from '@vercel/node'
// package.json sets "type": "module", so this function runs as ESM on Vercel
// and Node's resolver demands an explicit extension on relative imports. The
// extensionless form crashes the module at load with ERR_MODULE_NOT_FOUND,
// taking down every /live/:token request before the handler runs.
import { injectOg, absoluteUrl } from '../src/lib/og.js'

const API_BASE = (
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://localhost:8080'
).replace(/\/$/, '')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = String(req.query.token ?? '')
  const host = req.headers.host ?? 'rallypadel.app'
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const origin = `${proto}://${host}`
  const baseHtmlUrl = `${origin}/index.html`

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

  if (!token) return sendHtml(baseHtml)

  try {
    // The share token in the path is the only access control — this endpoint takes
    // no auth header, so an anonymous server-side fetch is a 200.
    const r = await fetch(
      `${API_BASE}/public/tournaments/${encodeURIComponent(token)}/bracket`,
    )
    if (!r.ok) return sendHtml(baseHtml)
    const body = await r.json()
    const bracket = body?.data ?? body
    if (!bracket?.tournament_name) return sendHtml(baseHtml)
    return sendHtml(
      injectOg(baseHtml, {
        title: bracket.tournament_name,
        // An empty description renders as a blank line in the share card, so fall
        // back to the host club rather than shipping nothing.
        description: bracket.club_name || '',
        image: bracket.club_logo_url ? absoluteUrl(bracket.club_logo_url, origin) : null,
        url: `${origin}/live/${token}`,
        // A share token is an unlisted capability URL. Scrapers still unfurl the
        // card; this only keeps the link out of search results.
        noindex: true,
      }),
    )
  } catch {
    return sendHtml(baseHtml)
  }
}
