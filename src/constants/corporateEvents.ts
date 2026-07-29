/**
 * Closed corporate tournaments — one entry per event.
 *
 * Each entry powers an unlisted landing page at /join/<slug>. There is no
 * index of these anywhere on the site: the slug IS the private link, so keep
 * slugs unguessable-ish and send them directly to the client.
 *
 * Signups land in the Google Sheet on a tab named after `sheetSource` (the
 * Apps Script creates the tab on first submission — see
 * docs/leads-google-sheet.md). `sheetSource` must match the
 * CORPORATE_SOURCE_PATTERN allow-list in api/lead.ts.
 *
 * Adding the next client is this object plus a hero image. No new code.
 */
export interface CorporateEvent {
  /** URL segment: /join/<slug>. The private link. */
  slug: string
  /** Google Sheet tab name. Must be `corporate_<a-z0-9_>`. */
  sheetSource: string
  /** Company name, shown in the page copy. */
  company: string
  /**
   * Tournament name. A newline forces a line break in the hero heading — use
   * it to stop a mixed Hebrew/Latin title from wrapping mid-product-name.
   * Newlines are flattened to spaces everywhere else (page title, sheet row).
   */
  tournamentName: string
  /** Hosting club, shown under the hero. */
  clubName: string
  /** Street address, shown as plain text (no map embed — keeps the page private). */
  clubAddress: string
  /** Hero image: a file in public/, or a full URL. */
  heroImage: string
  /**
   * How `heroImage` fills the hero band.
   *  - 'cover'   (default) crop to fill — right for a real photo of the courts.
   *  - 'contain' fit the whole image in, no crop — right for a logo card or
   *    any asset whose edges matter. A blurred copy of the same image fills
   *    the space around it, so 'contain' never leaves dead bars.
   * Both modes render the same blurred backdrop, so a small or oddly-shaped
   * asset still produces a full-bleed header.
   */
  heroFit?: 'cover' | 'contain'
  /** Human-readable date, already in Hebrew. Not parsed — copy, not data. */
  dateLabel: string
  /** Human-readable time window, e.g. '17:00–21:00'. */
  timeLabel: string
}

export const CORPORATE_EVENTS: Record<string, CorporateEvent> = {
  // Private link: /join/samsung-fold8
  'samsung-fold8': {
    slug: 'samsung-fold8',
    // → Google Sheet tab "corporate_samsung".
    sheetSource: 'corporate_samsung',
    company: 'Samsung',
    tournamentName: 'טורניר פאדל\nSamsung Galaxy Z Fold8',
    // Club + address taken from the `clubs` row "A Padel סביון |
    // weplay-venues/642-A" (read from the dev DB 2026-07-28) — worth an
    // eyeball before the link goes out.
    clubName: 'A.Padel סביון',
    clubAddress: 'קאנטרי קלאב סביון 1, סביון',
    // Samsung × A.Padel campaign banner supplied by the client. It's artwork
    // with type and two logos running to the edges, so it must not be cropped
    // — hence 'contain'. At 1600x500 (3.2:1) it is far wider than the hero
    // band, so 'cover' would eat both the Samsung wordmark and the club logo.
    heroImage: '/samsung-fold8-cover.jpeg',
    heroFit: 'contain',
    dateLabel: 'יום רביעי, 5 באוגוסט 2026',
    timeLabel: '18:00–22:00',
  },
}

export function getCorporateEvent(slug: string | undefined): CorporateEvent | null {
  if (!slug) return null
  return CORPORATE_EVENTS[slug] ?? null
}
