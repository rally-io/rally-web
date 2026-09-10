import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'

import {
  renderPage, tr, session, gate, mockUseTournament, mockUseAppSession, mockUseGate, mockUseEnsure,
  mockUseRegistration, mockUploadEvidence, ensure, register, refetchTournament, resetPageMocks,
  completeDetails, expectDetailsModal, COMPLETE_PROFILE,
} from './CorporateRegistrationPage.fixtures'
import type { TournamentRegistrationResult } from '@/types/api'

beforeEach(resetPageMocks)

/**
 * Points BOTH separately-mocked hooks — the page's readiness guard
 * (useAppSession) and the form's prefill/lock source
 * (useEnsureProfileEssentials) — at the same profile. `resetPageMocks` already
 * defaults both to `PROFILE`; call this only to hand them a different one, or
 * to say so explicitly at the top of a test.
 */
function setReadyProfile(profile: Record<string, unknown> | null = COMPLETE_PROFILE) {
  mockUseAppSession.mockReturnValue(session('ready', profile))
  mockUseEnsure.mockReturnValue({
    ensure, status: 'ready', playerProfile: profile,
    // Derived, the way the real hook derives them, so a profile and its locks
    // can never disagree — the details card reads the profile, the modal reads
    // the locks, and a test that hands over half a shape would prove nothing.
    phoneLocked: !!profile?.contact_number,
    levelLocked: profile?.skill_level != null,
  } as any)
}

/** The level picker is the profile's 1.0–7.0 slider; a range input takes a change event, not a click. */
const pickLevel = (value: string) =>
  fireEvent.change(screen.getByLabelText(/skill level slider/i), { target: { value } })

