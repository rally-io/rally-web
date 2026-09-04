import type { TFunction } from 'i18next'

// rally-api's register_tournament raises plain-English RallyException messages
// with no distinct error code for most of them (they share the generic
// BAD_REQUEST code), so the only way to localize them client-side is to match
// on the exact text. Falls back to the raw message for anything unrecognized,
// so an unexpected backend error is never silently swallowed.
export function translateRegistrationError(message: string, t: TFunction): string {
  if (message === 'You are already registered for this tournament') {
    return t('tournament.registrationErrors.alreadyRegistered')
  }
  if (message === 'Selected partner is already registered for this tournament') {
    return t('tournament.registrationErrors.partnerAlreadyRegistered')
  }
  if (message === 'Partner player not found') {
    return t('tournament.registrationErrors.partnerNotFound')
  }
  if (message === 'Tournament not found') {
    return t('tournament.registrationErrors.tournamentNotFound')
  }
  if (message === 'Tournament registration has not started yet') {
    return t('tournament.registrationErrors.registrationNotStarted')
  }
  if (message === 'Tournament registration has closed') {
    return t('tournament.registrationErrors.registrationClosed')
  }
  // e.g. "A partner is required for doubles tournaments"
  if (/^A partner is required for \w+ tournaments$/.test(message)) {
    return t('tournament.registrationErrors.partnerRequired')
  }
  // e.g. "Tournament registration is cancelled" / "...is in_progress"
  if (/^Tournament registration is \w+$/.test(message)) {
    return t('tournament.registrationErrors.registrationNotOpen')
  }
  return message
}

// rally-api's WaitlistService raises its own plain-English RallyException text
// (app/services/waitlist_service.py), distinct from register_tournament's —
// same "match on exact text" approach as translateRegistrationError above.
export function translateWaitlistError(message: string, t: TFunction): string {
  if (message === 'The waiting list is currently unavailable') {
    return t('tournament.registrationErrors.waitlistDisabled')
  }
  if (message === 'Registration is not open') {
    return t('tournament.registrationErrors.waitlistNotOpen')
  }
  if (message === 'There are still places available — register instead') {
    return t('tournament.registrationErrors.tournamentNotFull')
  }
  if (message === 'You are already registered') {
    return t('tournament.registrationErrors.alreadyRegistered')
  }
  if (message === 'You are already on the waiting list') {
    return t('tournament.registrationErrors.alreadyWaiting')
  }
  if (message === 'You are not on the waiting list') {
    return t('tournament.registrationErrors.notOnWaitlist')
  }
  return message
}
