import type { VercelRequest, VercelResponse } from '@vercel/node'
// package.json sets "type": "module", so this function runs as ESM on Vercel and
// Node's resolver demands an explicit extension on relative imports. The
// extensionless form crashes the module at load with ERR_MODULE_NOT_FOUND, taking
// down every request before the handler runs.
import { injectOg, absoluteUrl } from '../src/lib/og.js'

const API_BASE = (
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://localhost:8080'
).replace(/\/$/, '')

/**
 * Share card for /ranking/player/:id.
 *
 * This exists because rally-web is a plain Vite SPA with a single static set of OG
 * tags, and social crawlers do not execute JavaScript — anything React writes at
 * runtime is invisible to them. The player season page is the one page in this
 * feature whose whole purpose is being shared, so it is the one that needs this.
 *
 * Every failure path falls back to the unmodified shell rather than erroring: a
 * share card is a nicety, and a broken card must never take the page down with it.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id ?? '')
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

  if (!id) return sendHtml(baseHtml)

  try {
    // Public endpoint, no auth header — an anonymous server-side fetch is a 200.
    const r = await fetch(`${API_BASE}/public/league/player/${encodeURIComponent(id)}`)
    if (!r.ok) return sendHtml(baseHtml)
    const body = await r.json()
    const player = body?.data ?? body
    if (!player) return sendHtml(baseHtml)

    const name = [player.first_name, player.last_name].filter(Boolean).join(' ')
    if (!name) return sendHtml(baseHtml)

    // The rank is the interesting number, but it is genuinely nullable: a player
    // with no counted results has points and no position yet. Describe what is
    // true rather than printing "#null".
    const rank = typeof player.global_rank === 'number' ? player.global_rank : null
    const points = typeof player.points === 'number' ? player.points : 0
    const seasonName = player.season?.name ?? ''
    const description = rank
      ? `#${rank} · ${points} points${seasonName ? ` · ${seasonName}` : ''}`
      : `${points} points${seasonName ? ` · ${seasonName}` : ''}`

    // The cut-out avatar is a transparent PNG intended to sit on the app's own
    // background; on a share card's arbitrary backdrop the plain photo reads better.
    const image = player.avatar_url ? absoluteUrl(player.avatar_url, origin) : null

    return sendHtml(
      injectOg(baseHtml, {
        title: name,
        description,
        image,
        url: `${origin}/ranking/player/${id}`,
      }),
    )
  } catch {
    return sendHtml(baseHtml)
  }
}
