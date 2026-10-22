/**
 * What decides whether the tournament page offers **Find a partner**. Ported from
 * rally-mobile `src/screens/tournament-details/showFindPartner.ts`, so the web
 * shows the row exactly when the app does. The row opens the web's own swipe deck
 * (`PartnerDeckPage`), at the same path as the app's.
 */
export interface FindPartnerFacts {
  /** From the API. Undefined on an API before the feature, which means no. */
  partnerSearchAvailable: boolean | undefined
  format: string
  registrationOpen: boolean
  hasRegistration: boolean
  hasWaitlistEntry: boolean
  /** A partner is already picked in the partner section: nothing left to find. */
  partnerPicked: boolean
}

export function showFindPartner(facts: FindPartnerFacts): boolean {
  return (
    facts.partnerSearchAvailable === true &&
    (facts.format === 'doubles' || facts.format === 'mixed') &&
    facts.registrationOpen &&
    !facts.hasRegistration &&
    !facts.hasWaitlistEntry &&
    !facts.partnerPicked
  )
}

/** The partner deck for a tournament: the same path on the web and in the app (`app/tournaments/[id]/partners.tsx`). */
export function partnerDeckPath(tournamentId: string): string {
  return `/tournaments/${tournamentId}/partners`
}