describe('CorporateRegistrationPage — form', () => {
  it('a complete profile is never asked again — it is shown back, not re-collected', () => {
    setReadyProfile({ first_name: 'Dana', last_name: 'Cohen', contact_number: '0501234567', skill_level: 4.6 })
    // Singles: on doubles the CTA correctly reads "Choose a partner first".
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Values, so the player can see Rally has them right...
    expect(screen.getByText('Dana Cohen')).toBeInTheDocument()
    expect(screen.getByText('+972 0501234567')).toBeInTheDocument()
    expect(screen.getByText('4.6 (B1)')).toBeInTheDocument()
    // ...and not one input: the fields live in the modal.
    expect(screen.queryByLabelText('First name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Your mobile number')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/skill level slider/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register & pay/i })).toBeInTheDocument()
  })

  it('the level row opens the modal past the pencil, and the new level is written', async () => {
    const user = userEvent.setup()
    setReadyProfile({ first_name: 'Dana', last_name: 'Cohen', contact_number: '0501234567', skill_level: 4.6 })
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Change' }))
    // Straight to the slider: the button the player pressed already said
    // "change my level", so a second pencil click would be a dead step.
    expect(screen.getByLabelText(/skill level slider/i)).toBeInTheDocument()
    pickLevel('5.5')
    await user.click(screen.getByRole('button', { name: 'Save details' }))

    // `overwriteStoredLevel` is the guard that stops a prefilled form from
    // destroying a rated level; pressing this button is the deliberate act.
    expect(ensure).toHaveBeenCalledWith({
      firstName: 'Dana', lastName: 'Cohen', phone: '501234567', skillLevel: 5.5, overwriteStoredLevel: true,
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('5.5 (A2)')).toBeInTheDocument()
  })

  it('reopening plain does not inherit the level editor the last opening unlocked', async () => {
    const user = userEvent.setup()
    setReadyProfile({ first_name: 'Dana', last_name: 'Cohen', contact_number: null, skill_level: 4.6 })
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()

    // Opened by itself (phone missing): the stored level stays locked.
    expectDetailsModal()
    expect(screen.queryByLabelText(/skill level slider/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /close/i }))

    await user.click(screen.getByRole('button', { name: /register & pay/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByLabelText(/skill level slider/i)).not.toBeInTheDocument()
  })

  it('the modal prefills from the profile and locks what is already stored', () => {
    // Phone missing, so the modal opens itself; the level is stored, so it
    // arrives locked behind the pencil.
    setReadyProfile({ first_name: 'Dana', last_name: 'Cohen', contact_number: null, skill_level: 4.6 })
    renderPage()
    expectDetailsModal()
    expect(screen.getByLabelText('First name')).toHaveValue('Dana')
    expect(screen.getByLabelText('Last name')).toHaveValue('Cohen')
    expect(screen.queryByLabelText(/skill level slider/i)).not.toBeInTheDocument()
    expect(screen.getByText('4.6 (B1)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument()
    expect(screen.getByText(/your level on rally/i)).toBeInTheDocument()
  })

  it('a new account never lands on the form first — the modal opens itself', async () => {
    const user = userEvent.setup()
    mockUseAppSession.mockReturnValue(session('profile_incomplete'))
    mockUseEnsure.mockReturnValue({ ensure, status: 'profile_incomplete', playerProfile: null, phoneLocked: false, levelLocked: false } as any)
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()
    // Straight out of the sign-up modal and into this one, with no click in
    // between: the details step is the tail of signing up.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toBeInTheDocument()

    // The modal's own submit is what validates the fields.
    await user.click(screen.getByRole('button', { name: 'Save details' }))
    expect(screen.getAllByText('Required').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText('Pick a level')).toBeInTheDocument()
    expect(ensure).not.toHaveBeenCalled()
    expect(register).not.toHaveBeenCalled()
  })

  it('closing the modal leaves the page readable, and the submit button is the way back', async () => {
    const user = userEvent.setup()
    mockUseAppSession.mockReturnValue(session('profile_incomplete'))
    mockUseEnsure.mockReturnValue({ ensure, status: 'profile_incomplete', playerProfile: null, phoneLocked: false, levelLocked: false } as any)
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()
    await user.click(screen.getByRole('button', { name: /close/i }))
    // Reopening on every render would make the page impossible to read.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // The submit is the way back in, and it never registers without a profile
    // rally-api would accept.
    await user.click(screen.getByRole('button', { name: /register & pay/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('singles: the modal writes the profile, then the form registers', async () => {
    const user = userEvent.setup()
    mockUseAppSession.mockReturnValue(session('profile_incomplete'))
    mockUseEnsure.mockReturnValue({ ensure, status: 'profile_incomplete', playerProfile: null, phoneLocked: false, levelLocked: false } as any)
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()
    await completeDetails(user, { phone: '050-123-4567', level: '3.5' })
    // The write lands on Save, not on register — so by the time the player
    // submits, rally-api already has the phone and level it requires.
    expect(ensure).toHaveBeenCalledWith({ firstName: 'Dana', lastName: 'Cohen', phone: '501234567', skillLevel: 3.5, overwriteStoredLevel: false })
    expect(register).not.toHaveBeenCalled()
    // The form reads the just-saved snapshot, without waiting for the profile
    // query to catch up — otherwise this click would reopen the modal.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /register & pay/i }))
    await waitFor(() => expect(register).toHaveBeenCalledWith({ phase: 'idle' }))
    expect(ensure.mock.invocationCallOrder[0]).toBeLessThan(register.mock.invocationCallOrder[0])
  })

  it('a stored level opens for editing inside the modal and overwrites on save', async () => {
    const user = userEvent.setup()
    // Phone missing, so the modal opens itself and the stored level comes with it.
    setReadyProfile({ first_name: 'Dana', last_name: 'Cohen', contact_number: null, skill_level: 4.6 })
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()

    expectDetailsModal()
    await user.type(screen.getByLabelText('Your mobile number'), '0501234567')
    await user.click(screen.getByRole('button', { name: 'Change' }))
    expect(screen.getByLabelText(/skill level slider/i)).toBeInTheDocument()
    pickLevel('5.5')
    expect(screen.getByTestId('cr-level-readout')).toHaveTextContent('5.5 (A2)')

    await user.click(screen.getByRole('button', { name: 'Save details' }))
    // `overwriteStoredLevel` is the guard that stops a prefilled form from
    // destroying a rated level, and only the pencil may set it.
    expect(ensure).toHaveBeenCalledWith({
      firstName: 'Dana', lastName: 'Cohen', phone: '501234567', skillLevel: 5.5, overwriteStoredLevel: true,
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  /**
   * The fresh-account submit path: `ensure()` ends with `refetchOnboarding()`,
   * which flips `has_player_profile` — so the session turns 'ready' while the
   * ['player-profile-me'] query has not resolved yet (playerProfile still null).
   * The page's readiness skeleton must NOT reclaim the page at that moment. The
   * in-flight `register` survives on its closure either way; what dies with the
   * form is the partner selection, the typed fields and the error a failed
   * register would have shown to retry from.
   */
  it('keeps the form mounted when the profile refetch flips the session mid-submit', async () => {
    const user = userEvent.setup()
    mockUseAppSession.mockReturnValue(session('profile_incomplete'))
    mockUseEnsure.mockReturnValue({ ensure, status: 'profile_incomplete', playerProfile: null, phoneLocked: false, levelLocked: false } as any)
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    // Exactly what the real hook's refetchOnboarding() lands, when it lands it.
    ensure.mockImplementationOnce(async () => {
      mockUseAppSession.mockReturnValue(session('ready', null))
    })
    const { rerender } = renderPage()
    await completeDetails(user, { phone: '050-123-4567', level: '3.5' })
    await user.click(screen.getByRole('button', { name: /register & pay/i }))
    await waitFor(() => expect(register).toHaveBeenCalledWith({ phase: 'idle' }))
    // The form's own setState re-renders only the form; this is the page
    // re-reading the (now 'ready', profile-less) session for itself.
    rerender()
    // The just-saved snapshot lives in the form, so an unmount would send the
    // player straight back through the modal with `register` still in flight.
    expect(screen.getByRole('button', { name: /register & pay/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.querySelector('[data-testid="corporate-loading"]')).not.toBeInTheDocument()
  })

  it('doubles with no partner → scrolls to the partner block, no writes', async () => {
    const user = userEvent.setup()
    setReadyProfile() // ready, doubles (default), names prefilled from the profile
    renderPage()
    // The submit button's own label swaps to this CTA while a partner is
    // outstanding (PartnerSection also renders an "Add Partner" button, so
    // a bare /partner/i match is ambiguous — this is the specific one).
    await user.click(screen.getByRole('button', { name: /choose a partner first/i }))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(ensure).not.toHaveBeenCalled()
    expect(register).not.toHaveBeenCalled()
  })

  it('an unsatisfied terms gate scrolls to the blocking card and never writes', async () => {
    const user = userEvent.setup()
    setReadyProfile()
    mockUseGate.mockReturnValue(gate({ isSatisfied: false, blocking: [{ id: 'm-1' }] }))
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    // useScreenMessages is hardcoded to `{ data: [] }` in the shared fixtures
    // (not exported as an overridable mock — this suite doesn't own that
    // hook), so the real `#screen-message-m-1` card ScreenMessageCard would
    // render never exists here. Plant a stand-in with the id the page's
    // handleSubmit actually looks up (`screen-message-${blocking[0].id}`),
    // same technique ScreenMessageModal.test.tsx uses for the identical gap.
    const card = document.createElement('div')
    card.id = 'screen-message-m-1'
    document.body.appendChild(card)
    try {
      renderPage()
      await user.click(screen.getByRole('button', { name: /register & pay/i }))
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
      expect(ensure).not.toHaveBeenCalled()
      expect(register).not.toHaveBeenCalled()
    } finally {
      card.remove()
    }
  })

  it('a failed profile write keeps the modal open and never registers', async () => {
    const user = userEvent.setup()
    // A profile still missing its essentials, so there is a write to fail.
    setReadyProfile({ first_name: 'Dana', last_name: 'Cohen', contact_number: null, skill_level: null })
    ensure.mockRejectedValueOnce(new Error('nope'))
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()
    await completeDetails(user)
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't save your details/i)
    // The modal is still up with the typed values intact — closing it here
    // would lose them and leave the card still saying "Missing".
    // Normalised on the way in — the trunk 0 is stripped as it is typed.
    expect(screen.getByLabelText('Your mobile number')).toHaveValue('501234567')
    expect(register).not.toHaveBeenCalled()
  })

  it('renders the hook\'s errors next to the button', () => {
    mockUseRegistration.mockReturnValue({ register, isRegistering: false, registerError: 'Already registered', gateError: 'Accept the terms', setRegisterError: vi.fn(), setGateError: vi.fn() } as any)
    renderPage()
    expect(screen.getByText('Already registered')).toBeInTheDocument()
    expect(screen.getByText('Accept the terms')).toBeInTheDocument()
  })

  it('picking a searched partner enables a real doubles registration', async () => {
    const user = userEvent.setup()
    setReadyProfile() // ready, doubles (default), names prefilled from the profile
    const { usePlayerSearch } = await import('@/hooks/usePlayerSearch')
    vi.mocked(usePlayerSearch).mockReturnValue({ results: [{ id: 'p-2', first_name: 'Yossi', last_name: 'Levi', avatar_url: null }], isLoading: false, isActive: true } as any)
    renderPage()
    expect(screen.getByPlaceholderText(i18n.t('tournament.partnerSearchPlaceholder'))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Yossi Levi/ }))
    await user.click(screen.getByRole('button', { name: /register & pay/i }))
    await waitFor(() => expect(register).toHaveBeenCalled())
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'selected', partner: expect.objectContaining({ type: 'existing', id: 'p-2' }) }),
    )
  })

  /**
   * A fresh employee (no player profile yet) 403s on GET /players/search
   * ("Player profile not found") and the axios interceptor bounces them to
   * /profile/edit, losing the form — see followup-1 brief. The doubles/mixed
   * partner block must go invite-only until a profile exists.
   */
  it('no player profile yet → invite-only partner block, no search box', () => {
    mockUseAppSession.mockReturnValue(session('profile_incomplete'))
    mockUseEnsure.mockReturnValue({ ensure, status: 'profile_incomplete', playerProfile: null, phoneLocked: false, levelLocked: false } as any)
    renderPage() // doubles by default (tr()'s format)

    // Proves the page wires searchEnabled={!!playerProfile} into PartnerSection:
    // the search box is gone and the invite-only hint copy shows instead of the
    // default one. Whether PartnerSection then actually stops querying with a
    // disabled search is PartnerSection's own contract, exercised (with a
    // rerender that forces a non-empty query first, so it can't pass by
    // coincidence) in PartnerSection.test.tsx.
    expect(
      screen.queryByPlaceholderText(i18n.t('tournament.partnerSearchPlaceholder')),
    ).not.toBeInTheDocument()
    expect(screen.getByText(i18n.t('corporate.reg.partnerRequiredHintInviteOnly'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('corporate.reg.partnerRequiredHint'))).not.toBeInTheDocument()
  })

  it('a loaded player profile → the partner search box is present', () => {
    setReadyProfile() // ready, doubles (default), profile loaded
    renderPage()

    expect(
      screen.getByPlaceholderText(i18n.t('tournament.partnerSearchPlaceholder')),
    ).toBeInTheDocument()
    expect(screen.getByText(i18n.t('corporate.reg.partnerRequiredHint'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('corporate.reg.partnerRequiredHintInviteOnly'))).not.toBeInTheDocument()
  })

  /**
   * A free tournament with no waiver declared at all (corporate events are
   * often sponsored outright) is a DIFFERENT ₪0 than the waiver's — there is
   * no residency review pending, so `waiverNoChargeNote`'s "once the club
   * verifies residency" clause would be false here. Singles on purpose: no
   * feeWaiver is passed to `renderPage`, so `waiverOffered` is false and
   * `residents` stays 0 regardless of format, but a doubles CTA would read
   * "Choose a partner first" until a partner is picked, unrelated to price.
   */
  it('a free tournament with no waiver declared shows the generic free note, not the hold or residency note', () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles', entry_fee: 0 }))
    renderPage() // no feeWaiver on the event
    expect(screen.getByText(i18n.t('corporate.reg.freeNote'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('corporate.reg.holdNote'))).not.toBeInTheDocument()
    expect(screen.queryByText(i18n.t('corporate.reg.waiverNoChargeNote'))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('corporate.reg.submitCtaFree') })).toBeInTheDocument()
  })
})

/**
 * The residency fee waiver (Holon residents). The block is offered only when the
 * event entry declares it AND the loaded tournament carries the same
 * `fee_waiver_type` — one flag alone never opens it.
 */
describe('CorporateRegistrationPage — residency fee waiver', () => {
  /** The Israel Open's flag, patched onto the harness' generic Acme event. */
  const WAIVER_EVENT = { feeWaiver: { type: 'holon_resident' as const } }
  const WAIVER_TOURNAMENT = { fee_waiver_type: 'holon_resident' }

  function makeFile(name = 'id.jpg'): File {
    return new File([new Uint8Array(1024)], name, { type: 'image/jpeg' })
  }

  /**
   * `onRegistered` is an OPTION of the register hook, which the page owns and the
   * tests mock wholesale — so the only way to run the upload closure is to pull
   * the option off the mock and invoke it with a registration of our own.
   */
  function capturedOnRegistered() {
    const calls = mockUseRegistration.mock.calls
    const options = calls[calls.length - 1]?.[2]
    return options?.onRegistered
  }

  async function runOnRegistered(id = 'reg-1') {
    const onRegistered = capturedOnRegistered()
    expect(onRegistered).toBeTypeOf('function')
    await act(async () => {
      await onRegistered!({ id } as TournamentRegistrationResult)
    })
  }

  it('no feeWaiver on the event → no waiver block, even when the tournament allows it', () => {
    mockUseTournament.mockReturnValue(tr(WAIVER_TOURNAMENT))
    renderPage()
    expect(screen.queryByText(i18n.t('corporate.reg.waiverTitle'))).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('corporate.reg.waiverOne') })).not.toBeInTheDocument()
  })

  it('no fee_waiver_type on the tournament → no waiver block, even when the event declares one', () => {
    renderPage(WAIVER_EVENT) // tr() has no fee_waiver_type
    expect(screen.queryByText(i18n.t('corporate.reg.waiverTitle'))).not.toBeInTheDocument()
  })

  it('both flags → the block, its three options and the hint', () => {
    mockUseTournament.mockReturnValue(tr(WAIVER_TOURNAMENT))
    renderPage(WAIVER_EVENT)
    expect(screen.getByText(i18n.t('corporate.reg.waiverTitle'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('corporate.reg.waiverHint'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverNone') })).toHaveAttribute('aria-pressed', 'true')
    // Two seats → the middle option reads "one of us", not first person.
    expect(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverOneOfUs') })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: i18n.t('corporate.reg.waiverOne') })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverBoth') })).toBeInTheDocument()
    // No picker until a resident is declared.
    expect(screen.queryByLabelText(i18n.t('corporate.reg.evidenceResident'))).not.toBeInTheDocument()
  })

  it('singles has one seat → the "both residents" option is hidden', () => {
    mockUseTournament.mockReturnValue(tr({ ...WAIVER_TOURNAMENT, format: 'singles' }))
    renderPage(WAIVER_EVENT)
    expect(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverOne') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('corporate.reg.waiverBoth') })).not.toBeInTheDocument()
  })

  it('the price follows the declared residents: 150 → 75 → 0', async () => {
    const user = userEvent.setup()
    mockUseTournament.mockReturnValue(tr(WAIVER_TOURNAMENT)) // doubles, entry_fee 150
    renderPage(WAIVER_EVENT)
    expect(screen.getByText('₪150')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverOneOfUs') }))
    expect(screen.getByText('₪75')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('corporate.reg.priceHalf'))).toBeInTheDocument()
    // One of two: the single picker is "the resident's", whoever that is.
    expect(screen.getByLabelText(i18n.t('corporate.reg.evidenceResident'))).toBeInTheDocument()
    expect(screen.queryByLabelText(i18n.t('corporate.reg.evidenceMine'))).not.toBeInTheDocument()
    expect(screen.queryByLabelText(i18n.t('corporate.reg.evidencePartner'))).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverBoth') }))
    expect(screen.getByText('₪0')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('corporate.reg.priceWaived'))).toBeInTheDocument()
    expect(screen.getByLabelText(i18n.t('corporate.reg.evidencePartner'))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverNone') }))
    expect(screen.getByText('₪150')).toBeInTheDocument()
    expect(screen.queryByLabelText(i18n.t('corporate.reg.evidenceMine'))).not.toBeInTheDocument()
    expect(screen.queryByLabelText(i18n.t('corporate.reg.evidenceResident'))).not.toBeInTheDocument()
  })

  /**
   * I1 — a ₪0 registration must never be told money is about to move: the
   * hold note is factually false there (the hook goes straight to
   * confirm-zero, no card is ever touched) and "Register & pay" promises a
   * charge that never happens. Mirrors the hook's own `amountToPay < 0.01`
   * threshold. Covers both ways a ₪0 form is reached: singles at full
   * waiver (1/1 seats) and doubles with both residents declared (2/2).
   */
  it('₪0 singles (1/1 residents) shows the no-charge note and a "Register" CTA, not the hold note', async () => {
    const user = userEvent.setup()
    mockUseTournament.mockReturnValue(tr({ ...WAIVER_TOURNAMENT, format: 'singles' }))
    renderPage(WAIVER_EVENT)
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverOne') }))
    expect(screen.getByText(i18n.t('corporate.reg.waiverNoChargeNote'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('corporate.reg.holdNote'))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('corporate.reg.submitCtaFree') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /register & pay/i })).not.toBeInTheDocument()
  })

  it('₪0 doubles (2/2 residents) shows the no-charge note and a "Register" CTA, not the hold note', async () => {
    const user = userEvent.setup()
    mockUseTournament.mockReturnValue(tr(WAIVER_TOURNAMENT)) // doubles, entry_fee 150
    const { usePlayerSearch } = await import('@/hooks/usePlayerSearch')
    vi.mocked(usePlayerSearch).mockReturnValue({ results: [{ id: 'p-2', first_name: 'Yossi', last_name: 'Levi', avatar_url: null }], isLoading: false, isActive: true } as any)
    renderPage(WAIVER_EVENT)
    // A partner must be picked first — otherwise the CTA reads "Choose a
    // partner first" regardless of price, which would pass this assertion
    // for the wrong reason.
    await user.click(screen.getByRole('button', { name: /Yossi Levi/ }))
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverBoth') }))
    expect(screen.getByText(i18n.t('corporate.reg.waiverNoChargeNote'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('corporate.reg.holdNote'))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('corporate.reg.submitCtaFree') })).toBeInTheDocument()
  })

  it('half-price (1/2 residents) still shows the hold note and "Register & pay"', async () => {
    const user = userEvent.setup()
    mockUseTournament.mockReturnValue(tr(WAIVER_TOURNAMENT)) // doubles, entry_fee 150
    const { usePlayerSearch } = await import('@/hooks/usePlayerSearch')
    vi.mocked(usePlayerSearch).mockReturnValue({ results: [{ id: 'p-2', first_name: 'Yossi', last_name: 'Levi', avatar_url: null }], isLoading: false, isActive: true } as any)
    renderPage(WAIVER_EVENT)
    await user.click(screen.getByRole('button', { name: /Yossi Levi/ }))
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverOneOfUs') }))
    expect(screen.getByText(i18n.t('corporate.reg.holdNote'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('corporate.reg.waiverNoChargeNote'))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register & pay/i })).toBeInTheDocument()
  })

  it('0 residents declared → unchanged: hold note and "Register & pay"', () => {
    // Singles on purpose: on the default doubles tournament the CTA reads
    // "Choose a partner first" until a partner is picked regardless of price,
    // which would make this assertion pass for the wrong reason.
    mockUseTournament.mockReturnValue(tr({ ...WAIVER_TOURNAMENT, format: 'singles' }))
    renderPage(WAIVER_EVENT)
    expect(screen.getByText(i18n.t('corporate.reg.holdNote'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('corporate.reg.waiverNoChargeNote'))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register & pay/i })).toBeInTheDocument()
  })

  it('a declared resident with no file blocks the submit with evidenceRequired', async () => {
    const user = userEvent.setup()
    mockUseTournament.mockReturnValue(tr({ ...WAIVER_TOURNAMENT, format: 'singles' }))
    renderPage(WAIVER_EVENT)
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverOne') }))
    // Singles + one declared resident is a full waiver (1/1 seats) — the CTA
    // reads the ₪0 label, not "Register & pay" (I1).
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.submitCtaFree') }))

    expect(screen.getByText(i18n.t('corporate.reg.evidenceRequired'))).toBeInTheDocument()
    expect(ensure).not.toHaveBeenCalled()
    expect(register).not.toHaveBeenCalled()
  })

  it('one resident + one file → fee_waiver on the payload and one upload for player 1', async () => {
    const user = userEvent.setup()
    mockUseTournament.mockReturnValue(tr({ ...WAIVER_TOURNAMENT, format: 'singles' }))
    renderPage(WAIVER_EVENT)
    const file = makeFile()
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverOne') }))
    await user.upload(screen.getByLabelText(i18n.t('corporate.reg.evidenceMine')), file)
    // Singles + one declared resident is a full waiver (1/1 seats) → ₪0 CTA.
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.submitCtaFree') }))

    await waitFor(() => expect(register).toHaveBeenCalled())
    expect(register).toHaveBeenCalledWith(
      { phase: 'idle' },
      { type: 'holon_resident', resident_count: 1 },
    )

    await runOnRegistered()
    expect(mockUploadEvidence).toHaveBeenCalledTimes(1)
    expect(mockUploadEvidence).toHaveBeenCalledWith('reg-1', 1, [file])
    // Files have no own enumerable props in jsdom, so toEqual alone would pass
    // for ANY File — pin the identity of the one the form actually held.
    expect(mockUploadEvidence.mock.calls[0][2][0]).toBe(file)
    expect(refetchTournament).toHaveBeenCalled()
  })

  it('two residents → one upload per player, in slot order', async () => {
    const user = userEvent.setup()
    mockUseTournament.mockReturnValue(tr(WAIVER_TOURNAMENT)) // doubles
    const { usePlayerSearch } = await import('@/hooks/usePlayerSearch')
    vi.mocked(usePlayerSearch).mockReturnValue({ results: [{ id: 'p-2', first_name: 'Yossi', last_name: 'Levi', avatar_url: null }], isLoading: false, isActive: true } as any)
    renderPage(WAIVER_EVENT)
    const mine = makeFile('mine.jpg')
    const theirs = makeFile('theirs.jpg')
    await user.click(screen.getByRole('button', { name: /Yossi Levi/ }))
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverBoth') }))
    await user.upload(screen.getByLabelText(i18n.t('corporate.reg.evidenceMine')), mine)
    await user.upload(screen.getByLabelText(i18n.t('corporate.reg.evidencePartner')), theirs)
    // Both declared residents on a doubles pair is a full waiver (2/2) → ₪0 CTA.
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.submitCtaFree') }))

    await waitFor(() => expect(register).toHaveBeenCalled())
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'selected' }),
      { type: 'holon_resident', resident_count: 2 },
    )

    await runOnRegistered('reg-2')
    expect(mockUploadEvidence).toHaveBeenCalledTimes(2)
    expect(mockUploadEvidence).toHaveBeenNthCalledWith(1, 'reg-2', 1, [mine])
    expect(mockUploadEvidence).toHaveBeenNthCalledWith(2, 'reg-2', 2, [theirs])
    expect(mockUploadEvidence.mock.calls[0][2][0]).toBe(mine)
    expect(mockUploadEvidence.mock.calls[1][2][0]).toBe(theirs)
  })

  /**
   * A failed upload must never strand the registration. Nothing surfaces on
   * the FORM for it any more — real production always swaps the form for the
   * registered card before this render would matter (the same `refetch` here
   * is what flips `my_registration`), and that card is the recovery path with
   * its own picker for the affected slot. This test only pins the two things
   * that still matter at this layer: the failure is swallowed, not fatal, and
   * the refetch still runs.
   */
  it('a failed upload is swallowed and still refetches the tournament — the card is the recovery path', async () => {
    const user = userEvent.setup()
    mockUseTournament.mockReturnValue(tr({ ...WAIVER_TOURNAMENT, format: 'singles' }))
    mockUploadEvidence.mockRejectedValueOnce(new Error('boom'))
    renderPage(WAIVER_EVENT)
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.waiverOne') }))
    await user.upload(screen.getByLabelText(i18n.t('corporate.reg.evidenceMine')), makeFile())
    // Singles + one declared resident is a full waiver (1/1 seats) → ₪0 CTA.
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.submitCtaFree') }))
    await waitFor(() => expect(register).toHaveBeenCalled())

    await runOnRegistered()
    expect(refetchTournament).toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('no waiver declared → register keeps today\'s single-argument call', async () => {
    const user = userEvent.setup()
    mockUseTournament.mockReturnValue(tr({ ...WAIVER_TOURNAMENT, format: 'singles' }))
    renderPage(WAIVER_EVENT)
    await user.click(screen.getByRole('button', { name: /register & pay/i }))

    await waitFor(() => expect(register).toHaveBeenCalledWith({ phase: 'idle' }))
    await runOnRegistered()
    expect(mockUploadEvidence).not.toHaveBeenCalled()
    expect(refetchTournament).not.toHaveBeenCalled()
  })
})
