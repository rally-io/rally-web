import type { TFunction } from 'i18next'
import type { PartnerReason } from '@/types/partnerPool'

/* Ported from rally-mobile src/lib/partners/reasons.ts; logic unchanged. */

/** The API sends at most 3; the card never shows more even if that changes. */
export const MAX_REASONS = 3

/** The court sides the copy knows (`partners.side.*`). PartnerCard reads it too, so a side
    this build does not know draws no side at all. */
export const COURT_SIDES: ReadonlySet<string> = new Set(['left_side', 'right_side', 'both_sides'])
/** The availability slots the copy knows (`partners.slot.*`). */
export const SLOTS: ReadonlySet<string> = new Set(['morning', 'afternoon', 'evening', 'all_day', 'specific_hours'])

const countOf = (params: PartnerReason['params']): number => Number(params.count ?? 0)

/** One "Why you two" line, or null for a code (or a param value) this build does not know.
    Reasons arrive as codes, never as server-built English. */
export function formatReason(t: TFunction, reason: PartnerReason): string | null {
  const params = reason.params ?? {}
  switch (reason.code) {
    case 'played_together':
      return t(params.role === 'opponent' ? 'partners.reason.playedAgainst' : 'partners.reason.playedWith', {
        count: countOf(params),
      })
    case 'mutual_partners':
      return t('partners.reason.mutualPartners', { count: countOf(params) })
    case 'shared_tournaments':
      return t('partners.reason.sharedTournaments', { count: countOf(params) })
    case 'court_side_fit': {
      const mine = String(params.mine)
      const theirs = String(params.theirs)
      if (!COURT_SIDES.has(mine) || !COURT_SIDES.has(theirs)) return null
      return t('partners.reason.courtSideFit', {
        mine: t(`partners.side.${mine}`),
        theirs: t(`partners.side.${theirs}`),
      })
    }
    case 'availability': {
      // The day is ignored on purpose: the app saves the same slots for all seven days.
      const slot = String(params.slot)
      if (!SLOTS.has(slot)) return null
      return t('partners.reason.availability', { slot: t(`partners.slot.${slot}`) })
    }
    case 'similar_level':
      return t('partners.reason.similarLevel')
    default:
      return null
  }
}

export function formatReasons(t: TFunction, reasons: PartnerReason[]): string[] {
  return reasons
    .map((reason) => formatReason(t, reason))
    .filter((line): line is string => line !== null)
    .slice(0, MAX_REASONS)
}
