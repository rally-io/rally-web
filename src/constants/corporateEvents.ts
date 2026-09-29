import type { CorporateFeeWaiver } from './corporateFeeWaiver'
import type { TermsSection } from './eventTerms'
// `.js`, because api/join-og.ts imports this module and Vercel functions run as
// ESM, where Node's resolver throws ERR_MODULE_NOT_FOUND on an extensionless
// relative specifier — at module load, before the handler runs, so every
// /join/:slug page 500s. A type-only import is erased and needs no extension;
// this one is a value import. See api/esm-imports.test.ts.
import { ISRAEL_OPEN_TERMS } from './israelOpenTerms.js'
// Relative with `.js`, never the `@/` alias: api/join-og.ts imports this module and
// runs as native ESM, where Node resolves neither an alias nor a bare specifier.
import { tournamentLevelsBetween } from '../lib/skillTiers.js'

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
 * Adding the next client is this object plus a hero image (and, for a
 * tournament-mode event, the tournament's id). No new code.
 */
export interface CorporateEventBase {
  /** URL segment: /join/<slug>. The private link. */
  slug: string
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
  /**
   * The client's own artwork, served from `public/`. Optional: with no entry
   * here a tournament-mode page falls back to the banner the manager uploaded
   * in the CRM (`tournaments.image_url`), so a new event needs no asset in the
   * repo. Set it only to override that with supplied artwork.
   */
  heroImage?: string
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
  /**
   * The lock badge ("closed event") above the title. Omitted = shown, because
   * corporate events are employee-only by nature; set `false` for a page that
   * fronts a tournament anyone with the link may join.
   */
  closedBadge?: boolean
  /**
   * The "Hosted at <clubName>" line under the title. Omitted = shown; set `false`
   * when the location chip's address already names the club and the line only
   * repeats it. `clubName` stays required either way — the link preview, the
   * hero's alt text and the leads sheet all still read it.
   */
  hostedAtLine?: boolean
  /**
   * The Rally wordmark pinned over the artwork's top corner (top-right in Hebrew,
   * top-left in English). Omitted = pinned there; set `false` for artwork that
   * runs logos or copy into both top corners — the mark then sits above the
   * title instead, where the image-less header already puts it, and never
   * covers the client's artwork.
   */
  wordmarkOverHero?: boolean
  /**
   * A short pitch under the title, as the client wrote it. A blank line starts
   * a new paragraph; a single newline is only where the client's poster
   * wrapped, so it reflows as a space. The first paragraph reads as the lead,
   * the last as the call to action.
   */
  intro?: string
  /** Human-readable date, already in Hebrew. Not parsed — copy, not data. */
  dateLabel: string
  /** Human-readable time window, e.g. '17:00–21:00'. */
  timeLabel: string
}

/**
 * Lead mode: the form writes a row to the leads Google Sheet on a tab named
 * after `sheetSource`; staff turn it into registrations by hand afterwards.
 */
export interface CorporateLeadEvent extends CorporateEventBase {
  mode: 'lead'
  /** Google Sheet tab name. Must be `corporate_<a-z0-9_>` (api/lead.ts allow-list). */
  sheetSource: string
}

/**
 * Tournament mode: the page signs the employee in, writes their profile
 * essentials, registers a pair on the real tournament and hands off to the
 * Grow payment hold. The tournament must be `registration_open`; make it
 * `is_unlisted` so it stays out of every public list.
 */
export interface CorporateTournamentEvent extends CorporateEventBase {
  mode: 'tournament'
  /** rally-api tournament UUID — the row the registration lands on. */
  tournamentId: string
  /** Offered only when the tournament's `fee_waiver_type` (from the API)
   *  matches this entry's `feeWaiver.type` — the page never trusts the
   *  constant alone. */
  feeWaiver?: CorporateFeeWaiver
  /**
   * The organiser's published rulebook (תקנון), rendered collapsed at the foot
   * of the page. Omit it and the block does not render at all — a lead-mode
   * event has no rulebook, and a tournament without one is not an error.
   */
  terms?: TermsSection[]
  /**
   * The level categories a pair chooses between at registration (the rulebook's
   * "each pair marks its level"), e.g. "רמה 3.5–4". When set, the page shows a
   * REQUIRED dropdown and sends the label as `requested_level`; the manager places
   * pairs from it once registration closes. Omit it and nothing changes: no
   * dropdown, no field sent — rally-api treats the value as optional.
   */
  competeLevels?: string[]
  /**
   * Send the tournament's regular web page (/tournaments/<id>) here instead — for a
   * tournament listed publicly whose event page is the full way in (the residents'
   * waiver, its documents and the level choice exist only here; the regular page can
   * register only a plain entry). If rally-api also lists the tournament in
   * `EVENT_PAGE_ONLY_TOURNAMENTS` (app/services/tournaments/registration_channel.py),
   * every other registration is refused outright. Omit it and the regular page stays.
   */
  redirectFromTournamentPage?: boolean
}

export type CorporateEvent = CorporateLeadEvent | CorporateTournamentEvent

export const CORPORATE_EVENTS: Record<string, CorporateEvent> = {
  // Private link: /join/samsung-fold8
  'samsung-fold8': {
    mode: 'lead',
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
    heroImage: '/samsung-fold8-hero.jpeg',
    heroFit: 'contain',
    dateLabel: 'יום רביעי, 5 באוגוסט 2026',
    timeLabel: '18:00–22:00',
  },
  // A private tournament thrown for a couple getting married — same shape as a
  // corporate event, so `company` carries the couple rather than a client.
  'dani-shoval': {
    mode: 'lead',
    slug: 'dani-shoval',
    sheetSource: 'corporate_dani_shoval',
    company: 'Dani & Shoval',
    tournamentName: 'טורניר פאדל\nלכבוד החתונה',
    // No street address for this one — the venue name is what guests are given,
    // so it stands in for the address too. The location chip renders it as
    // plain text, so a name works there as well as an address would.
    clubName: 'בורג׳',
    clubAddress: 'בורג׳',
    // Generated padel-court-with-wedding-arch photo with the couple's names
    // composited in. The names are baked because api/join-og.ts serves this
    // file raw to link crawlers, with none of the page chrome that supplies
    // the title. The Rally mark is deliberately NOT baked in — the page pins
    // its own wordmark over the hero, and two of them read as duplicated.
    heroImage: '/dani-shoval-hero.jpeg',
    heroFit: 'contain',
    dateLabel: 'יום רביעי, 14 באוקטובר 2026',
    // Runs past midnight — the label is copy, so the range prints verbatim.
    timeLabel: '19:30–03:00',
  },
  // Israel Open at Padel Time Club, Holon (sponsored by the Holon municipality).
  // Copy taken from the client's first poster; the dates below come from the
  // official תקנון, which supersedes it.
  //
  // The tournament is `is_unlisted` + `registration_open` on prod, created
  // 2026-09-27: unlisted keeps it out of every public list, feed and
  // announcement, while registration_open is what lets a pair actually register
  // (`register_tournament` refuses any other status). The slug is the only way in.
  //
  // Renamed from `israel-open-2026` on 2026-09-28, after the link had already gone
  // out for feedback. vercel.json redirects the old path here permanently, so
  // those copies still land — keep that redirect for as long as the event runs.
  'holon-israel-open-2026': {
    mode: 'tournament',
    slug: 'holon-israel-open-2026',
    tournamentId: '7acb6027-33df-456a-8d3c-6ba4073b72ef',
    company: 'Padel Time Club',
    tournamentName: 'אליפות ישראל\nהפתוחה בפאדל',
    clubName: 'Padel Time Club · בחסות עיריית חולון',
    // As the club gave it, 2026-09-28 — the street address players navigate to,
    // with the country club it sits in.
    clubAddress: 'הלוחמים 30, פאדל טיים קלאב חולון (קאנטרי חולון)',
    feeWaiver: { type: 'holon_resident' },
    // Open to anyone with the link — no "closed event" badge.
    closedBadge: false,
    // The address chip already names the club; the owner dropped the line, 2026-09-28.
    hostedAtLine: false,
    // The club's 1200×630 banner (2026-09-28): the sponsor logos fill the top-right
    // corner and the residents' line the top-left, so neither can carry the mark.
    // 1.91:1 fills a phone edge to edge and is the size link previews expect.
    heroImage: '/holon-israel-open-2026-hero.jpg',
    heroFit: 'contain',
    wordmarkOverHero: false,
    // The club's copy, 2026-09-28. Spelling fixed (ביניהם, מקומכם) and the
    // punctuation tidied; the words are theirs.
    intro: [
      'בפאדל טיים קלאב חולון מתחילים במסורת חדשה!!',
      'אליפות ישראל הפתוחה בפאדל עם פרסים בשווי 80,000 ₪.',
      'ההרשמה יצאה לדרך, הזדמנות חד פעמית לכל הרמות להשתתפות באירוע ענק!',
      '',
      'הפרסים הכי שווים בענף, ביניהם הזוג הזוכה טס לשבוע אימונים באקדמיית M3 במדריד, מהטובות באירופה.',
      'המקומות מוגבלים בהחלט.',
      '',
      'תושבי חולון בחינם - ההרשמה פתוחה עכשיו, מהרו לתפוס את מקומכם.',
    ].join('\n'),
    // 21–23 October per the official תקנון (§1), which supersedes the 28–30 the
    // poster carried. 21–23 Oct 2026 is Wednesday to Friday.
    dateLabel: '21–23 באוקטובר 2026',
    // Parts of the day, not clock times (owner's call, 2026-09-28): the exact
    // slots depend on the draw, and §5.2 has each pair play two of the three days.
    // The club's working hours were Wed–Thu 16:00–00:00 and Fri 07:30–13:00.
    timeLabel: 'רביעי–חמישי אחר הצהריים\nשישי בבוקר',
    terms: ISRAEL_OPEN_TERMS,
    // Every tournament band from 2 to 5, written the way tournaments show their level
    // ("2.5 - 3.0 (D1 - C2)") — the owner's call, 2026-09-28. The poster's three
    // categories were a mock. Taken from the one tournament band list rather than
    // typed here, so it reads exactly like a tournament's level.
    competeLevels: tournamentLevelsBetween(2, 5),
    // Listed publicly from 2026-09-28. Web visitors land here for the full flow; the
    // app registers plain entries (no waiver, no level) and its banner and the
    // tournament description point residents to rallypadel.app/holon (vercel.json).
    redirectFromTournamentPage: false,
  },
}

export function getCorporateEvent(slug: string | undefined): CorporateEvent | null {
  if (!slug) return null
  return CORPORATE_EVENTS[slug] ?? null
}

/** The event page a tournament's regular web page hands over to, when its entry opted in. */
export function eventPagePathForTournament(tournamentId: string | undefined): string | null {
  if (!tournamentId) return null
  for (const event of Object.values(CORPORATE_EVENTS)) {
    if (event.mode === 'tournament' && event.redirectFromTournamentPage && event.tournamentId === tournamentId) {
      return `/join/${event.slug}`
    }
  }
  return null
}
