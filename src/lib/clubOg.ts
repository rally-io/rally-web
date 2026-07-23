export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface ClubOg {
  title: string
  description: string
  image: string | null
  url: string
}

function replaceMeta(html: string, property: string, content: string): string {
  const re = new RegExp(
    `(<meta\\s+property="${property}"\\s+content=")[^"]*("\\s*/?>)`,
    'i',
  )
  return html.replace(re, `$1${content}$2`)
}

/** Rewrite the document's title + OG tags for a specific club. */
export function injectClubOg(html: string, club: ClubOg): string {
  const fullTitle = `${escapeHtml(club.title)} · Rally`
  const desc = escapeHtml(club.description)
  let out = html.replace(/<title>[^<]*<\/title>/i, `<title>${fullTitle}</title>`)
  out = replaceMeta(out, 'og:title', fullTitle)
  out = replaceMeta(out, 'og:description', desc)
  out = replaceMeta(out, 'og:url', escapeHtml(club.url))
  if (club.image) out = replaceMeta(out, 'og:image', escapeHtml(club.image))
  return out
}
