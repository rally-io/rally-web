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
// ScreenMessageList calls this real useQuery-backed hook — this file mounts no
// QueryClientProvider, so it must be mocked like every other hook here.
vi.mock('@/features/screenMessages/hooks/useScreenMessages', () => ({
  useScreenMessages: vi.fn(),
}))
// A rendered ScreenMessageCard calls these — useAcknowledgeMessage/useDismissMessage
// pull in useQueryClient (no provider mounted here) and useAuth needs an
// AuthProvider that isn't mounted either. Stub both, mirroring
// ScreenMessageCard.test.tsx's own mocking shapes.
vi.mock('@/features/screenMessages/hooks/useMessageActions', () => ({
  useAcknowledgeMessage: () => ({ mutate: vi.fn(), isPending: false }),
  useDismissMessage: () => ({ mutate: vi.fn(), isPending: false }),
}))
// useRegistrationGate calls useQueryClient() directly (for invalidateQueries
// on a 409) — same reason as the two mocks above: no QueryClientProvider is
// mounted in this file. Its own state machine has its own test file
// (useRegistrationGate.test.tsx); here it's a controllable stand-in so these
// tests assert the WIRING (disabled state, payload attached, 409 handling).
vi.mock('@/features/screenMessages/hooks/useRegistrationGate', () => ({
  useRegistrationGate: vi.fn(),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: null }) }))

import TournamentDetailPage from './TournamentDetailPage'
import { useTournament } from '@/hooks/useTournament'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useAppSession } from '@/hooks/useAppSession'
import { usePlayerSearch } from '@/hooks/usePlayerSearch'
import { registerTournament } from '@/services/api/tournaments'
import { confirmTournamentZeroPayment } from '@/services/api/payments'
import { useScreenMessages } from '@/features/screenMessages/hooks/useScreenMessages'
import { useRegistrationGate } from '@/features/screenMessages/hooks/useRegistrationGate'

const mockUseTournament = vi.mocked(useTournament)
const mockUseAuthGate = vi.mocked(useAuthGate)
const mockUseAppSession = vi.mocked(useAppSession)
const mockUsePlayerSearch = vi.mocked(usePlayerSearch)
const mockRegisterTournament = vi.mocked(registerTournament)
const mockConfirmZeroPayment = vi.mocked(confirmTournamentZeroPayment)
const mockUseScreenMessages = vi.mocked(useScreenMessages)
const mockUseRegistrationGate = vi.mocked(useRegistrationGate)
const mockRequireSignIn = vi.fn()

// Default: nothing gates registration — every pre-existing test in this file
// registers without a single tick, so isSatisfied must default true and
// payload empty (buildRegisterPayload still attaches acknowledged_messages: []).
function defaultGate() {
  return {
    blocking: [],
    selectedIds: new Set<string>(),
    toggle: vi.fn(),
    isSatisfied: true,
    payload: [],
    outstanding: [],
    handleGateError: vi.fn(() => false),
    reset: vi.fn(),
  } as any
}

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

// Extracted so a test that needs to force a re-render after changing a mock's
// return value (rerender(pageTree())) reconstructs the exact same tree —
// same reason renderPage() itself uses it.
function pageTree() {
  return (
    <MemoryRouter initialEntries={['/tournaments/t-1']}>
      <Routes>
        <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
        <Route path="/payment-method" element={<RouteProbe />} />
        <Route path="/payments/confirming" element={<RouteProbe />} />
        <Route path="/profile/edit" element={<RouteProbe />} />
      </Routes>
    </MemoryRouter>
  )
}

