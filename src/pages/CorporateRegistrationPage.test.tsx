import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'

import {
  renderPage, resetPageMocks, tr, session, PROFILE,
  mockUseTournament, mockUseAppSession, mockUseEnsure,
  requireSignIn, refetchOnboarding, ensure, register,
  mockUploadEvidence, refetchTournament, mockUseRegistration,
} from './CorporateRegistrationPage.fixtures'

beforeEach(resetPageMocks)

describe('CorporateRegistrationPage — states', () => {
  it('shows the event hero from the config, not from the tournament', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Acme Padel Cup')
    expect(screen.getByText('Thursday, 20 August 2026')).toBeInTheDocument()
    expect(screen.getByText('Acme Ltd')).toBeInTheDocument()
  })

  it('a signed-out resident is told they play free, before they sign in', () => {
    mockUseAppSession.mockReturnValue(session('signed_out'))
    mockUseTournament.mockReturnValue(tr({ fee_waiver_type: 'holon_resident' }))
    renderPage({ feeWaiver: { type: 'holon_resident' } })
    expect(screen.getByText(i18n.t('corporate.reg.signInWaiverHint'))).toBeInTheDocument()
  })

  it('a tournament with no waiver shows only the price', () => {
    mockUseAppSession.mockReturnValue(session('signed_out'))
    renderPage({ feeWaiver: { type: 'holon_resident' } }) // tr() carries no fee_waiver_type
    expect(screen.queryByText(i18n.t('corporate.reg.signInWaiverHint'))).not.toBeInTheDocument()
  })

  it('an entry with no artwork uses the banner the manager uploaded in the CRM', () => {
    mockUseTournament.mockReturnValue(tr({ image_url: 'https://cdn.example/banner.jpg' }))
    renderPage({ heroImage: undefined })
    expect(screen.getByAltText('Kash Padel')).toHaveAttribute('src', 'https://cdn.example/banner.jpg')
  })

  it('renders a skeleton while the tournament loads', () => {
    mockUseTournament.mockReturnValue({ data: undefined, isLoading: true, isError: false } as any)
    renderPage()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(document.querySelector('[data-testid="corporate-loading"]')).toBeInTheDocument()
  })

  it('renders the not-found card when the tournament cannot be loaded', () => {
    mockUseTournament.mockReturnValue({ data: null, isLoading: false, isError: true } as any)
    renderPage()
    expect(screen.getByText('Link not found')).toBeInTheDocument()
  })

  it('registered + confirmed → registered card with the partner name, no form', () => {
    mockUseTournament.mockReturnValue(tr({ my_registration: { id: 'r-1', status: 'confirmed', payment_status: 'completed', player_2_name: 'Yossi Levi' } }))
    renderPage()
    expect(screen.getByText(/you're in/i)).toBeInTheDocument()
    expect(screen.getByText('Yossi Levi')).toBeInTheDocument()
    expect(screen.getByText(/registration is confirmed/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /register & pay/i })).not.toBeInTheDocument()
  })

  it('the registered card links to the tournament page and back to the site', () => {
    mockUseTournament.mockReturnValue(tr({
      my_registration: { id: 'reg-1', tournament_id: 't-1', player_1_id: 'p-1', player_2_id: 'p-2', player_2_name: 'Yossi Levi', status: 'confirmed', payment_status: 'completed' },
    }))
    renderPage()
    expect(screen.getByRole('link', { name: 'View the tournament' })).toHaveAttribute('href', '/tournaments/t-1')
    expect(screen.getByRole('link', { name: 'My tournaments on Rally' })).toHaveAttribute('href', '/tournaments?tab=my')
  })

  it('registered but unpaid → "complete payment" resumes at /payment-method with return_to', () => {
    mockUseTournament.mockReturnValue(tr({ my_registration: { id: 'r-1', status: 'registered', payment_status: 'pending', guest_player_2_name: 'Guest Gal' } }))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /complete payment/i }))
    expect(screen.getByTestId('route-probe').textContent).toBe('registration_id=r-1&tournament_id=t-1&return_to=%2Fjoin%2Facme')
  })

  it('a cancelled registration is named, never rendered as "you\'re in"', () => {
    mockUseTournament.mockReturnValue(tr({ my_registration: { id: 'r-1', status: 'cancelled', payment_status: null } }))
    renderPage()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    // Terminal statuses get their own copy — never the "deadline passed" body
    // meant for registration-closed, which would misdescribe why a cancelled
    // player is seeing this card at all.
    expect(screen.getByText('For questions about your registration, ask your tournament organiser.')).toBeInTheDocument()
    expect(screen.queryByText(/registration deadline has passed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/you're in/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/registration is confirmed/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    // Every terminal card still has a way back to the site.
    expect(screen.getByRole('link', { name: 'My tournaments on Rally' })).toHaveAttribute('href', '/tournaments?tab=my')
  })

  it('a singles registration shows no partner line instead of "Self"', () => {
    mockUseTournament.mockReturnValue(tr({
      format: 'singles',
      my_registration: { id: 'r-1', status: 'confirmed', payment_status: 'completed' },
    }))
    renderPage()
    expect(screen.getByText(/you're in/i)).toBeInTheDocument()
    expect(screen.queryByText(/partner:/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Self')).not.toBeInTheDocument()
  })

  it('approved (not yet open) → "opens soon" card, no button', () => {
    mockUseTournament.mockReturnValue(tr({ status: 'approved' }))
    renderPage()
    expect(screen.getByText(/hasn't opened yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('deadline passed → closed card', () => {
    mockUseTournament.mockReturnValue(tr({ registration_deadline: '2000-01-01' }))
    renderPage()
    expect(screen.getByText(/registration has closed/i)).toBeInTheDocument()
  })

  it('full → full card', () => {
    mockUseTournament.mockReturnValue(tr({ is_full: true }))
    renderPage()
    expect(screen.getByText(/all spots are taken/i)).toBeInTheDocument()
  })

  it('signed out → one CTA that stashes the return path and opens the sign-in gate', async () => {
    mockUseAppSession.mockReturnValue(session('signed_out'))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /register for the tournament/i }))
    expect(sessionStorage.getItem('rally:auth-return')).toBe('/join/acme')
    expect(requireSignIn).toHaveBeenCalled()
    await waitFor(() => expect(refetchOnboarding).toHaveBeenCalled())
  })

  it('ready but the profile query has not resolved → skeleton, never the form', () => {
    // `ready` comes from the onboarding query alone; the profile is a second
    // request. Rendering the form here would offer blank, editable phone/level
    // fields and a submit would patch over the stored values.
    mockUseAppSession.mockReturnValue(session('ready', null))
    renderPage()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /register & pay/i })).not.toBeInTheDocument()
    expect(document.querySelector('[data-testid="corporate-loading"]')).toBeInTheDocument()
  })

  it('a session that goes back to loading mid-submit does NOT take the form away', () => {
    // The fresh-account path: profile_incomplete gets the form, `ensure()` creates
    // the profile, and `refetchOnboarding()` flips has_player_profile — so
    // AppSessionContext reports 'loading' again until ['player-profile-me'] lands.
    // Swapping the form for the cold-load skeleton there unmounts it with
    // `register` still in flight, taking the partner selection and the typed
    // fields with it. Only a COLD load may show the skeleton.
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockUseAppSession.mockReturnValue(session('profile_incomplete', null))
    mockUseEnsure.mockReturnValue({ ensure, status: 'profile_incomplete', playerProfile: null, phoneLocked: false, levelLocked: false } as any)
    const view = renderPage()
    expect(screen.getByRole('form', { name: /registration details/i, hidden: true })).toBeInTheDocument()

    mockUseAppSession.mockReturnValue(session('loading', null))
    view.rerender()
    expect(screen.getByRole('form', { name: /registration details/i, hidden: true })).toBeInTheDocument()
    expect(document.querySelector('[data-testid="corporate-loading"]')).not.toBeInTheDocument()
  })

  it('profile_incomplete still gets the form — it has no profile by definition', () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockUseAppSession.mockReturnValue(session('profile_incomplete', null))
    mockUseEnsure.mockReturnValue({ ensure, status: 'profile_incomplete', playerProfile: null, phoneLocked: false, levelLocked: false } as any)
    renderPage()
    expect(screen.getByRole('form', { name: /registration details/i, hidden: true })).toBeInTheDocument()
  })

  it('a locked phone renders a read-only input the label can name', async () => {
    // The lock is deliberately driven through useEnsureProfileEssentials while the
    // page-level session keeps PROFILE: the page's readiness guard reads useAppSession,
    // the form's lock reads useEnsureProfileEssentials, and this asserts the second in
    // isolation. The two mocked profiles disagreeing here is intentional, not a slip.
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockUseEnsure.mockReturnValue({
      ensure, status: 'ready',
      playerProfile: { first_name: 'Dana', last_name: 'Cohen', contact_number: '0501234567', skill_level: null },
      phoneLocked: true, levelLocked: false,
    } as any)
    renderPage()
    // The field lives in the details modal, which this incomplete profile
    // (no level) opens by itself.
    const phone = screen.getByLabelText('Your mobile number')
    expect(phone).toHaveAttribute('readonly')
    expect(phone).toHaveValue('+972 501234567')
  })

  it('signed in with a loaded profile → the registration form with the entry fee', () => {
    // Singles on purpose: on the default doubles tournament the submit button
    // correctly reads "← Choose a partner first" until a partner is picked
    // (asserted in CorporateRegistrationPage.form.test.tsx), so /register & pay/
    // is only the label once no partner is outstanding.
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockUseAppSession.mockReturnValue(session('ready', PROFILE))
    renderPage()
    expect(screen.getByRole('button', { name: /register & pay/i })).toBeInTheDocument()
    expect(screen.getByText(/150/)).toBeInTheDocument()
  })
})

