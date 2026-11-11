import type { VercelRequest, VercelResponse } from '@vercel/node'
// Relative imports need an explicit extension here: package.json sets
// "type": "module", so these run as ESM and Node's resolver throws
// ERR_MODULE_NOT_FOUND at load time otherwise, 500ing every request before
// the handler runs. api/_esm-imports.test.ts guards this.
import { getCorporateEvent } from '../src/constants/corporateEvents.js'
import { injectOg, absoluteUrl } from '../src/lib/og.js'

const API_BASE = (
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://localhost:8080'
).replace(/\/$/, '')

// A link preview must never hang on a slow API: past this the static registry answers instead.
const CONFIG_TIMEOUT_MS = 1500

/** The few fields of GET /public/corporate-events/{slug} the card needs (see rally-api schemas/corporate.py). */
interface PublicConfig {
  name?: string
  customer_name?: string
  club_name?: string
  start_at?: string | null
  end_at?: string | null
  landing_config?: {
    locale?: string
    components?: Array<{
      type: string
      enabled?: boolean
      title?: string
      image_url?: string | null
      date_label?: string
      time_label?: string
    }>
  }
}

/** The CRM-built event's config, or null for 404 / timeout / any failure (callers fall back). */
async function fetchConfig(slug: string): Promise<PublicConfig | null> {
  if (!slug) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS)
  try {
    const r = await fetch(`${API_BASE}/public/corporate-events/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    })
    if (!r.ok) return null
    const body = await r.json()
    const config = (body?.data ?? body) as PublicConfig | undefined
    return config?.name ? config : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const TZ = 'Asia/Jerusalem'

function dateText(config: PublicConfig): string {
  const details = config.landing_config?.components?.find((c) => c.type === 'details' && c.enabled)
  if (details?.date_label?.trim()) return details.date_label.trim()
  if (!config.start_at || Number.isNaN(new Date(config.start_at).getTime())) return ''
  const locale = config.landing_config?.locale === 'he' ? 'he-IL' : 'en-GB'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: TZ }).format(new Date(config.start_at))
}

function timeText(config: PublicConfig): string {
  const details = config.landing_config?.components?.find((c) => c.type === 'details' && c.enabled)
  if (details?.time_label?.trim()) return details.time_label.trim()
  if (!config.start_at || Number.isNaN(new Date(config.start_at).getTime())) return ''
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ }).format(new Date(iso))
  return config.end_at && !Number.isNaN(new Date(config.end_at).getTime())
    ? `${fmt(config.start_at)}–${fmt(config.end_at)}`
    : fmt(config.start_at)
}

/**
 * Server-rendered link preview for /join/:slug.
 *
 * These links are pasted into WhatsApp by the client's own staff, so the
 * unfurled card is the first thing an employee sees. Crawlers don't run JS,
 * and the SPA only sets its title client-side — without this they'd all get
 * the generic "Rally" marketing card instead of their own tournament.
 *
 * Humans still receive the normal SPA shell; only the head tags differ.
 *
 * Source order: the public API config (events built in the CRM, 1.5s timeout) -> the hardcoded
 * registry -> the bare shell.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = String(req.query.slug ?? '')
  const host = req.headers.host ?? 'rallypadel.app'
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const origin = `${proto}://${host}`

  const sendHtml = (html: string, cacheControl = 's-maxage=300, stale-while-revalidate=600') => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', cacheControl)
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

  // API first: an event built in the CRM wins over the hardcoded registry (the same precedence the
  // SPA's dispatcher uses). Anything but a clean 200 — 404, timeout, network — drops to the registry.
  const config = await fetchConfig(slug)
  if (config) {
    const heroComponent = config.landing_config?.components?.find((c) => c.type === 'hero')
    // Text follows the component's switch; the uploaded banner is used whenever there is one (the
    // page shows it the same way), and the shell's default card image stays when there is none.
    const hero = heroComponent?.enabled ? heroComponent : undefined
    const title = hero?.title?.trim() || config.name || ''
    const imageUrl = heroComponent?.image_url?.trim() || ''
    return sendHtml(
      injectOg(baseHtml, {
        title,
        description: [config.customer_name, dateText(config), timeText(config), config.club_name]
          .filter((part) => part && part.trim())
          .join(' · '),
        // No banner configured: leave the shell's default card image in place.
        image: imageUrl ? absoluteUrl(imageUrl, origin) : null,
        url: `${origin}/join/${slug}`,
        noindex: true,
      }),
      // The manager edits these any time; keep the unfurl fresher than a legacy entry's.
      's-maxage=60, stale-while-revalidate=300',
    )
  }

  const event = getCorporateEvent(slug)
  // Unknown slug: hand back the untouched shell and let the SPA render its
  // own "link not found" state. Nothing here should confirm or deny which
  // slugs exist beyond what the page already shows.
  if (!event) return sendHtml(baseHtml)

  // injectOg appends " · Rally", so the company goes in the description rather
  // than the title — otherwise the card reads "… · Samsung · Rally".
  // injectOg also flattens whitespace, so the newline that forces a heading
  // line break in tournamentName is handled there.
  return sendHtml(
    injectOg(baseHtml, {
      // A level category says which one in the card; every other entry's title is untouched.
      title: event.levelLabel
        ? `${event.tournamentName.replace(/\s+/g, ' ').trim()} · ${event.levelLabel}`
        : event.tournamentName,
      description: `${event.company} · ${event.dateLabel} · ${event.timeLabel} · ${event.clubName}`,
      // Unlike club/tournament banners, this one is served from public/ and is
      // root-relative — crawlers will not resolve that.
      image: absoluteUrl(event.heroImage, origin),
      url: `${origin}/join/${slug}`,
      // Belt-and-braces: the page also sets this client-side, but a crawler
      // that doesn't run JS would never see that one.
      noindex: true,
    }),
  )
}
