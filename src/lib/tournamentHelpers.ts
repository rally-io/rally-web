// src/lib/tournamentHelpers.ts — ported 1:1 from mobile (spec §7)

export function isRegistrationOpen(deadline: string | null | undefined): boolean {
  if (!deadline) return true
  const t = new Date(deadline).getTime()
  if (!Number.isFinite(t)) return true
  return t >= Date.now()
}

export function getCountdown(
  target: string | null | undefined,
): { days: number; hours: number; expired: boolean } {
  if (!target) return { days: 0, hours: 0, expired: true }
  const t = new Date(target).getTime()
  if (!Number.isFinite(t)) return { days: 0, hours: 0, expired: true }
  const diff = t - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, expired: true }
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  return { days, hours, expired: false }
}

/** Statuses that end a tournament — a date window can't overrule them. */
const FINISHED_STATUSES = ['completed', 'cancelled', 'rejected']

/**
 * Is this tournament being played right now?
 *
 * The date window decides, with `status` as a veto only. Deliberately *not*
 * "status === in_progress ⇒ live": that status means a bracket was published,
 * which a club often does the night before, and it is never cleared if nobody
 * marks the tournament completed — so trusting it alone would badge a
 * not-yet-started tournament as LIVE, and keep badging one that finished
 * months ago. A window that has closed fails loudly (badge disappears);
 * a status that was never updated fails silently forever.
 *
 * Both fields are feature-detected: an API build that omits `status` still
 * gets correct date-based behaviour.
 */
export function isTournamentLive(tr: {
  start_date: string
  end_date: string
  status?: string | null
}): boolean {
  if (tr.status && FINISHED_STATUSES.includes(tr.status)) return false
  const start = parseFlexibleDate(tr.start_date ?? '').getTime()
  const end = parseFlexibleDate(tr.end_date ?? '').getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false
  const now = Date.now()
  return start <= now && now <= end
}

/**
 * Is this tournament over?
 *
 * The past listing (`scope=past`) still returns tournaments that are being
 * played, because rally-web asks for `include_live: true` — so every "history"
 * surface has to draw the line itself, on the end date, the same way the live
 * badge does.
 */
export function isPastTournament(tr: { end_date: string }): boolean {
  const end = new Date(tr.end_date).getTime()
  if (!Number.isFinite(end)) return false
  return end < Date.now()
}

/**
 * Fill ratio at which a tournament's registration count becomes social proof
 * rather than a discouragement.
 *
 * The house rule is "no scarcity signals" — no seats-left numbers, no
 * fillness bars — because the goal is maximum registrations. A raw count
 * cuts both ways: "20 of 24 pairs are in" pulls people in, "0 pairs are in"
 * pushes them away, and three of the seven live tournaments were at zero the
 * day this was written. So the count is shown only once it flatters.
 */
export const SOCIAL_PROOF_FILL_RATIO = 0.5

/**
 * The confirmed count to advertise on a card, or null to stay quiet.
 *
 * Counts *pairs/teams* for a doubles draw, not individuals — `max_participants`
 * is a cap on registrations, and the API rejects lowering it below "N pairs
 * are already confirmed". Copy must match that unit.
 */
export function socialProofCount(tr: {
  confirmed_registrations?: number | null
  max_participants?: number | null
}): number | null {
  const confirmed = tr.confirmed_registrations ?? 0
  const cap = tr.max_participants ?? 0
  // A count without its cap is not interpretable, so an API build that sends
  // neither (or a tournament with no cap) shows nothing at all.
  if (cap <= 0 || confirmed <= 0) return null
  return confirmed / cap >= SOCIAL_PROOF_FILL_RATIO ? confirmed : null
}

/** Under this many free seats, "last spots" is true rather than decorative. */
export const LAST_SPOTS_THRESHOLD = 3

/**
 * Is the "last spots" badge honest right now?
 *
 * Deliberately *not* "registration is open", which is what the card used to
 * ask: that badged every open tournament as nearly full regardless of seats.
 * Zero seats means full, not nearly full, so it fails too.
 */
export function isLastSpots(availableSeats: number | null | undefined): boolean {
  return (
    typeof availableSeats === 'number' &&
    availableSeats > 0 &&
    availableSeats < LAST_SPOTS_THRESHOLD
  )
}

/**
 * Path to the public live-results screen. Mirrors the CRM's
 * `buildLiveResultsUrl()`, which shares `<site>/live/<token>` links with
 * players — keep the two in step.
 */
export function liveResultsPath(shareToken: string): string {
  return `/live/${shareToken}`
}

