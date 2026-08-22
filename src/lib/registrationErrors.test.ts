import { describe, it, expect } from 'vitest'
import i18n from '@/i18n'
import { translateRegistrationError } from './registrationErrors'

const t = i18n.t.bind(i18n)

describe('translateRegistrationError', () => {
  it('translates "You are already registered for this tournament"', () => {
    expect(translateRegistrationError('You are already registered for this tournament', t)).toBe(
      t('tournament.registrationErrors.alreadyRegistered'),
    )
  })

  it('translates "Selected partner is already registered for this tournament"', () => {
    expect(
      translateRegistrationError('Selected partner is already registered for this tournament', t),
    ).toBe(t('tournament.registrationErrors.partnerAlreadyRegistered'))
  })

  it('translates "Partner player not found"', () => {
    expect(translateRegistrationError('Partner player not found', t)).toBe(
      t('tournament.registrationErrors.partnerNotFound'),
    )
  })

  it('translates "Tournament not found"', () => {
    expect(translateRegistrationError('Tournament not found', t)).toBe(
      t('tournament.registrationErrors.tournamentNotFound'),
    )
  })

  it('translates "Tournament registration has not started yet"', () => {
    expect(translateRegistrationError('Tournament registration has not started yet', t)).toBe(
      t('tournament.registrationErrors.registrationNotStarted'),
    )
  })

  it('translates "Tournament registration has closed"', () => {
    expect(translateRegistrationError('Tournament registration has closed', t)).toBe(
      t('tournament.registrationErrors.registrationClosed'),
    )
  })

  it('translates the dynamic "A partner is required for {format} tournaments" message', () => {
    expect(translateRegistrationError('A partner is required for doubles tournaments', t)).toBe(
      t('tournament.registrationErrors.partnerRequired'),
    )
    expect(translateRegistrationError('A partner is required for mixed tournaments', t)).toBe(
      t('tournament.registrationErrors.partnerRequired'),
    )
  })

  it('translates the dynamic "Tournament registration is {status}" message', () => {
    expect(translateRegistrationError('Tournament registration is cancelled', t)).toBe(
      t('tournament.registrationErrors.registrationNotOpen'),
    )
  })

  it('falls back to the raw message for anything unrecognized', () => {
    expect(translateRegistrationError('Something unexpected broke', t)).toBe(
      'Something unexpected broke',
    )
  })
})
