// Marketing analytics: Meta Pixel (browser + Conversions API) and GA4.
//
// The pixel base code and the GA4 tag are loaded in index.html; this module
// is the only place that fires events. Every Meta event carries an eventID
// that is also sent to /api/meta-capi, so Events Manager deduplicates the
// browser and server copies of the same event.
//
// Page views: the base code fires the first PageView. Route changes inside the
// SPA are tracked by <RouteTracker/> (src/components/analytics/RouteTracker.tsx)
// calling `trackPageView`, because the pixel does not watch the history API.
// GA4 handles SPA navigation itself via Enhanced Measurement ("page changes
// based on browser history events"), so we do NOT send a second GA4 page_view
// here — doing so would double count.

import { getAttribution } from './attribution'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

export const META_PIXEL_ID = '1484965156419109'

function newEventId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

function readCookie(name: string): string | undefined {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : undefined
}

/**
 * Normalise an email the way Meta expects before hashing (lower-case, trimmed).
 * Returns undefined for anything that is not plausibly an address.
 */
export function normalizeEmail(email?: string): string | undefined {
  const v = email?.trim().toLowerCase()
  return v && v.includes('@') ? v : undefined
}

/**
 * Normalise a phone number to digits with country code and no leading zeros
 * or "+" (Meta's required format). Israeli local numbers (05x…, 0x…) get the
 * 972 prefix; anything already international is kept as-is.
 */
export function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined
  let digits = phone.replace(/\D/g, '')
  if (!digits) return undefined
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `972${digits.slice(1)}`
  else if (digits.length <= 9) digits = `972${digits}`
  return digits.length >= 10 ? digits : undefined
}

interface CapiUserData {
  em?: string
  ph?: string
}

/** Fire-and-forget copy of a Meta event to our Conversions API endpoint. */
function sendToCapi(
  eventName: string,
  eventId: string,
  customData?: Record<string, unknown>,
  userData?: CapiUserData,
) {
  try {
    const attribution = getAttribution()
    void fetch('/api/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        fbp: readCookie('_fbp'),
        fbc: readCookie('_fbc'),
        // Lets the server rebuild `fbc` when the pixel did not get to set the
        // cookie (ad blockers) but the visitor did arrive from a Meta ad.
        fbclid: attribution.fbclid,
        custom_data: customData,
        user_data: userData,
      }),
    })
  } catch {
    // Tracking must never break the page.
  }
}

/** SPA route change. The base code in index.html covers the first page. */
export function trackPageView() {
  try {
    window.fbq?.('track', 'PageView')
  } catch {
    /* ignore */
  }
}

export interface LeadDetails {
  /** Sub-type of the lead, e.g. the contact-form segment ("club", "coach"). */
  segment?: string
  /** Raw form values; normalised + hashed before they reach Meta. */
  email?: string
  phone?: string
}

/**
 * A visitor became a lead (waitlist / contact / coach application / updates
 * signup). Call it only after the lead was actually persisted — firing on
 * failed submits would train ad delivery on broken conversions.
 *
 * Email / phone (when the form has them) go to the CAPI relay, which hashes
 * them server-side as advanced-matching parameters — that is what lifts Event
 * Match Quality for a lead campaign. They are deliberately NOT passed to the
 * browser pixel: re-calling `fbq('init', id, {em, ph})` after the base code
 * silently stops every later event in the current fbevents.js (verified on a
 * preview deploy), so pixel-side matching is left to Events Manager's
 * "Automatic advanced matching" toggle instead.
 */
export function trackLead(source: string, details: LeadDetails = {}) {
  const eventId = newEventId()
  const em = normalizeEmail(details.email)
  const ph = normalizePhone(details.phone)
  const attribution = getAttribution()

  const pixelParams: Record<string, string> = { content_category: source }
  if (details.segment) pixelParams.content_name = details.segment

  try {
    window.fbq?.('track', 'Lead', pixelParams, { eventID: eventId })
  } catch {
    /* ignore */
  }
  try {
    window.gtag?.('event', 'generate_lead', {
      lead_source: source,
      lead_segment: details.segment,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
    })
  } catch {
    /* ignore */
  }
  sendToCapi('Lead', eventId, pixelParams, em || ph ? { em, ph } : undefined)
}

const STORE_LINK = /apps\.apple\.com|play\.google\.com|onelink\.me/

function storeOf(url: string): string {
  if (url.includes('apps.apple.com')) return 'app_store'
  if (url.includes('play.google.com')) return 'play_store'
  return 'onelink'
}

/** A visitor headed to the app stores (badge click, OneLink deep link, QR). */
export function trackDownload(store: string) {
  const eventId = newEventId()
  try {
    window.fbq?.('trackCustom', 'DownloadApp', { store }, { eventID: eventId })
  } catch {
    /* ignore */
  }
  try {
    window.gtag?.('event', 'download_app', { store })
  } catch {
    /* ignore */
  }
  sendToCapi('DownloadApp', eventId, { store })
}

/**
 * Track every click that leads to the app stores (badges, deep links, the
 * OneLink QR fallback) without having to instrument each anchor. Delegated on
 * `document` so links added later are covered too. The programmatic
 * `location.assign` path in `tryOpenInApp` calls `trackDownload` directly.
 */
export function initDownloadClickTracking() {
  document.addEventListener(
    'click',
    (e) => {
      const anchor = (e.target as Element | null)?.closest?.('a[href]')
      if (!(anchor instanceof HTMLAnchorElement) || !STORE_LINK.test(anchor.href)) return
      trackDownload(storeOf(anchor.href))
    },
    { capture: true },
  )
}
