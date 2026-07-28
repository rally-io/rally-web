import { escapeHtml, injectOg } from './og'

// Re-exported for existing callers/tests that import it from here.
export { escapeHtml }

export interface ClubOg {
  title: string
  description: string
  image: string | null
  url: string
}

/** Rewrite the document's title + OG tags for a specific club. */
export function injectClubOg(html: string, club: ClubOg): string {
  return injectOg(html, {
    title: `${club.title} · Rally`,
    description: club.description,
    image: club.image,
    url: club.url,
  })
}