export function parseSkillLevel(
  str: string | null | undefined,
): { range: string | null; level: string | null } {
  if (!str) return { range: null, level: null }
  const m = str.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (m) return { range: m[1].trim() || null, level: m[2].trim() || null }
  if (/-/.test(str) && /\d/.test(str)) return { range: str.trim(), level: null }
  return { range: null, level: str.trim() }
}

export function formatTournamentSkillRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min == null || max == null) return ''
  const lo = min.toFixed(1)
  const hi = max.toFixed(1)
  if (lo === hi) return lo
  return `‎${hi} - ${lo}‎`
}

export function getSkillLevelName(
  min: number, max: number, t?: (key: string) => string,
): string {
  if (!min && !max) return t ? t('tournament.skillLevelAll') : 'All Levels'
  const avg = (min + max) / 2
  const key =
    avg < 2.5 ? 'tournament.skillLevelBeginner'
    : avg < 4.0 ? 'tournament.skillLevelIntermediate'
    : avg < 5.5 ? 'tournament.skillLevelAdvanced'
    : 'tournament.skillLevelPro'
  return t ? t(key) : key
}

function parseFlexibleDate(value: string): Date {
  let s = value.trim()
  if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T')
  const d = new Date(s)
  if (Number.isFinite(d.getTime())) return d
  const m = value.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/)
  if (m) {
    return new Date(
      Number(m[1]), Number(m[2]) - 1, Number(m[3]),
      m[4] ? Number(m[4]) : 0, m[5] ? Number(m[5]) : 0,
    )
  }
  return d
}

export function formatTournamentDateRange(
  start: string, end: string, locale: 'he-IL' | 'en-US',
): string {
  const s = parseFlexibleDate(start)
  const e = parseFlexibleDate(end)
  if (!Number.isFinite(s.getTime())) return ''
  const isHe = locale === 'he-IL'
  const dayFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
  const yearFmt = new Intl.DateTimeFormat(locale, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const yearFmtLong = new Intl.DateTimeFormat(locale, {
    month: 'long', day: 'numeric', year: 'numeric',
  })
  const hasTime = s.getHours() !== 0 || s.getMinutes() !== 0
  const timeStr = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  if (!Number.isFinite(e.getTime())) return yearFmt.format(s)

  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate()
  if (sameDay) {
    const base = yearFmtLong.format(s)
    if (!hasTime) return base
    const times = isHe
      ? `${timeStr(e)} - ${timeStr(s)}`
      : `${timeStr(s)} - ${timeStr(e)}`
    return `${base}, ${times}`
  }

  const left = isHe ? yearFmt.format(e) : dayFmt.format(s)
  const right = isHe ? dayFmt.format(s) : yearFmt.format(e)
  return `${left} - ${right}`
}

export function formatTournamentCardDate(
  start: string,
  end: string,
  locale: 'he-IL' | 'en-US',
  withTime: boolean = false,
): string {
  const s = parseFlexibleDate(start)
  const e = parseFlexibleDate(end)
  if (!Number.isFinite(s.getTime())) return ''

  const hasEnd = Number.isFinite(e.getTime())
  const sameDay =
    hasEnd &&
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate()

  if (sameDay || !hasEnd) {
    const dateStr = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(s)
    if (withTime) {
      const hh = String(s.getHours()).padStart(2, '0')
      const mm = String(s.getMinutes()).padStart(2, '0')
      return `${dateStr} · ${hh}:${mm}`
    }
    return dateStr
  }

  const dayFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
  const isHe = locale === 'he-IL'
  const left = isHe ? dayFmt.format(e) : dayFmt.format(s)
  const right = isHe ? dayFmt.format(s) : dayFmt.format(e)
  return `${left} – ${right}`
}

export function formatCurrency(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n == null || !Number.isFinite(n)) return '₪0'
  return `₪${n}`
}

export function registrationSummaryKey(
  deadline: string | null | undefined,
): { key: string; params?: Record<string, unknown> } {
  if (!deadline) return { key: 'tournament.tournamentDetailRegistrationClosed' }
  const t = new Date(deadline).getTime()
  if (!Number.isFinite(t)) {
    return { key: 'tournament.tournamentDetailRegistrationClosed' }
  }
  const days = Math.ceil((t - Date.now()) / 86_400_000)
  if (days < 0) return { key: 'tournament.tournamentDetailRegistrationClosed' }
  if (days <= 0) return { key: 'tournament.tournamentDetailRegistrationEndsToday' }
  if (days === 1) return { key: 'tournament.tournamentDetailRegistrationEndsInOneDay' }
  if (days <= 10) {
    return {
      key: 'tournament.tournamentDetailRegistrationEndsInDays',
      params: { count: days },
    }
  }
  return { key: 'tournament.tournamentDetailRegistrationEndsOn' }
}
