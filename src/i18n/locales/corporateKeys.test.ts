import { describe, it, expect } from 'vitest'
import he from './he.json'
import en from './en.json'

function flat(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [prefix]
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flat(v, prefix ? `${prefix}.${k}` : k),
  )
}

const REQUIRED_REG_KEYS = [
  'signInCta', 'signInWaiverHint', 'formTitle', 'firstName', 'lastName', 'phone', 'level', 'levelHint',
  'phoneLocked', 'levelLocked', 'levelEdit', 'levelEditNote', 'levelTournament',
  'partnerTitle', 'partnerRequiredHint', 'priceLabel', 'holdNote', 'submitCta', 'submitting',
  'registeredTitle', 'registeredPartner', 'registeredStatus_pending', 'registeredStatus_held',
  'registeredStatus_confirmed', 'completePayment', 'viewTournament', 'backToSite', 'notOpenTitle', 'notOpenBody', 'closedTitle',
  'closedBody', 'terminalBody', 'fullTitle', 'fullBody', 'profileSaveError', 'sessionError', 'retry',
  'errorRequired', 'errorPhone', 'errorLevel',
  // Residency fee waiver (residency-fee-waiver-web spec)
  'waiverTitle', 'waiverNone', 'waiverOne', 'waiverOneOfUs', 'waiverBoth', 'waiverHint', 'evidenceMine', 'evidenceResident', 'evidencePartner',
  'priceHalf', 'evidencePick', 'evidenceRemove', 'evidenceRequired', 'evidenceTooMany', 'evidenceBadFile', 'priceWaived',
  'registeredStatus_waiverPending', 'evidenceCount', 'addEvidence', 'evidenceUploadFailed',
  // Whole-branch review fixes (I1): truthful ₪0 copy
  'waiverNoChargeNote', 'submitCtaFree', 'freeNote',
  // Profile details modal
  'detailsTitle', 'detailsSubtitle', 'detailsSave', 'detailsSaving',
]

describe('corporate copy parity', () => {
  it('he and en carry the same corporate.* keys', () => {
    expect(new Set(flat((he as any).corporate))).toEqual(new Set(flat((en as any).corporate)))
  })
  it('every key the registration page reads exists in both', () => {
    for (const k of REQUIRED_REG_KEYS) {
      expect((he as any).corporate.reg?.[k], `he corporate.reg.${k}`).toBeTruthy()
      expect((en as any).corporate.reg?.[k], `en corporate.reg.${k}`).toBeTruthy()
    }
    for (const k of ['ownPhone', 'missingInviteDetails', 'feeWaiverUnavailable']) {
      expect((he as any).tournament.registrationErrors[k]).toBeTruthy()
      expect((en as any).tournament.registrationErrors[k]).toBeTruthy()
    }
    expect((he as any).payment.backToEvent).toBeTruthy()
    expect((en as any).payment.backToEvent).toBeTruthy()
  })
})
