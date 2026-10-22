/* What the partner finder remembers in this browser. Every function is best-effort and never
   throws: storage can be blocked (a private window, a full quota, a disabled site), and a
   failed read means "don't know", which each caller already handles. Ported from rally-mobile
   src/lib/partners/storage.ts, synchronous here because localStorage is. */

const PREFIX = 'rally:partners:'
const poolKey = (tournamentId: string): string => `${PREFIX}pool:${tournamentId}`
const WHATSAPP_NOTE_KEY = `${PREFIX}whatsapp-note-seen`
const SWIPE_HINT_KEY = `${PREFIX}swipe-hint-seen`

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // best effort
  }
}

/** Opening a pool is the only way to learn its id, and it answers POOL_CLOSED once the viewer
    registers. So the id is kept here, or their matches (and WhatsApp links) would become
    unreachable exactly when they are needed. */
export function rememberPoolId(tournamentId: string, poolId: string): void {
  write(poolKey(tournamentId), poolId)
}

export function recallPoolId(tournamentId: string): string | null {
  return read(poolKey(tournamentId))
}

/** The one-time "your partner can message you on WhatsApp" note. */
export function hasSeenWhatsAppNote(): boolean {
  return read(WHATSAPP_NOTE_KEY) === '1'
}

export function markWhatsAppNoteSeen(): void {
  write(WHATSAPP_NOTE_KEY, '1')
}

/** The one-time swipe hint: the first deck's top card leans to like, then to pass. */
export function hasSeenSwipeHint(): boolean {
  return read(SWIPE_HINT_KEY) === '1'
}

export function markSwipeHintSeen(): void {
  write(SWIPE_HINT_KEY, '1')
}
