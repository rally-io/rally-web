import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from '@/i18n'

// Unlike TournamentDetailPage.test.tsx, this file deliberately does NOT mock
// useScreenMessages, useRegistrationGate, or useMessageActions — every other
// test of this page proves the PAGE reacts correctly to a controlled gate
// object, but none of them prove the real ScreenMessageCard checkbox and the
// real useRegistrationGate hook actually wire together. That needs a real
// QueryClientProvider and only the lowest layer (the API calls) mocked.
vi.mock('@/hooks/useTournament', () => ({ useTournament: vi.fn() }))
vi.mock('@/hooks/useTournamentParticipants', () => ({
  useTournamentParticipants: () => ({ data: null }),
}))
vi.mock('@/hooks/useAppSession', () => ({ useAppSession: vi.fn() }))
vi.mock('@/hooks/useAuthGate', () => ({ useAuthGate: vi.fn() }))
vi.mock('@/hooks/usePlayerSearch', () => ({
  usePlayerSearch: vi.fn(() => ({ results: [], isLoading: false, isActive: false })),
}))
vi.mock('@/services/api/tournaments', () => ({ registerTournament: vi.fn() }))
vi.mock('@/services/api/payments', () => ({ confirmTournamentZeroPayment: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ session: { id: 'user-1' } }) }))
vi.mock('@/features/screenMessages/api/messages', () => ({
  getScreenMessages: vi.fn(),
  acknowledgeMessage: vi.fn(),
  dismissMessage: vi.fn(),
}))

import TournamentDetailPage from './TournamentDetailPage'
import { useTournament } from '@/hooks/useTournament'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useAppSession } from '@/hooks/useAppSession'
import { registerTournament } from '@/services/api/tournaments'
import { getScreenMessages } from '@/features/screenMessages/api/messages'

const mockUseTournament = vi.mocked(useTournament)
const mockUseAuthGate = vi.mocked(useAuthGate)
const mockUseAppSession = vi.mocked(useAppSession)
const mockRegisterTournament = vi.mocked(registerTournament)
const mockGetScreenMessages = vi.mocked(getScreenMessages)

function tr(over: Record<string, unknown> = {}) {
  return {
    data: {
      id: 't-1', name: 'Rally Open', format: 'singles',
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

function gatingMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1', version: 3, kind: 'terms', display_mode: 'inline',
    title: 'Tournament terms', body: 'Please read the rules before registering.',
    locale: 'en', is_dismissible: false, requires_acknowledgment: true,
    gate_actions: ['tournament_registration'], is_acknowledged: false,
    acknowledged_at: null,
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tournaments/t-1']}>
        <Routes>
          <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
          <Route path="/payment-method" element={<div data-testid="route-probe" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuthGate.mockReturnValue({ requireSignIn: vi.fn().mockResolvedValue(undefined) })
  mockUseAppSession.mockReturnValue({
    status: 'ready',
    onboardingStatus: null,
    playerProfile: null,
    refetchOnboarding: vi.fn(),
    clearSession: vi.fn(),
  } as any)
  mockUseTournament.mockReturnValue(tr())
  Element.prototype.scrollIntoView = vi.fn()
})

describe('TournamentDetailPage registration gate — real ScreenMessageCard + real useRegistrationGate', () => {
  it('ticking the real checkbox flows through the real hook and lands in the real register payload', async () => {
    mockGetScreenMessages.mockResolvedValue({
      success: true,
      data: [gatingMessage()],
      meta: null,
      error: null,
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

    // The real card renders a real checkbox for the real gating message.
    const checkbox = await screen.findByRole('checkbox')
    const cta = screen.getByRole('button', {
      name: i18n.t('tournament.tournamentDetailRegisterNow'),
    })
    // The gate never disables this button (product decision, 2026-08-29) —
    // pressing it before ticking scrolls to the real card instead of
    // submitting.
    expect(cta).not.toBeDisabled()
    fireEvent.click(cta)
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled())
    expect(mockRegisterTournament).not.toHaveBeenCalled()

    fireEvent.click(checkbox)

    fireEvent.click(cta)
    await waitFor(() =>
      expect(mockRegisterTournament).toHaveBeenCalledWith('t-1', {
        partner_type: 'none',
        acknowledged_messages: [{ id: 'msg-1', version: 3 }],
      }),
    )
  })

  it('never calls the acknowledge endpoint when the real checkbox is ticked', async () => {
    mockGetScreenMessages.mockResolvedValue({
      success: true,
      data: [gatingMessage()],
      meta: null,
      error: null,
    } as any)
    const messagesApi = await import('@/features/screenMessages/api/messages')

    renderPage()
    const checkbox = await screen.findByRole('checkbox')
    fireEvent.click(checkbox)

    // Give any accidental network call a tick to have fired.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(vi.mocked(messagesApi.acknowledgeMessage)).not.toHaveBeenCalled()
  })

  it('a real 409 from the register call shows the gate note but never disables the button, and a second press does not resubmit', async () => {
    mockGetScreenMessages.mockResolvedValue({
      success: true,
      data: [gatingMessage()],
      meta: null,
      error: null,
    } as any)
    mockRegisterTournament.mockRejectedValue({
      status: 409,
      code: 'ACKNOWLEDGMENT_REQUIRED',
      message: 'Acknowledgment required',
      details: { messages: [{ id: 'msg-1', version: 4, title: 'Tournament terms' }] },
    })

    renderPage()
    const checkbox = await screen.findByRole('checkbox')
    const cta = screen.getByRole('button', {
      name: i18n.t('tournament.tournamentDetailRegisterNow'),
    })
    fireEvent.click(checkbox)
    expect(cta).not.toBeDisabled()

    fireEvent.click(cta)

    expect(
      await screen.findByText(i18n.t('screenMessages.registrationGateRequired')),
    ).toBeInTheDocument()
    // The real hook actually cleared the tick, so the real gate is
    // unsatisfied again — but the button must stay live (product decision,
    // 2026-08-29), never a dead grey button.
    expect(cta).not.toBeDisabled()

    // Pressing again must not auto-retry — the player hasn't re-read the
    // new text yet. It scrolls to the (now-unticked) card instead.
    fireEvent.click(cta)
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled())
    expect(mockRegisterTournament).toHaveBeenCalledTimes(1)
  })
})
