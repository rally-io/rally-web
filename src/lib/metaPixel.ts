// Meta Pixel helpers. The base pixel is loaded in index.html; this module
// wraps `window.fbq`, which is absent when the script is blocked (ad blockers,
// consent tools), so every call must degrade to a safe no-op.

const PIXEL_ID = '1484965156419109'

type Fbq = (...args: unknown[]) => void

function getFbq(): Fbq | null {
  const f = (window as Window & { fbq?: Fbq }).fbq
  return typeof f === 'function' ? f : null
}

// Advanced matching expects digits only; an Israeli local number needs its
// leading 0 replaced with the 972 country code before hashing.
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('0') ? `972${digits.slice(1)}` : digits
}

export interface LeadDetails {
  segment: string
  email?: string
  phone?: string
}

/**
 * Report a submitted lead to Meta. Re-inits the pixel with advanced-matching
 * fields (fbevents.js hashes them in the browser before sending), then fires
 * the standard `Lead` event. Returns the eventID so a future server-side
 * (Conversions API) event can deduplicate against this browser event, or
 * null when nothing was sent.
 */
export function trackLead({ segment, email, phone }: LeadDetails): string | null {
  // Ad campaigns optimize on Lead — keep dev-server submits out of the data.
  if (import.meta.env.DEV) return null

  const fbq = getFbq()
  if (!fbq) return null

  const match: Record<string, string> = {}
  if (email) match.em = email.trim().toLowerCase()
  if (phone) match.ph = normalizePhone(phone)
  if (Object.keys(match).length > 0) fbq('init', PIXEL_ID, match)

  const eventID = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  fbq('track', 'Lead', { content_category: segment }, { eventID })
  return eventID
}
