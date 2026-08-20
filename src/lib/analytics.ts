// Marketing analytics: Meta Pixel (browser + Conversions API) and GA4.
//
// The pixel base code and the GA4 tag are loaded in index.html; this module
// is the only place that fires events. Every Meta event carries an eventID
// that is also sent to /api/meta-capi, so Events Manager deduplicates the
// browser and server copies of the same event.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

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

/** Fire-and-forget copy of a Meta event to our Conversions API endpoint. */
function sendToCapi(eventName: string, eventId: string, customData?: Record<string, unknown>) {
  try {
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
        custom_data: customData,
      }),
    })
  } catch {
    // Tracking must never break the page.
  }
}

/**
 * A visitor became a lead (waitlist / contact / coach application / updates
 * signup). Call it only after the lead was actually persisted — firing on
 * failed submits would train ad delivery on broken conversions.
 */
export function trackLead(source: string) {
  const eventId = newEventId()
  try {
    window.fbq?.('track', 'Lead', { content_category: source }, { eventID: eventId })
  } catch {
    /* ignore */
  }
  try {
    window.gtag?.('event', 'generate_lead', { lead_source: source })
  } catch {
    /* ignore */
  }
  sendToCapi('Lead', eventId, { content_category: source })
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
