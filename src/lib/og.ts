/**
 * Server-side OG/meta rewriting for the serverless functions under api/.
 *
 * The SPA sets document.title client-side, but link crawlers (WhatsApp,
 * Slack, iMessage, Facebook) do not run JavaScript — they read the HTML as
 * served. So any route that wants a bespoke link preview has to have its tags
 * rewritten before the shell goes out.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface OgTags {
  /** Used verbatim as <title> and og:title — callers add any suffix. */
  title: string
  description: string
  /** Must be absolute: crawlers do not resolve relative image URLs. */
  image: string | null
  url: string
  /** Adds robots noindex,nofollow. Does not affect link unfurling. */
  noindex?: boolean
}

/**
 * Replace an existing meta tag's content, matched on either `property=`
 * (Open Graph) or `name=` (Twitter, description, robots). No-op when the tag
 * is absent — use upsertMeta when it must exist.
 */
export function replaceMeta(
  html: string,
  key: string,
  content: string,
  attr: 'property' | 'name' = 'property',
): string {
  // \s+ spans newlines, so this matches index.html's multi-line meta blocks.
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*("\\s*/?>)`, 'i')
  return html.replace(re, `$1${content}$2`)
}

/** replaceMeta, but inserts the tag into <head> when it isn't already there. */
export function upsertMeta(
  html: string,
  key: string,
  content: string,
  attr: 'property' | 'name' = 'property',
): string {
  const next = replaceMeta(html, key, content, attr)
  if (next !== html) return next
  return html.replace(/<head>/i, `<head>\n    <meta ${attr}="${key}" content="${content}" />`)
}

/** Rewrite title + OG + Twitter tags on the built index.html shell. */
export function injectOg(html: string, tags: OgTags): string {
  const title = escapeHtml(tags.title)
  const desc = escapeHtml(tags.description)

  let out = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`)
  out = replaceMeta(out, 'description', desc, 'name')

  out = replaceMeta(out, 'og:title', title)
  out = replaceMeta(out, 'og:description', desc)
  out = replaceMeta(out, 'og:url', escapeHtml(tags.url))

  // Twitter's tags use name=, not property=, and fall back to OG only when
  // absent entirely — a stale twitter:title would otherwise win on X/Slack.
  out = replaceMeta(out, 'twitter:title', title, 'name')
  out = replaceMeta(out, 'twitter:description', desc, 'name')

  if (tags.image) {
    const image = escapeHtml(tags.image)
    out = replaceMeta(out, 'og:image', image)
    out = replaceMeta(out, 'twitter:image', image, 'name')
  }

  if (tags.noindex) {
    out = upsertMeta(out, 'robots', 'noindex, nofollow', 'name')
  }

  return out
}

/** Absolutise a possibly-root-relative asset path. Crawlers need absolute. */
export function absoluteUrl(pathOrUrl: string, origin: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${origin.replace(/\/$/, '')}/${pathOrUrl.replace(/^\//, '')}`
}
