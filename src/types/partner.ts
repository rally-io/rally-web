// Domain types for the doubles/mixed tournament partner-selection lifecycle.
// Mirrors rally-mobile's src/types/partner.ts so the register payload shape matches
// the shared rally-api contract exactly.

export interface ExistingPartner {
  type: 'existing'
  id: string
  displayName: string
  avatarUrl?: string | null
}

export interface InvitedPartner {
  type: 'invite'
  firstName: string
  lastName: string
  countryCode: string
  phone: string
}

export type SelectedPartner = ExistingPartner | InvitedPartner

export type PartnerSelectionState =
  | { phase: 'idle' }
  | { phase: 'selected'; partner: SelectedPartner }
