import type { VercelRequest, VercelResponse } from '@vercel/node'
// Relative imports need the .js extension: package.json sets "type": "module",
// so this runs as ESM on Vercel. api/_esm-imports.test.ts guards this.
import { injectOg, absoluteUrl } from '../src/lib/og.js'

/**
 * Server-rendered link preview for /elections ("בחירות 2026").
 *
 * The campaign spreads by WhatsApp and Instagram shares, and crawlers don't run
 * JS, so without this every shared link would unfurl as the generic Rally card.
 * Humans still receive the normal SPA shell; only the head tags differ.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = req.headers.host ?? 'rallypadel.app'
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const origin = `${proto}://${host}`

  let baseHtml: string
  try {
    const shell = await fetch(`${origin}/index.html`)
    if (!shell.ok) throw new Error(String(shell.status))
    baseHtml = await shell.text()
  } catch {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send('<!doctype html><title>Rally</title>')
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  return res.status(200).send(
    injectOg(baseHtml, {
      title: 'בחירות 2026: המועדון של ישראל',
      description:
        'בחרו את המועדון ואת רשת הפאדל הכי טובים בישראל. כל מי שמצביע נכנס להגרלה על מחבט Bullpadel.',
      image: absoluteUrl('/og-elections.jpg', origin),
      url: `${origin}/elections`,
    }),
  )
}
