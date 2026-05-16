// src/lib/tournamentHelpers.ts — ported 1:1 from mobile (spec §7)
import type { PartnerSelectionState, RegisterPayload } from '@/types/api'

export function isRegistrationOpen(deadline: string | null | undefined): boolean {
  if (!deadline) return true
  const t = new Date(deadline).getTime()
  if (!Number.isFinite(t)) return true
  return t >= Date.now()
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

export function formatTournamentSkillRange(min: number, max: number): string {
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

export function buildPayload(
  format: string | null | undefined,
  state: PartnerSelectionState,
): RegisterPayload {
  if (format !== 'doubles' && format !== 'mixed') return { partner_type: 'none' }
  if (state.phase !== 'selected') return { partner_type: 'none' }
  const p = state.partner
  if (p.type === 'existing') {
    return { partner_type: 'existing', partner_player_id: p.id }
  }
  return {
    partner_type: 'invite',
    invite_first_name: p.firstName,
    invite_last_name: p.lastName,
    invite_country_code: p.countryCode,
    invite_phone: p.phone,
  }
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
