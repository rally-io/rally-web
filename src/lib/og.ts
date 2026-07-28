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
  const fullTitle = `${escapeHtml(tags.title)} · Rally`
  // Descriptions come from free-text DB columns; a raw newline inside an
  // attribute value trips up some scrapers, so flatten to one line first.
  const desc = escapeHtml(tags.description.replace(/\s+/g, ' ').trim())
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

  return out
}
