const RETURN_KEY = 'rally:auth-return'

export function safeReturnTo(value: string | null | undefined): string {
  // eslint-disable-next-line no-control-regex -- Reject URL control characters at the redirect trust boundary.
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20\x7f]/.test(value)) return '/'
  // Inspect encoded characters too; keep the original URL so query values are never decoded twice.
  let decoded: string
  try { decoded = decodeURIComponent(value) } catch { return '/' }
  // eslint-disable-next-line no-control-regex -- Encoded controls and backslashes must be rejected too.
  if (decoded.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(decoded)) return '/'
  const url = new URL(decoded, 'https://rally.invalid')
  if (url.origin !== 'https://rally.invalid' || /^\/(?:auth(?:\/|$)|login(?:\/|$)|set-password(?:\/|$))/i.test(url.pathname)) return '/'
  return value
}

export function getAuthReturnTo(): string {
  const query = new URLSearchParams(window.location.search)
  if (query.has('next')) return safeReturnTo(query.get('next'))
  try { return safeReturnTo(sessionStorage.getItem(RETURN_KEY)) } catch { return '/' }
}

export function rememberAuthReturnTo(next: string) {
  try { sessionStorage.setItem(RETURN_KEY, safeReturnTo(next)) } catch { /* Storage is optional. */ }
}

export function clearAuthReturnTo() {
  try { sessionStorage.removeItem(RETURN_KEY) } catch { /* Storage is optional. */ }
}

export function authPath(path: string, next: string, extras: Record<string, string> = {}) {
  return `${path}?${new URLSearchParams({ ...extras, next: safeReturnTo(next) })}`
}

// Supabase consumes the implicit-flow fragment during initialization, before React mounts.
// Capture it while modules load so a failed link cannot reuse an older session.
const initialAuthUrl = window.location.href
export function getAuthCallbackParams() {
  const current = new URL(window.location.href)
  const initial = new URL(initialAuthUrl)
  const url = current.pathname === initial.pathname && !current.hash ? initial : current
  const values = new URLSearchParams(url.search)
  new URLSearchParams(url.hash.slice(1)).forEach((value, key) => values.set(key, value))
  return values
}
