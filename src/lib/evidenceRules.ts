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

/**
 * The `corporate.reg.*` key that tells a player WHY an evidence upload failed, from
 * rally-api's error code. A bare "upload failed" sent players back with the same file
 * (a phone photo the server refused as INVALID_DOCUMENT) to fail the same way again.
 */
export function evidenceFailureKey(code: string | null | undefined): string {
  switch (code) {
    case 'INVALID_DOCUMENT': return 'evidenceRejectedFormat'
    case 'IMAGE_TOO_LARGE': return 'evidenceRejectedSize'
    case 'EVIDENCE_LIMIT': return 'evidenceRejectedLimit'
    case 'FEE_WAIVER_NOT_PENDING': return 'evidenceClosed'
    default: return 'evidenceUploadFailed'
  }
}

/** rally-api's error code off a rejected API call (the axios client rejects with a
 *  plain `{ status, code, message }` object), or null for anything else. */
export function uploadErrorCode(error: unknown): string | null {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code : null
}

