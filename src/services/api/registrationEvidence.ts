// src/services/api/registrationEvidence.ts
import client from './client'
import type { ApiResponse, EvidenceItem } from '@/types/api'

interface EvidenceListResponse {
  items: EvidenceItem[]
}

// The shared client's response interceptor only rejects on a non-2xx status
// (see client.ts) — a failure that comes back as HTTP 200 `{ success: false,
// error }` (this endpoint's upload failure shape) resolves normally and must
// be checked here, the same way auth.ts's checkEmailExists/verifyPhoneOtp do.
function unwrap(result: ApiResponse<EvidenceListResponse>): EvidenceItem[] {
  if (!result.success) throw result.error
  return result.data.items
}

/**
 * Uploads proof-of-residency files for one declared resident on a
 * registration. Multipart POST: the shared client defaults to a JSON
 * Content-Type, so this call clears it so the browser sets its own
 * multipart boundary.
 *
 * Resolves with only the rows this call created (not the registration's full
 * evidence set) — see `listRegistrationEvidence` for that.
 */
export async function uploadRegistrationEvidence(
  registrationId: string,
  forPlayer: 1 | 2,
  files: File[],
): Promise<EvidenceItem[]> {
  const formData = new FormData()
  for (const file of files) formData.append('files', file)
  formData.append('for_player', String(forPlayer))

  const result = (await client.post(
    `/rally/v1/tournaments/registrations/${registrationId}/evidence`,
    formData,
    { headers: { 'Content-Type': undefined } },
  )) as ApiResponse<EvidenceListResponse>

  return unwrap(result)
}

/** The full live set of evidence for a registration, across both players. */
export async function listRegistrationEvidence(registrationId: string): Promise<EvidenceItem[]> {
  const result = (await client.get(
    `/rally/v1/tournaments/registrations/${registrationId}/evidence`,
  )) as ApiResponse<EvidenceListResponse>

  return unwrap(result)
}