function renderPage() {
  return render(pageTree())
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireSignIn.mockResolvedValue(undefined)
  mockUseAuthGate.mockReturnValue({ requireSignIn: mockRequireSignIn })
  mockUsePlayerSearch.mockReturnValue({ results: [], isLoading: false, isActive: false })
  mockUseAppSession.mockReturnValue(session('ready'))
  mockUseScreenMessages.mockReturnValue({ data: [] } as any)
  mockUseRegistrationGate.mockReturnValue(defaultGate())
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
    await waitFor(() =>
      expect(mockRegisterTournament).toHaveBeenCalledWith('t-1', {
        partner_type: 'none',
        acknowledged_messages: [],
      }),
    )
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
        acknowledged_messages: [],
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

describe('TournamentDetailPage screen messages', () => {
  it('queries by tournament scope and id, and renders a message the hook returns', () => {
    mockUseTournament.mockReturnValue(tr({ id: 't-1' }))
    mockUseScreenMessages.mockReturnValue({
      data: [
        {
          id: 'msg-1', version: 1, kind: 'info', display_mode: 'inline',
          title: 'Courts closed this weekend', body: 'Maintenance in progress.',
          is_dismissible: false, requires_acknowledgment: false,
          gate_actions: [], is_acknowledged: false, acknowledged_at: null,
        },
      ],
    } as any)
    renderPage()
    expect(screen.getByText('Courts closed this weekend')).toBeInTheDocument()
    expect(mockUseScreenMessages).toHaveBeenCalledWith({ scope: 'tournament', id: 't-1' })
  })

  it('renders no wrapper at all when the list is empty', () => {
    mockUseTournament.mockReturnValue(tr({ id: 't-1' }))
    mockUseScreenMessages.mockReturnValue({ data: [] } as any)
    renderPage()
    expect(screen.queryByTestId('screen-message-list')).toBeNull()
  })

  // Task 8 (SCREEN_MESSAGES_WEB_PLAN.md): the page must actually mount
  // ScreenMessageModalHost, and wire it to the SAME registration-gate
  // selection as ScreenMessageList — otherwise a gating modal's checkbox
  // would have nothing to toggle. Without this test, forgetting to mount
  // the host is invisible: every other test in this file returns only
  // inline messages.
  it('a modal message renders as a dialog, and ticking a gating checkbox drives the SAME registration-gate toggle as the inline card', () => {
    mockUseTournament.mockReturnValue(tr({ id: 't-1' }))
    const mockToggle = vi.fn()
    mockUseRegistrationGate.mockReturnValue({ ...defaultGate(), toggle: mockToggle } as any)
    mockUseScreenMessages.mockReturnValue({
      data: [
        {
          id: 'terms-1', version: 2, kind: 'terms', display_mode: 'modal',
          title: 'Tournament terms', body: 'Please read before registering.',
          is_dismissible: false, requires_acknowledgment: true,
          gate_actions: ['tournament_registration'], is_acknowledged: false,
          acknowledged_at: null,
        },
      ],
    } as any)
    renderPage()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('checkbox', { name: i18n.t('screenMessages.consent.tournament_registration') }),
    )
    expect(mockToggle).toHaveBeenCalledWith('terms-1', 2)
  })
})

