/**
 * Server-side OG/meta rewriting for the serverless functions under api/.
 *
 * The SPA sets document.title client-side, but link crawlers (WhatsApp, Slack,
 * iMessage, Facebook) do not run JavaScript — they read the HTML as served. So
 * any route wanting a bespoke link preview must have its head tags rewritten
 * before the shell goes out.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface OgTags {
  title: string
  description: string
  image: string | null
  url: string
  /**
   * Adds robots noindex,nofollow. For unlisted pages whose links get forwarded
   * around but should never surface in search. Does not affect link unfurling —
   * scrapers still render the card.
   */
  noindex?: boolean
}

/**
 * Rewrite one <meta> tag's content. Matches both the `property="og:*"` and
 * `name="twitter:*"` spellings, and tolerates the attribute pair being split
 * across lines (index.html wraps the long description tags).
 *
 * The replacement is a function, not a template string: `String.replace` treats
 * `$&`, `$1` and friends as backreferences inside a string replacement, so a
 * title like "Win $500" would otherwise inject the matched tag back into itself.
 */
function replaceMeta(html: string, key: string, content: string): string {
  const re = new RegExp(
    `(<meta\\s+(?:property|name)="${key}"\\s+content=")[^"]*("\\s*/?>)`,
    'i',
  )
  return html.replace(re, (_match, open: string, close: string) => open + content + close)
}

/** replaceMeta, but inserts a `name=` tag into <head> when it isn't there. */
function upsertNamedMeta(html: string, key: string, content: string): string {
  const next = replaceMeta(html, key, content)
  if (next !== html) return next
  return html.replace(/<head>/i, (head) => `${head}\n    <meta name="${key}" content="${content}" />`)
}

/**
 * The shell hardcodes og:image:width/height for the 1200x630 default card. A
 * club photo or tournament banner is any aspect ratio, and advertising the
 * wrong dimensions makes scrapers crop or drop the image — so remove the tags
 * whenever the default image is replaced with a real one.
 */
function dropImageDimensions(html: string): string {
  return html.replace(
    /\n?[ \t]*<meta\s+property="og:image:(?:width|height)"\s+content="[^"]*"\s*\/?>/gi,
    '',
  )
}

/** Rewrite the document title + OG/Twitter tags for a specific entity. */
export function injectOg(html: string, tags: OgTags): string {
  // Titles and descriptions alike come from free-text sources — DB columns, or
  // a config value carrying a newline to force a heading line break. A raw
  // newline inside an attribute value trips up some scrapers, so flatten both.
  const flatten = (s: string) => escapeHtml(s.replace(/\s+/g, ' ').trim())
  const fullTitle = `${flatten(tags.title)} · Rally`
  const desc = flatten(tags.description)
  const url = escapeHtml(tags.url)

  let out = html.replace(/<title>[^<]*<\/title>/i, () => `<title>${fullTitle}</title>`)
  out = replaceMeta(out, 'og:title', fullTitle)
  out = replaceMeta(out, 'og:description', desc)
  out = replaceMeta(out, 'og:url', url)
  out = replaceMeta(out, 'twitter:title', fullTitle)
  out = replaceMeta(out, 'twitter:description', desc)

  if (tags.image) {
    const image = escapeHtml(tags.image)
    out = replaceMeta(out, 'og:image', image)
    out = replaceMeta(out, 'twitter:image', image)
    out = dropImageDimensions(out)
  }

  if (tags.noindex) {
    out = upsertNamedMeta(out, 'robots', 'noindex, nofollow')
  }

  return out
}

/**
 * Absolutise a possibly root-relative asset path. Club and tournament images
 * arrive as absolute Supabase/CDN URLs, but assets served from public/ do not,
 * and crawlers do not resolve relative image URLs.
 */
export function absoluteUrl(pathOrUrl: string, origin: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${origin.replace(/\/$/, '')}/${pathOrUrl.replace(/^\//, '')}`
}