/**
 * I2 — a confirm-zero failure on the ₪0 waived path happens AFTER the
 * closure's `await refetchTournament()` has already flipped `my_registration`
 * from null to the new row, swapping the form for `RegisteredCard`. The
 * hook's `registerError` must still reach the screen from there, since the
 * page tests mock `useTournamentRegistration` wholesale and can't drive the
 * hook's confirm-zero call directly.
 */
describe('CorporateRegistrationPage — post-refetch register error (I2)', () => {
  it('a registerError set after the refetch is shown next to the registered card', () => {
    mockUseTournament.mockReturnValue(tr({
      my_registration: { id: 'r-1', status: 'confirmed', payment_status: 'completed' },
    }))
    mockUseRegistration.mockReturnValue({
      register, isRegistering: false,
      registerError: 'Something went wrong confirming your free registration',
      gateError: null, setRegisterError: vi.fn(), setGateError: vi.fn(),
    } as any)
    renderPage()
    expect(screen.getByText(/you're in/i)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong confirming your free registration')
  })

  it('a stale registerError does not leak onto the full-tournament card (TOURNAMENT_FULL sets both)', () => {
    mockUseTournament.mockReturnValue(tr({ is_full: true }))
    mockUseRegistration.mockReturnValue({
      register, isRegistering: false,
      registerError: 'The tournament is full',
      gateError: null, setRegisterError: vi.fn(), setGateError: vi.fn(),
    } as any)
    renderPage()
    expect(screen.getByText(/all spots are taken/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

/**
 * The registered card's residency waiver: the waiver line, the truthful ₪0
 * payState override, evidence counts and the per-slot add-evidence recovery
 * path. `tr()`'s default tournament is doubles at ₪150 (seats = 2).
 */
describe('CorporateRegistrationPage — registered card residency waiver', () => {
  function makeFile(name = 'id.jpg'): File {
    return new File([new Uint8Array(1024)], name, { type: 'image/jpeg' })
  }

  it('2/2 pending, unpaid → waiver line replaces the status line, both counts, no payment button, never "confirmed"', () => {
    mockUseTournament.mockReturnValue(tr({
      my_registration: {
        id: 'r-1', status: 'registered', payment_status: null,
        fee_waiver_type: 'holon_resident', fee_waiver_status: 'pending', fee_waiver_resident_count: 2,
        evidence_counts: { '1': 2, '2': 1 },
      },
    }))
    renderPage()
    expect(screen.getByText('Waiting for the club to confirm residency (2/2)')).toBeInTheDocument()
    expect(screen.getByText('My proof · Files attached: 2')).toBeInTheDocument()
    expect(screen.getByText("My partner's proof · Files attached: 1")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete payment/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/registration is confirmed/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('corporate.reg.addEvidence') })).not.toBeInTheDocument()
  })

  it('1/2 pending, unpaid → waiver line AND the complete-payment button both appear, no "waiting for payment" text', () => {
    mockUseTournament.mockReturnValue(tr({
      my_registration: {
        id: 'r-1', status: 'registered', payment_status: 'pending',
        fee_waiver_type: 'holon_resident', fee_waiver_status: 'pending', fee_waiver_resident_count: 1,
        evidence_counts: { '1': 1 },
      },
    }))
    renderPage()
    expect(screen.getByText('Waiting for the club to confirm residency (1/2)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete payment/i })).toBeInTheDocument()
    expect(screen.queryByText(/registration is waiting for payment/i)).not.toBeInTheDocument()
  })

  it('1/2 pending, already paid (payment_status: payment_held) → waiver line AND the held line, no payment button', () => {
    mockUseTournament.mockReturnValue(tr({
      my_registration: {
        id: 'r-1', status: 'registered', payment_status: 'payment_held',
        fee_waiver_type: 'holon_resident', fee_waiver_status: 'pending', fee_waiver_resident_count: 1,
        evidence_counts: { '1': 1 },
      },
    }))
    renderPage()
    expect(screen.getByText('Waiting for the club to confirm residency (1/2)')).toBeInTheDocument()
    expect(screen.getByText(/the hold is in place, pending the organisers/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete payment/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/registration is confirmed/i)).not.toBeInTheDocument()
  })

  it('a pending waiver with a null resident count falls through to the plain status line, no "(0/2)"', () => {
    mockUseTournament.mockReturnValue(tr({
      my_registration: {
        id: 'r-1', status: 'confirmed', payment_status: 'completed',
        fee_waiver_type: 'holon_resident', fee_waiver_status: 'pending', fee_waiver_resident_count: null,
        evidence_counts: {},
      },
    }))
    renderPage()
    expect(screen.queryByText(/\(0\/2\)/)).not.toBeInTheDocument()
    expect(screen.queryByText(/waiting for the club/i)).not.toBeInTheDocument()
    expect(screen.getByText(/registration is confirmed/i)).toBeInTheDocument()
  })

  it('a declared resident with no evidence yet → picker + add button; upload calls the API and refetches', async () => {
    const user = userEvent.setup()
    mockUseTournament.mockReturnValue(tr({
      my_registration: {
        id: 'r-1', status: 'registered', payment_status: 'pending',
        fee_waiver_type: 'holon_resident', fee_waiver_status: 'pending', fee_waiver_resident_count: 1,
        evidence_counts: {},
      },
    }))
    renderPage()
    expect(screen.getByText("The resident's proof of address · Files attached: 0")).toBeInTheDocument()
    const file = makeFile()
    await user.upload(screen.getByLabelText(i18n.t('corporate.reg.evidenceResident')), file)
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.addEvidence') }))
    await waitFor(() => expect(mockUploadEvidence).toHaveBeenCalledWith('r-1', 1, [file]))
    expect(refetchTournament).toHaveBeenCalled()
  })

  it('clicking add with no file picked shows evidenceRequired and never uploads', async () => {
    const user = userEvent.setup()
    mockUseTournament.mockReturnValue(tr({
      my_registration: {
        id: 'r-1', status: 'registered', payment_status: 'pending',
        fee_waiver_type: 'holon_resident', fee_waiver_status: 'pending', fee_waiver_resident_count: 1,
        evidence_counts: {},
      },
    }))
    renderPage()
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.addEvidence') }))
    await waitFor(() => expect(screen.getByText(i18n.t('corporate.reg.evidenceRequired'))).toBeInTheDocument())
    expect(mockUploadEvidence).not.toHaveBeenCalled()
  })

  it('a failed add-evidence upload shows evidenceUploadFailed on the card', async () => {
    const user = userEvent.setup()
    mockUploadEvidence.mockRejectedValueOnce(new Error('boom'))
    mockUseTournament.mockReturnValue(tr({
      my_registration: {
        id: 'r-1', status: 'registered', payment_status: 'pending',
        fee_waiver_type: 'holon_resident', fee_waiver_status: 'pending', fee_waiver_resident_count: 1,
        evidence_counts: {},
      },
    }))
    renderPage()
    await user.upload(screen.getByLabelText(i18n.t('corporate.reg.evidenceResident')), makeFile())
    await user.click(screen.getByRole('button', { name: i18n.t('corporate.reg.addEvidence') }))
    expect(await screen.findByText(i18n.t('corporate.reg.evidenceUploadFailed'))).toBeInTheDocument()
  })

  it('singles, one resident, pending, unpaid → the truthful ₪0 case: waiver line "(1/2)" (hardcoded per spec), no payment button, exactly one slot', () => {
    mockUseTournament.mockReturnValue(tr({
      format: 'singles',
      my_registration: {
        id: 'r-1', status: 'registered', payment_status: null,
        fee_waiver_type: 'holon_resident', fee_waiver_status: 'pending', fee_waiver_resident_count: 1,
        evidence_counts: {},
      },
    }))
    renderPage()
    expect(screen.getByText('Waiting for the club to confirm residency (1/2)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete payment/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText(i18n.t('corporate.reg.evidenceMine'))).toBeInTheDocument()
    expect(screen.queryByLabelText(i18n.t('corporate.reg.evidencePartner'))).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: i18n.t('corporate.reg.addEvidence') })).toHaveLength(1)
  })

  it('approved 2/2, paid → confirmed line, no waiver line, counts still shown, no picker, no button', () => {
    mockUseTournament.mockReturnValue(tr({
      my_registration: {
        id: 'r-1', status: 'confirmed', payment_status: 'completed',
        fee_waiver_type: 'holon_resident', fee_waiver_status: 'approved', fee_waiver_resident_count: 2,
        evidence_counts: { '1': 2, '2': 2 },
      },
    }))
    renderPage()
    expect(screen.getByText(/registration is confirmed/i)).toBeInTheDocument()
    expect(screen.queryByText(/waiting for the club/i)).not.toBeInTheDocument()
    expect(screen.getByText('My proof · Files attached: 2')).toBeInTheDocument()
    expect(screen.getByText("My partner's proof · Files attached: 2")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('corporate.reg.addEvidence') })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete payment/i })).not.toBeInTheDocument()
  })
})
