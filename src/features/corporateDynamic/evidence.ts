import { toApiFailure, uploadCorporateEvidence } from './api'

export type UploadOutcome = 'ok' | 'failed' | 'skipped'
/** `code` is rally-api's error code for a failure (INVALID_DOCUMENT…), so the card can say WHY. */
export interface UploadResult { outcome: UploadOutcome; code?: string }

/**
 * Uploads each participant's files independently with the registration token. A failure on one
 * participant — or on all of them — never throws and never blocks the flow: the registration is
 * already made, and the registered card offers a retry for whatever is still missing.
 */
export async function uploadAllEvidence(
  registrationId: string,
  token: string,
  files: Record<1 | 2, File[]>,
  slots: (1 | 2)[],
): Promise<Record<1 | 2, UploadResult>> {
  const results: Record<1 | 2, UploadResult> = { 1: { outcome: 'skipped' }, 2: { outcome: 'skipped' } }
  await Promise.all(
    slots.map(async (slot) => {
      if (files[slot].length === 0) return
      try {
        await uploadCorporateEvidence(registrationId, token, slot, files[slot])
        results[slot] = { outcome: 'ok' }
      } catch (error) {
        results[slot] = { outcome: 'failed', code: toApiFailure(error).code }
      }
    }),
  )
  return results
}
