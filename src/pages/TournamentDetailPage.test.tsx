import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import i18n from '@/i18n'

vi.mock('@/hooks/useTournament', () => ({ useTournament: vi.fn() }))
// ParticipantsSection pulls this in via a real useQuery hook, which needs a
// QueryClientProvider this test doesn't set up — null keeps it hidden and
// out of scope (it has its own test file).
vi.mock('@/hooks/useTournamentParticipants', () => ({
  useTournamentParticipants: () => ({ data: null }),
}))
// ParticipantsSection and the partner-selection gate both call useAppSession
// directly (no providers mounted here). Default to a fully-onboarded session
// ('ready') so ParticipantsSection takes its data-gated branch (null data ⇒
// hidden) and PartnerSection renders normally; individual tests override this
// to exercise the signed-out / profile-incomplete panels.
vi.mock('@/hooks/useAppSession', () => ({ useAppSession: vi.fn() }))
vi.mock('@/hooks/useAuthGate', () => ({ useAuthGate: vi.fn() }))
// PartnerSection's search box calls this — stub it out (its own test file
// covers usePlayerSearch itself); a test that needs search results overrides
// the return value per-test via mockReturnValueOnce.
vi.mock('@/hooks/usePlayerSearch', () => ({
  usePlayerSearch: vi.fn(() => ({ results: [], isLoading: false, isActive: false })),
}))
vi.mock('@/services/api/tournaments', () => ({ registerTournament: vi.fn() }))
vi.mock('@/services/api/payments', () => ({ confirmTournamentZeroPayment: vi.fn() }))

import TournamentDetailPage from './TournamentDetailPage'
import { useTournament } from '@/hooks/useTournament'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useAppSession } from '@/hooks/useAppSession'
import { usePlayerSearch } from '@/hooks/usePlayerSearch'
import { registerTournament } from '@/services/api/tournaments'
import { confirmTournamentZeroPayment } from '@/services/api/payments'

const mockUseTournament = vi.mocked(useTournament)
const mockUseAuthGate = vi.mocked(useAuthGate)
const mockUseAppSession = vi.mocked(useAppSession)
const mockUsePlayerSearch = vi.mocked(usePlayerSearch)
const mockRegisterTournament = vi.mocked(registerTournament)
const mockConfirmZeroPayment = vi.mocked(confirmTournamentZeroPayment)
const mockRequireSignIn = vi.fn()

function session(status: string) {
  return {
    status,
    onboardingStatus: null,
    playerProfile: null,
    refetchOnboarding: vi.fn(),
    clearSession: vi.fn(),
  } as any
}

function tr(over: Record<string, unknown> = {}) {
  return {
    data: {
      id: 't-1', name: 'Rally Open', format: 'doubles',
      start_date: '2999-06-01', end_date: '2999-06-02',
      registration_deadline: '2999-05-25',
      skill_level_min: 2.5, skill_level_max: 3.8, skill_level: '2.5 - 3.8 (C2)',
      entry_fee: 150, image_url: null, thumb_url: null,
      structure: 'single_elimination', club_name: 'Padel TLV',
      description: '', prizes: [], sponsors: [],
      my_registration: null,
      ...over,
    },
    isLoading: false,
    isError: false,
  } as any
}

