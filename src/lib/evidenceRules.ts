export const EVIDENCE_MAX_FILES = 2
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024
export const EVIDENCE_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'
const ALLOWED = new Set(EVIDENCE_ACCEPT.split(','))

export type EvidenceError = 'evidenceTooMany' | 'evidenceBadFile'

export function validateEvidenceFiles(existing: File[], incoming: File[]): EvidenceError | null {
  if (existing.length + incoming.length > EVIDENCE_MAX_FILES) return 'evidenceTooMany'
  for (const f of incoming) if (!ALLOWED.has(f.type) || f.size > EVIDENCE_MAX_BYTES) return 'evidenceBadFile'
  return null
}

/** Pair price after removing the residents' share; seats = 1 (singles) or 2. */
/**
 * The waiver is offered only when the event entry AND the loaded tournament
 * agree on the type — the constant alone never opens it. One rule, because the
 * signed-out card and the registration form must never disagree about whether a
 * resident plays free.
 */
export function isWaiverOffered(
  feeWaiver: { type: string } | undefined,
  tournamentWaiverType: string | null | undefined,
): boolean {
  return !!feeWaiver && tournamentWaiverType === feeWaiver.type
}

export function waivedAmount(entryFee: number, seats: 1 | 2, residents: 0 | 1 | 2): number {
  const r = Math.min(residents, seats)
  return Math.round((entryFee * (seats - r) / seats) * 100) / 100
}
