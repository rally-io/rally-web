import type { VercelRequest, VercelResponse } from '@vercel/node'
// Relative imports need an explicit extension here: package.json sets
// "type": "module", so these run as ESM and Node's resolver throws
// ERR_MODULE_NOT_FOUND at load time otherwise, 500ing every request before
// the handler runs. api/esm-imports.test.ts guards this.
import { getCorporateEvent } from '../src/constants/corporateEvents.js'
import { injectOg, absoluteUrl } from '../src/lib/og.js'

/**
 * Server-rendered link preview for /join/:slug.
 *
 * These links are pasted into WhatsApp by the client's own staff, so the
 * unfurled card is the first thing an employee sees. Crawlers don't run JS,
 * and the SPA only sets its title client-side — without this they'd all get
 * the generic "Rally" marketing card instead of their own tournament.
 *
 * Humans still receive the normal SPA shell; only the head tags differ.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = String(req.query.slug ?? '')
  const host = req.headers.host ?? 'rallypadel.app'
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const origin = `${proto}://${host}`

  const sendHtml = (html: string) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).send(html)
  }

  let baseHtml: string
  try {
    const shell = await fetch(`${origin}/index.html`)
    if (!shell.ok) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).send('<!doctype html><title>Rally</title>')
    }
    baseHtml = await shell.text()
  } catch {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send('<!doctype html><title>Rally</title>')
  }

  const event = getCorporateEvent(slug)
  // Unknown slug: hand back the untouched shell and let the SPA render its
  // own "link not found" state. Nothing here should confirm or deny which
  // slugs exist beyond what the page already shows.
  if (!event) return sendHtml(baseHtml)

  // The heading honours newlines in tournamentName; a title tag must not.
  const name = event.tournamentName.replace(/\s+/g, ' ').trim()

  return sendHtml(
    injectOg(baseHtml, {
      title: `${name} · ${event.company}`,
      description: `${event.dateLabel} · ${event.timeLabel} · ${event.clubName}`,
      image: absoluteUrl(event.heroImage, origin),
      url: `${origin}/join/${slug}`,
      // Belt-and-braces: the page also sets this client-side, but a crawler
      // that doesn't run JS would never see that one.
      noindex: true,
    }),
  )
}
