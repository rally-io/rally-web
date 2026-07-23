import type { VercelRequest, VercelResponse } from '@vercel/node'
import { injectClubOg } from '../src/lib/clubOg'

const API_BASE = (
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://localhost:8080'
).replace(/\/$/, '')

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

  if (!id) return sendHtml(baseHtml)

  try {
    const r = await fetch(`${API_BASE}/rally/v1/clubs/${encodeURIComponent(id)}`)
    if (!r.ok) return sendHtml(baseHtml)
    const body = await r.json()
    const club = body?.data
    if (!club?.name) return sendHtml(baseHtml)
    const image: string | null =
      (Array.isArray(club.images) && club.images[0]) || club.image_url || null
    return sendHtml(
      injectClubOg(baseHtml, {
        title: club.name,
        description: club.description ?? '',
        image,
        url: `${proto}://${host}/clubs/${id}`,
      }),
    )
  } catch {
    return sendHtml(baseHtml)
  }
}