// Stands in for PaymentMethodPage / PaymentConfirmingPage so navigation can be
// asserted without pulling in those pages' own dependencies.
function RouteProbe() {
  const [params] = useSearchParams()
  return <div data-testid="route-probe">{params.toString()}</div>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tournaments/t-1']}>
      <Routes>
        <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
        <Route path="/payment-method" element={<RouteProbe />} />
        <Route path="/payments/confirming" element={<RouteProbe />} />
        <Route path="/profile/edit" element={<RouteProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireSignIn.mockResolvedValue(undefined)
  mockUseAuthGate.mockReturnValue({ requireSignIn: mockRequireSignIn })
  mockUsePlayerSearch.mockReturnValue({ results: [], isLoading: false, isActive: false })
  mockUseAppSession.mockReturnValue(session('ready'))
  // jsdom doesn't implement scrollIntoView — the partner-required gate calls it.
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TournamentDetailPage CTA', () => {
  it('open registration shows the Register Now CTA and gates it behind sign-in', () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    renderPage()
    const cta = screen.getByRole('button', {
      name: i18n.t('tournament.tournamentDetailRegisterNow'),
    })
    fireEvent.click(cta)
    expect(mockRequireSignIn).toHaveBeenCalledTimes(1)
  })

  it('closed registration shows a disabled button and no modal trigger', () => {
    mockUseTournament.mockReturnValue(tr({ registration_deadline: '2000-01-01' }))
    renderPage()
    expect(
      screen.getByRole('button', {
        name: i18n.t('tournament.tournamentDetailRegistrationClosed'),
      }),
    ).toBeDisabled()
  })

  it('paid registration shows the already-registered disabled button', () => {
    mockUseTournament.mockReturnValue(
      tr({ my_registration: { id: 'r-1', status: 'registered', payment_status: 'completed' } }),
    )
    renderPage()
    expect(
      screen.getByRole('button', {
        name: i18n.t('tournament.tournamentDetailAlreadyRegistered'),
      }),
    ).toBeDisabled()
  })

  it('pay-pending registration shows a Pay Now CTA that resumes straight to the Add Card page', () => {
    mockUseTournament.mockReturnValue(
      tr({ my_registration: { id: 'r-1', status: 'payment_pending', payment_status: 'pending' } }),
    )
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('tournament.tournamentPayNow') }))
    const probe = screen.getByTestId('route-probe')
    expect(probe.textContent).toContain('tournament_id=t-1')
    expect(probe.textContent).toContain('registration_id=r-1')
  })

  it('a doubles tournament blocks registration until a partner is chosen', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'doubles' }))
    renderPage()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('tournament.ctaMissingPartner') }),
    )
    await waitFor(() => expect(mockRequireSignIn).toHaveBeenCalledTimes(1))
    expect(mockRegisterTournament).not.toHaveBeenCalled()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('shows a sign-in prompt instead of the partner form when signed out', () => {
    mockUseAppSession.mockReturnValue(session('signed_out'))
    mockUseTournament.mockReturnValue(tr({ format: 'doubles' }))
    renderPage()
    const partnerSection = document.getElementById('partner-section') as HTMLElement
    expect(
      within(partnerSection).getByText(i18n.t('tournament.partnerSignInPrompt')),
    ).toBeInTheDocument()
    const cta = within(partnerSection).getByRole('button', {
      name: i18n.t('auth.gate.sign_in_button'),
    })
    fireEvent.click(cta)
    expect(mockRequireSignIn).toHaveBeenCalledTimes(1)
  })

  it('refetches onboarding status right after sign-in succeeds, so the partner form appears without waiting on the reactive query toggle', async () => {
    const signedOutSession = session('signed_out')
    mockUseAppSession.mockReturnValue(signedOutSession)
    mockUseTournament.mockReturnValue(tr({ format: 'doubles' }))
    renderPage()
    const partnerSection = document.getElementById('partner-section') as HTMLElement
    const cta = within(partnerSection).getByRole('button', {
      name: i18n.t('auth.gate.sign_in_button'),
    })
    fireEvent.click(cta)
    await waitFor(() => expect(signedOutSession.refetchOnboarding).toHaveBeenCalledTimes(1))
  })

  it('the profile-incomplete "Complete Profile" CTA carries a returnTo back to this tournament', () => {
    mockUseAppSession.mockReturnValue(session('profile_incomplete'))
    mockUseTournament.mockReturnValue(tr({ id: 't-1', format: 'doubles' }))
    renderPage()
    const partnerSection = document.getElementById('partner-section') as HTMLElement
    const cta = within(partnerSection).getByRole('button', {
      name: i18n.t('user_menu.complete_profile'),
    })
    fireEvent.click(cta)
    const probe = screen.getByTestId('route-probe')
    expect(probe.textContent).toContain(encodeURIComponent('/tournaments/t-1'))
  })

  it('shows a complete-profile prompt instead of the partner form when onboarding is incomplete', () => {
    mockUseAppSession.mockReturnValue(session('profile_incomplete'))
    mockUseTournament.mockReturnValue(tr({ format: 'doubles' }))
    renderPage()
    const partnerSection = document.getElementById('partner-section') as HTMLElement
    expect(
      within(partnerSection).getByText(i18n.t('tournament.partnerCompleteProfilePrompt')),
    ).toBeInTheDocument()
    expect(
      within(partnerSection).getByRole('button', { name: i18n.t('user_menu.complete_profile') }),
    ).toBeInTheDocument()
  })

  it('a singles tournament registers immediately and goes straight to the Add Card page', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockRegisterTournament.mockResolvedValue({
      success: true,
      data: {
        id: 'r-9', tournament_id: 't-1', status: 'registered', payment_status: 'pending',
        credits_applied: 0, service_fee: 5, amount_to_pay: 150, entry_fee: 150,
      },
      meta: null,
      error: null,
    })
    renderPage()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentDetailRegisterNow') }),
    )
    await waitFor(() => expect(mockRegisterTournament).toHaveBeenCalledWith('t-1', { partner_type: 'none' }))
    const probe = await screen.findByTestId('route-probe')
    expect(probe.textContent).toContain('registration_id=r-9')
    expect(probe.textContent).toContain('amount=150')
  })

  it('a free (zero amount) registration confirms directly and goes to the confirming page', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockRegisterTournament.mockResolvedValue({
      success: true,
      data: {
        id: 'r-9', tournament_id: 't-1', status: 'registered', payment_status: 'pending',
        credits_applied: 0, service_fee: 0, amount_to_pay: 0, entry_fee: 0,
      },
      meta: null,
      error: null,
    })
    mockConfirmZeroPayment.mockResolvedValue({ success: true, data: { confirmed: true }, meta: null, error: null })
    renderPage()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentDetailRegisterNow') }),
    )
    await waitFor(() => expect(mockConfirmZeroPayment).toHaveBeenCalledWith('r-9'))
    const probe = await screen.findByTestId('route-probe')
    expect(probe.textContent).toContain('id=r-9')
    expect(probe.textContent).toContain('tournament_id=t-1')
  })

  it('a doubles tournament with an existing partner selected registers with partner_player_id', async () => {
    mockUsePlayerSearch.mockReturnValue({
      results: [{ id: 'p-2', first_name: 'Dana', last_name: 'Levi', avatar_url: null }],
      isLoading: false,
      isActive: true,
    })
    mockUseTournament.mockReturnValue(tr({ format: 'doubles' }))
    mockRegisterTournament.mockResolvedValue({
      success: true,
      data: {
        id: 'r-9', tournament_id: 't-1', status: 'registered', payment_status: 'pending',
        credits_applied: 0, service_fee: 5, amount_to_pay: 150, entry_fee: 150,
      },
      meta: null,
      error: null,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Dana Levi/ }))
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentDetailRegisterNow') }),
    )
    await waitFor(() =>
      expect(mockRegisterTournament).toHaveBeenCalledWith('t-1', {
        partner_type: 'existing',
        partner_player_id: 'p-2',
      }),
    )
  })

  it('shows an error message when registration resolves with success: false', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockRegisterTournament.mockResolvedValue({
      success: false,
      error: { code: 'REGISTRATION_CLOSED', message: 'Registration just closed.', details: null },
    })
    renderPage()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentDetailRegisterNow') }),
    )
    expect(await screen.findByText('Registration just closed.')).toBeInTheDocument()
  })

  it('shows the translated backend message when registration rejects (RallyException path, e.g. partner already registered)', async () => {
    // rally-api's validation errors (partner already registered, tournament
    // closed, already registered, etc.) are RallyException — a non-2xx HTTP
    // response — which the axios client's interceptor turns into a REJECTED
    // plain object ({status, code, message, details}), not a resolved
    // { success: false } value and not a thrown Error instance either. rally-api
    // sends plain English text with no distinct error code, so it must be run
    // through translateRegistrationError() to show localized text.
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockRegisterTournament.mockRejectedValue({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Selected partner is already registered for this tournament',
      details: null,
    })
    renderPage()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentDetailRegisterNow') }),
    )
    expect(
      await screen.findByText(i18n.t('tournament.registrationErrors.partnerAlreadyRegistered')),
    ).toBeInTheDocument()
  })

  it('falls back to the raw backend message when it is not a recognized registration error', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockRegisterTournament.mockRejectedValue({
      status: 500,
      code: 'SERVER_ERROR',
      message: 'Something unexpected broke',
      details: null,
    })
    renderPage()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentDetailRegisterNow') }),
    )
    expect(await screen.findByText('Something unexpected broke')).toBeInTheDocument()
  })

  it('offers the waiting list when the tournament is full', () => {
    mockUseTournament.mockReturnValue(
      tr({ status: 'registration_open', is_full: true, waitlist_enabled: true }),
    )
    renderPage()
    expect(screen.getByText(/waiting list|רשימת המתנה/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: i18n.t('appDownload.cta_register') }),
    ).toBeNull()
  })

  it('still routes into the app from the waiting-list CTA — web never joins the queue itself', () => {
    mockUseTournament.mockReturnValue(
      tr({ status: 'registration_open', is_full: true, waitlist_enabled: true }),
    )
    renderPage()
    fireEvent.click(screen.getByText(/waiting list|רשימת המתנה/i))
    expect(screen.getByText(i18n.t('appDownload.title_join'))).toBeInTheDocument()
  })

  it('falls back to the disabled full button when the waiting-list kill switch is off', () => {
    mockUseTournament.mockReturnValue(
      tr({ status: 'registration_open', is_full: true, waitlist_enabled: false }),
    )
    renderPage()
    expect(screen.getByText(/Full|מלא/)).toBeInTheDocument()
    expect(screen.queryByText(/waiting list|רשימת המתנה/i)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: i18n.t('appDownload.cta_register') }),
    ).toBeNull()
  })

  it('falls back to the disabled full button when waitlist_enabled is absent — pre-Task-11 API must not read as enabled', () => {
    // Once the waitlist feature ships, the API always sends a real boolean
    // here. The only way it's absent is a client talking to an API build
    // with no waitlist endpoints at all (independent deploy pipelines, no
    // ordering guarantee) — in that window this must NOT route someone into
    // the app to join a queue that doesn't exist yet.
    mockUseTournament.mockReturnValue(tr({ status: 'registration_open', is_full: true }))
    renderPage()
    expect(screen.getByText(/Full|מלא/)).toBeInTheDocument()
    expect(screen.queryByText(/waiting list|רשימת המתנה/i)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: i18n.t('appDownload.cta_register') }),
    ).toBeNull()
  })

  it('still invites registration when there is room', () => {
    mockUseTournament.mockReturnValue(tr({ status: 'registration_open', is_full: false }))
    renderPage()
    expect(screen.queryByText(/Full|מלא/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: i18n.t('appDownload.cta_register') }),
    ).toBeInTheDocument()
  })

  it('invites registration when is_full is absent — an older API must not read as full', () => {
    mockUseTournament.mockReturnValue(tr({ status: 'registration_open' }))
    renderPage()
    expect(screen.queryByText(/Full|מלא/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: i18n.t('appDownload.cta_register') }),
    ).toBeInTheDocument()
  })

  it('does not say Full for a full tournament that is not registration_open (completed)', () => {
    // Reachable-but-wrong case: deadline is still in the future (tr()'s default),
    // is_full is true, but the tournament's lifecycle status has moved past
    // registration_open (e.g. it finished early). "Full" is a claim about a
    // tournament you could still join if a seat opened — wrong sentence for one
    // that's already over.
    mockUseTournament.mockReturnValue(tr({ status: 'completed', is_full: true }))
    renderPage()
    expect(screen.queryByText(/Full|מלא/)).not.toBeInTheDocument()
    expect(screen.queryByText(/waiting list|רשימת המתנה/i)).not.toBeInTheDocument()
  })

  it('does not say Full when status is absent, even if is_full is true', () => {
    // Absent status must not be treated as registration_open — fall back to
    // today's behaviour (invite registration), same as absent is_full does.
    mockUseTournament.mockReturnValue(tr({ status: undefined, is_full: true }))
    renderPage()
    expect(screen.queryByText(/Full|מלא/)).not.toBeInTheDocument()
    expect(screen.queryByText(/waiting list|רשימת המתנה/i)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: i18n.t('appDownload.cta_register') }),
    ).toBeInTheDocument()
  })
})

