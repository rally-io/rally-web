// Single source of truth for the mobile app store links + badge art.
export const APP_STORE_URL = 'https://apps.apple.com/il/app/rally/id6762743900'
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=app.rallypadel&pli=1'
export const APP_STORE_BADGE =
  'https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg'
export const PLAY_STORE_BADGE =
  'https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg'

/**
 * AppsFlyer OneLink template that opens the mobile app. Override per-env via
 * `VITE_ONELINK_URL`; defaults to the production template.
 */
const ONELINK_BASE = (
  (import.meta.env.VITE_ONELINK_URL as string | undefined) ??
  'https://rallypadel.onelink.me/pwv0'
).replace(/\/$/, '')

/**
 * Build an AppsFlyer OneLink that opens the mobile app on a given in-app
 * route — deep-linked to `inAppPath` if the app is installed, or the
 * App/Play Store if not.
 *
 * Mirrors rally-crm `buildAppDeepLink` and the generic `route` deep link the
 * app reads (rally-mobile `ReferralService`: `deep_link_value='route'` +
 * `deep_link_sub1=<path>`). `pid=website` so attribution separates website
 * CTAs from CRM WhatsApp shares.
 *
 * @param inAppPath Absolute in-app path, e.g. `/tournaments/<id>`.
 */
export function buildAppDeepLink(inAppPath: string): string {
  const params = new URLSearchParams({
    pid: 'website',
    deep_link_value: 'route',
    deep_link_sub1: inAppPath,
    af_force_deeplink: 'true',
  })
  return `${ONELINK_BASE}?${params.toString()}`
}

/** Deep links are only useful on the device that runs the app. */
export function isMobileDevice(): boolean {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

/**
 * On mobile, navigate straight to the OneLink (app opens the entity, or the
 * store if not installed) and return true. On desktop return false so the
 * caller can fall back to the app-download modal.
 */
export function tryOpenInApp(inAppPath: string): boolean {
  if (!isMobileDevice()) return false
  window.location.assign(buildAppDeepLink(inAppPath))
  return true
}
