// src/lib/tournamentTheme.ts — spec §2 status colors, §3 label keys

export type RallyStatusColor = 'success' | 'accent' | 'error' | 'info' | 'muted'

export function statusColor(status: string | null | undefined): RallyStatusColor {
  switch (status) {
    // 'registered' groups with the other "nothing left to do" states — a card
    // showing it means the registration is in hand, only payment_pending
    // still needs a card added (see needsPayment in TournamentCard).
    case 'confirmed':
    case 'approved':
    case 'registered':
      return 'success'
    case 'payment_pending':
      return 'accent'
    case 'withdrawn':
    case 'cancelled':
    case 'rejected':
    case 'disqualified':
      return 'error'
    default:
      return 'muted'
  }
}

/** Tailwind bg + text classes for a status badge background. */
export const STATUS_BG: Record<RallyStatusColor, string> = {
  success: 'bg-rally-success text-black',
  accent: 'bg-rally-accent text-black',
  error: 'bg-rally-error text-white',
  info: 'bg-rally-info text-white',
  muted: 'bg-rally-text-muted text-white',
}

export function formatLabelKey(format: string | null | undefined): string {
  if (format === 'doubles') return 'tournament.tournamentFormatDoubles'
  if (format === 'mixed') return 'tournament.tournamentFormatMixed'
  return 'tournament.tournamentFormatSingles'
}

export function structureLabelKey(structure: string | null | undefined): string {
  switch (structure) {
    case 'group_then_knockout':
      return 'tournament.tournamentStructureGroupThenKnockout'
    case 'round_robin_league':
      return 'tournament.tournamentStructureRoundRobinLeague'
    default:
      return 'tournament.tournamentStructureSingleElimination'
  }
}

export function needsPartner(format: string | null | undefined): boolean {
  return format === 'doubles' || format === 'mixed'
}