describe('TournamentDetailPage registration gate', () => {
  // useRegistrationGate itself is mocked (see the top of this file) — its
  // own state machine (isSatisfied, payload, handleGateError) has its own
  // test file. These tests assert the page WIRES that state to the right
  // places: the button's disabled state, the press-time scroll, the
  // register payload, and the 409 catch-block branch.
  //
  // Product decision, 2026-08-29 (mirrors rally-mobile commit f27c8c2): the
  // message gate must never disable this button or grey it out — a gated
  // CTA the player can't press reads as broken, not as "there's a step
  // left." An unsatisfied gate is handled entirely at press time instead:
  // scroll to the blocking card (whose own error-toned border + Required
  // badge is the explanation) and never submit.
  it('never disables Register Now while the gate is unsatisfied, and shows no standing reason text', () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockUseRegistrationGate.mockReturnValue({
      ...defaultGate(),
      blocking: [{ id: 'msg-1', version: 3, title: 'Tournament terms' }],
      isSatisfied: false,
    } as any)
    renderPage()
    const cta = screen.getByRole('button', {
      name: i18n.t('tournament.tournamentDetailRegisterNow'),
    })
    expect(cta).not.toBeDisabled()
    expect(cta).not.toHaveAttribute('aria-describedby')
    expect(
      screen.queryByText(i18n.t('screenMessages.registrationGateRequired')),
    ).not.toBeInTheDocument()
  })

  // Same "never disabled" guarantee while the messages query itself hasn't
  // resolved yet (`blocking: []` + `isSatisfied: false` is exactly what the
  // real hook reports mid-fetch — see useRegistrationGate's fail-closed
  // comment). Nothing to scroll to yet, but the button must stay live.
  it('never disables Register Now while the gate is unresolved (messages still loading)', () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockUseRegistrationGate.mockReturnValue({
      ...defaultGate(),
      blocking: [],
      isSatisfied: false,
    } as any)
    renderPage()
    const cta = screen.getByRole('button', {
      name: i18n.t('tournament.tournamentDetailRegisterNow'),
    })
    expect(cta).not.toBeDisabled()
    expect(cta).not.toHaveAttribute('aria-describedby')
  })

  it('pressing Register Now while the gate is unsatisfied does not call the register API, and scrolls to the blocking message', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockUseScreenMessages.mockReturnValue({
      data: [
        {
          id: 'msg-1', version: 3, kind: 'terms', display_mode: 'inline',
          title: 'Tournament terms', body: 'Read the rules.', is_dismissible: false,
          requires_acknowledgment: true, gate_actions: ['tournament_registration'],
          is_acknowledged: false, acknowledged_at: null,
        },
      ],
    } as any)
    mockUseRegistrationGate.mockReturnValue({
      ...defaultGate(),
      blocking: [{ id: 'msg-1', version: 3, title: 'Tournament terms' }],
      isSatisfied: false,
    } as any)
    renderPage()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentDetailRegisterNow') }),
    )
    // handleRegisterNow runs past requireSignIn's `.then()`, a microtask —
    // wait for the scroll (its last observable effect) before asserting.
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled())
    expect(mockRegisterTournament).not.toHaveBeenCalled()
  })

  it('disables Register Now while a registration is already in flight', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    let resolveRegister: (value: unknown) => void = () => {}
    mockRegisterTournament.mockImplementation(
      () => new Promise((resolve) => { resolveRegister = resolve }) as any,
    )
    renderPage()
    const cta = screen.getByRole('button', {
      name: i18n.t('tournament.tournamentDetailRegisterNow'),
    })
    fireEvent.click(cta)
    await waitFor(() => expect(cta).toBeDisabled())
    // Let the pending mutation resolve so it doesn't leak into later tests.
    resolveRegister({
      success: true,
      data: {
        id: 'r-9', tournament_id: 't-1', status: 'registered', payment_status: 'pending',
        credits_applied: 0, service_fee: 5, amount_to_pay: 150, entry_fee: 150,
      },
      meta: null,
      error: null,
    })
  })

  it('the partner check still wins when both a partner and the gate are missing', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'doubles' }))
    const scrolledIds: string[] = []
    Element.prototype.scrollIntoView = vi.fn(function (this: HTMLElement) {
      scrolledIds.push(this.id)
    })
    mockUseRegistrationGate.mockReturnValue({
      ...defaultGate(),
      blocking: [{ id: 'msg-1', version: 3, title: 'Tournament terms' }],
      isSatisfied: false,
    } as any)
    renderPage()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('tournament.ctaMissingPartner') }),
    )
    // Same microtask gap as above — requireSignIn's `.then()` runs the scroll.
    await waitFor(() => expect(scrolledIds.length).toBeGreaterThan(0))
    expect(mockRegisterTournament).not.toHaveBeenCalled()
    // Only the partner section was scrolled to — the gate's own scroll
    // branch in handleRegisterNow is never reached while a partner is
    // required, same as before the gate existed.
    expect(scrolledIds).toEqual(['partner-section'])
  })

  it('register sends acknowledged_messages built from the gate payload', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockUseRegistrationGate.mockReturnValue({
      ...defaultGate(),
      selectedIds: new Set(['msg-1']),
      isSatisfied: true,
      payload: [{ id: 'msg-1', version: 3 }],
    } as any)
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
    await waitFor(() =>
      expect(mockRegisterTournament).toHaveBeenCalledWith('t-1', {
        partner_type: 'none',
        acknowledged_messages: [{ id: 'msg-1', version: 3 }],
      }),
    )
  })

  it('a 409 ACKNOWLEDGMENT_REQUIRED shows the gate prompt instead of the generic backend-error text, and never auto-retries', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    const handleGateError = vi.fn(() => true)
    mockUseRegistrationGate.mockReturnValue({ ...defaultGate(), handleGateError } as any)
    mockRegisterTournament.mockRejectedValue({
      status: 409,
      code: 'ACKNOWLEDGMENT_REQUIRED',
      message: 'Acknowledgment required',
      details: { messages: [{ id: 'msg-1', version: 4, title: 'Tournament terms' }] },
    })
    renderPage()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentDetailRegisterNow') }),
    )
    expect(
      await screen.findByText(i18n.t('screenMessages.registrationGateRequired')),
    ).toBeInTheDocument()
    expect(handleGateError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ACKNOWLEDGMENT_REQUIRED' }),
    )
    // One attempt, one rejection — nothing here retries on its own.
    expect(mockRegisterTournament).toHaveBeenCalledTimes(1)
  })

  it('a 409 that handleGateError does not recognize falls through to the ordinary backend-error text', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    mockUseRegistrationGate.mockReturnValue({
      ...defaultGate(),
      handleGateError: vi.fn(() => false),
    } as any)
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

  // Regression test for review finding 1: setRegisterError(null) only runs
  // inside handleRegisterNow, past the isSatisfied guard — so a tick made
  // AFTER a 409 (which never calls handleRegisterNow again on its own) used
  // to leave the stale "you must accept the terms" sentence on screen under
  // a button that had just re-enabled.
  it('clears the 409 gate note once ticking makes the gate satisfied again, but not before', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    const handleGateError = vi.fn(() => true)
    // Satisfied client-side at click time — the 409 is precisely the
    // server-side race the client can't see coming.
    mockUseRegistrationGate.mockReturnValue({
      ...defaultGate(),
      isSatisfied: true,
      blocking: [{ id: 'msg-1', version: 3, title: 'Tournament terms' }],
      handleGateError,
    } as any)
    mockRegisterTournament.mockRejectedValue({
      status: 409,
      code: 'ACKNOWLEDGMENT_REQUIRED',
      message: 'Acknowledgment required',
      details: { messages: [{ id: 'msg-1', version: 4, title: 'Tournament terms' }] },
    })
    const { rerender } = renderPage()
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentDetailRegisterNow') }),
    )
    expect(
      await screen.findByText(i18n.t('screenMessages.registrationGateRequired')),
    ).toBeInTheDocument()

    // A real gate would have gone unsatisfied right here (handleGateError
    // clears ticks) — simulate that landing. The note must still be showing.
    mockUseRegistrationGate.mockReturnValue({
      ...defaultGate(),
      isSatisfied: false,
      blocking: [{ id: 'msg-1', version: 4, title: 'Tournament terms' }],
      handleGateError,
    } as any)
    rerender(pageTree())
    expect(
      screen.getByText(i18n.t('screenMessages.registrationGateRequired')),
    ).toBeInTheDocument()

    // The player re-ticks the (new-version) box — isSatisfied flips true.
    mockUseRegistrationGate.mockReturnValue({
      ...defaultGate(),
      isSatisfied: true,
      blocking: [{ id: 'msg-1', version: 4, title: 'Tournament terms' }],
      handleGateError,
    } as any)
    rerender(pageTree())
    await waitFor(() =>
      expect(
        screen.queryByText(i18n.t('screenMessages.registrationGateRequired')),
      ).not.toBeInTheDocument(),
    )
    // And the button is live again, with nothing stale sitting under it.
    expect(
      screen.getByRole('button', { name: i18n.t('tournament.tournamentDetailRegisterNow') }),
    ).not.toBeDisabled()
  })

  // Regression coverage for spec item 5 / review finding 3: every other test
  // here has outstanding: [], so the scroll effect never actually ran before.
  it('scrolls to the outstanding card once it exists in the DOM, and only once', async () => {
    mockUseTournament.mockReturnValue(tr({ format: 'singles' }))
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    // Same array REFERENCE reused across every mock below on purpose: the
    // real hook only calls setOutstanding() once, in handleGateError — a
    // later blocking-only change (the refetch landing) does NOT produce a
    // new `outstanding` reference in reality. If this test built a fresh
    // `outstanding` array literal on every mockReturnValue call instead, the
    // effect would re-run because THAT reference changed, not because
    // `gate.blocking` is in its dependency array — masking exactly the bug
    // this test exists to catch.
    const outstanding = [{ id: 'msg-1', version: 4, title: 'Tournament terms' }]

    // A 409 just named msg-1 as outstanding, but the refetch it triggered
    // hasn't landed yet — the message isn't in the rendered list, so its
    // card doesn't exist. This is the newly-published-message race; an
    // edited message's card would already be there.
    mockUseScreenMessages.mockReturnValue({ data: [] } as any)
    mockUseRegistrationGate.mockReturnValue({
      ...defaultGate(),
      blocking: [],
      outstanding,
    } as any)
    const { rerender } = renderPage()
    await waitFor(() => expect(scrollIntoView).not.toHaveBeenCalled())

    // The refetch lands: the card now exists. `outstanding` itself is the
    // SAME array as before — only `blocking` changed.
    mockUseScreenMessages.mockReturnValue({
      data: [
        {
          id: 'msg-1', version: 4, kind: 'terms', display_mode: 'inline',
          title: 'Tournament terms', body: 'Read the rules.', is_dismissible: false, requires_acknowledgment: true,
          gate_actions: ['tournament_registration'], is_acknowledged: false,
          acknowledged_at: null,
        },
      ],
    } as any)
    mockUseRegistrationGate.mockReturnValue({
      ...defaultGate(),
      blocking: [{ id: 'msg-1', version: 4, title: 'Tournament terms' }],
      outstanding,
    } as any)
    rerender(pageTree())
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
    expect(document.getElementById('screen-message-msg-1')).toBeInTheDocument()

    // A further, unrelated background refetch — a NEW `blocking` array
    // reference (e.g. some other field on the same message changed), same
    // `outstanding` target. This is what actually exercises the one-shot
    // guard: it changes the effect's own dependencies, so the effect DOES
    // re-run, and only the guard stops it from scrolling a second time.
    // (Re-rendering with nothing at all changed doesn't exercise this at
    // all — the effect wouldn't even re-run.)
    mockUseRegistrationGate.mockReturnValue({
      ...defaultGate(),
      blocking: [{ id: 'msg-1', version: 4, title: 'Tournament terms' }],
      outstanding,
    } as any)
    rerender(pageTree())
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })
})