/** A tournament that is being played right now, with a live-results token. */
function liveTr(over: Record<string, unknown> = {}) {
  const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString()
  return tr({
    start_date: hours(-1),
    end_date: hours(3),
    registration_deadline: hours(-48),
    share_token: 'abc123',
    status: 'in_progress',
    ...over,
  })
}

describe('TournamentDetailPage live results', () => {
  it('links to the live screen in a new tab while the tournament runs', () => {
    mockUseTournament.mockReturnValue(liveTr())
    renderPage()
    const link = screen.getByTestId('live-results-link')
    expect(link).toHaveAttribute('href', '/live/abc123')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(screen.getAllByText(i18n.t('tournament.liveBadge')).length).toBeGreaterThan(0)
  })

  it('replaces the dead registration-closed button with the live CTA', () => {
    mockUseTournament.mockReturnValue(liveTr())
    renderPage()
    expect(screen.getByTestId('live-results-sticky-link')).toHaveAttribute(
      'href',
      '/live/abc123',
    )
    expect(
      screen.queryByText(i18n.t('tournament.tournamentDetailRegistrationClosed')),
    ).toBeNull()
  })

  it('shows no live link when the tournament has no share token', () => {
    mockUseTournament.mockReturnValue(liveTr({ share_token: null }))
    renderPage()
    expect(screen.queryByTestId('live-results-link')).toBeNull()
    expect(screen.queryByTestId('live-results-sticky-link')).toBeNull()
    // Still flagged as live — only the link is missing.
    expect(screen.getAllByText(i18n.t('tournament.liveBadge')).length).toBeGreaterThan(0)
  })

  it('does not go live for a tournament that has not started', () => {
    mockUseTournament.mockReturnValue(tr({ share_token: 'abc123' }))
    renderPage()
    expect(screen.queryByTestId('live-results-link')).toBeNull()
    expect(screen.queryByText(i18n.t('tournament.liveBadge'))).toBeNull()
  })

  it('stays off inside the date window when status is not in_progress — dates alone do not count', () => {
    // Same date window liveTr() uses, but no `status` field.
    mockUseTournament.mockReturnValue(liveTr({ status: undefined }))
    renderPage()
    expect(screen.queryByTestId('live-results-link')).toBeNull()
    expect(screen.queryByText(i18n.t('tournament.liveBadge'))).toBeNull()
  })

  it('leaves a pending payment CTA alone', () => {
    mockUseTournament.mockReturnValue(
      liveTr({
        my_registration: { id: 'r-1', status: 'payment_pending', payment_status: 'pending' },
      }),
    )
    renderPage()
    expect(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentPayNow') }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('live-results-sticky-link')).toBeNull()
    // The in-page call-out still offers the scoreboard.
    expect(screen.getByTestId('live-results-link')).toBeInTheDocument()
  })
})
