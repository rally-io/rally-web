import { findComponent, type PublicCorporateEvent } from './types'

/** The empty string for a blank/absent URL, so callers can test truthiness. */
const url = (v: string | null | undefined) => (typeof v === 'string' ? v.trim() : '')

export interface EventHeading {
  title: string
  subtitle: string
  /** The page banner (the event image). '' = none. */
  imageUrl: string
  /** The customer's logo. '' = none. */
  logoUrl: string
}

/**
 * What the page header shows, from the landing config's `hero` component. The title and subtitle
 * follow the component's `enabled` switch (off => the event's own name, no subtitle). The two
 * images do NOT: an uploaded banner or logo is shown whenever the config carries one, so a
 * manager who switched the text off does not lose the artwork they uploaded.
 */
export function headingFor(event: PublicCorporateEvent): EventHeading {
  const hero = findComponent(event.landing_config, 'hero')
  const on = Boolean(hero?.enabled)
  return {
    title: (on && hero?.title?.trim()) || event.name,
    subtitle: on ? (hero?.subtitle?.trim() ?? '') : '',
    imageUrl: url(hero?.image_url),
    logoUrl: url(hero?.company_logo_url),
  }
}

/** The page title: "<name> · <company>". */
export function pageTitleFor(event: PublicCorporateEvent): string {
  return `${headingFor(event).title.replace(/\s+/g, ' ').trim()} · ${event.customer_name}`
}

export interface DetailLabels {
  /** The manager's own date/time text, when the details component carries it. */
  date: string
  time: string
  venue: string
  /** The details component is on. Off hides the date and venue cards. */
  enabled: boolean
}

export function detailLabelsFor(event: PublicCorporateEvent): DetailLabels {
  const details = findComponent(event.landing_config, 'details')
  return {
    enabled: Boolean(details?.enabled),
    date: details?.date_label?.trim() ?? '',
    time: details?.time_label?.trim() ?? '',
    venue: details?.venue_label?.trim() ?? '',
  }
}
