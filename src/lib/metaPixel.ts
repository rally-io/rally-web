// Meta (Facebook) pixel events for the marketing site.
//
// The pixel itself is bootstrapped in index.html (fbq init + PageView).
// This helper is for standard events fired from React — most importantly
// `Lead` on the marketing forms, which Meta ad campaigns optimize against.
// Fire it only AFTER a lead was actually delivered (never on attempt), or
// campaign optimization learns from phantom conversions.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export function trackMetaLead(source: string) {
  // No-op when the pixel script is blocked (ad blockers) or not loaded (dev).
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  window.fbq('track', 'Lead', { content_name: source })
}
