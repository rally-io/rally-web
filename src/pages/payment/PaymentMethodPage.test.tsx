import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from '@/i18n'

vi.mock('@/services/api/payments', () => ({
  getSavedCards: vi.fn(),
  chargeSavedCard: vi.fn(),
  initiatePayment: vi.fn(),
  deleteSavedCard: vi.fn(),
}))
vi.mock('@/services/api/bookings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api/bookings')>()
  return { ...actual, releaseBookingHold: vi.fn() }
})
vi.mock('@/services/api/events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api/events')>()
  return { ...actual, releaseEvent: vi.fn() }
})

import PaymentMethodPage from './PaymentMethodPage'
import {
  getSavedCards,
  chargeSavedCard,
  initiatePayment,
} from '@/services/api/payments'
import { releaseBookingHold } from '@/services/api/bookings'
import { releaseEvent } from '@/services/api/events'
import type { SavedCard } from '@/types/api'

const mockGet = vi.mocked(getSavedCards)
const mockCharge = vi.mocked(chargeSavedCard)
const mockInitiate = vi.mocked(initiatePayment)

function tokenCard(over: Partial<SavedCard> = {}): SavedCard {
  return {
    id: 'card-token',
    card_last4: '4242',
    card_expiry: '0526',
    brand: 'Visa',
    issuer: null,
    is_default: true,
    created_at: '2026-01-01T00:00:00Z',
    has_token: true,
    ...over,
  }
}

function noTokenCard(over: Partial<SavedCard> = {}): SavedCard {
  return {
    ...tokenCard({ id: 'card-notoken', is_default: false, has_token: false }),
    ...over,
  }
}

// Captures the location (including state) when navigation lands on /payments/confirming
function ConfirmingSentinel({ onLocation }: { onLocation?: (loc: ReturnType<typeof useLocation>) => void }) {
  const loc = useLocation()
  if (onLocation) onLocation(loc)
  return <div data-testid="confirming-sentinel" data-state={JSON.stringify(loc.state)} />
}

function renderPage(
  search = '?type=tournament_registration&entity_id=r-1&amount=150&tournament_id=t-1&use_credits=false',
  onConfirmingLocation?: (loc: ReturnType<typeof useLocation>) => void,
) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/payment-method${search}`]}>
        <Routes>
          <Route path="/payment-method" element={<PaymentMethodPage />} />
          <Route path="/payments/confirming" element={<ConfirmingSentinel onLocation={onConfirmingLocation} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
})

describe('PaymentMethodPage — empty cards state', () => {
  it('hides the Recommended section when no cards are saved', async () => {
    mockGet.mockResolvedValue({ success: true, data: [], meta: null, error: null })
    renderPage()
    await waitFor(() =>
      expect(screen.queryByText(/Recommended Payment Option/i)).toBeNull(),
    )
    expect(screen.getByRole('button', { name: /pay with card/i })).toBeInTheDocument()
  })
})

describe('PaymentMethodPage — token card preselection', () => {
  it('preselects the first token-capable card even when a non-token default exists', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [
        noTokenCard({ id: 'card-notoken', is_default: true }),
        tokenCard({ id: 'card-token', is_default: false }),
      ],
      meta: null,
      error: null,
    })
    renderPage()
    const tokenRow = await screen.findByRole('button', { pressed: true })
    expect(tokenRow.textContent).toMatch(/4242/)
  })
})

describe('PaymentMethodPage — silent charge success', () => {
  it('calls chargeSavedCard on Pay Now when selected card has a token', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({
      success: true,
      data: [tokenCard()],
      meta: null,
      error: null,
    })
    mockCharge.mockResolvedValue({
      success: true,
      data: { grow_asmachta: 'A1', amount: 150 },
      meta: null,
      error: null,
    })
    renderPage()
    const payBtn = await screen.findByRole('button', { name: /Pay .* Now/i })
    await user.click(payBtn)
    await waitFor(() => {
      expect(mockCharge).toHaveBeenCalledWith(
        {
          type: 'tournament_registration',
          id: 'r-1',
          use_credits: false,
        },
        'card-token',
      )
    })
  })
})

describe('PaymentMethodPage — 402 inline error', () => {
  it('shows inline "declined" error and refreshes saved cards on 402', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({
      success: true,
      data: [tokenCard()],
      meta: null,
      error: null,
    })
    mockCharge.mockResolvedValue({
      success: false,
      error: { code: 'PAYMENT_DECLINED', message: 'declined', details: null },
    } as any)
    renderPage()
    const payBtn = await screen.findByRole('button', { name: /Pay .* Now/i })
    await user.click(payBtn)
    await screen.findByText(/card was declined/i)
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2)
    })
  })
})

describe('PaymentMethodPage — tokenless fallback', () => {
  it('Pay Now calls initiatePayment + window.location.assign when no token', async () => {
    const user = userEvent.setup()
    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { assign: assignSpy, href: 'http://localhost/' },
      writable: true,
    })
    mockGet.mockResolvedValue({
      success: true,
      data: [noTokenCard()],
      meta: null,
      error: null,
    })
    mockInitiate.mockResolvedValue({
      success: true,
      data: { payment_url: 'https://meshulam.co.il/checkout/xyz' },
      meta: null,
      error: null,
    })
    renderPage()
    const payBtn = await screen.findByRole('button', { name: /Pay .* Now/i })
    await user.click(payBtn)
    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith('https://meshulam.co.il/checkout/xyz')
    })
  })
})

describe('PaymentMethodPage — double-click guard', () => {
  it('disables Pay Now while the charge is in flight', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [tokenCard()],
      meta: null,
      error: null,
    })
    let resolveCharge: (v: any) => void = () => {}
    mockCharge.mockImplementation(
      () => new Promise((r) => { resolveCharge = r }),
    )
    renderPage()
    const payBtn = await screen.findByRole('button', { name: /Pay .* Now/i }) as HTMLButtonElement
    fireEvent.click(payBtn)
    await waitFor(() => expect(payBtn.disabled).toBe(true))
    resolveCharge({
      success: true,
      data: { grow_asmachta: 'A1', amount: 150 },
      meta: null,
      error: null,
    })
  })
})

describe('PaymentMethodPage — save-card consent (booking only)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    ;(getSavedCards as any).mockResolvedValueOnce({ success: true, data: [] })
  })

  it('renders the save-card consent row for booking', async () => {
    const search = '?type=booking&entity_id=b-1&amount=120'
    renderPage(search)
    expect(await screen.findByText(/save my card for future payments/i)).toBeInTheDocument()
  })

  it('does NOT render the consent row for tournament_registration', async () => {
    ;(getSavedCards as any).mockResolvedValueOnce({ success: true, data: [] }) // second call
    const search = '?type=tournament_registration&entity_id=r-1&amount=80&tournament_id=t-1'
    renderPage(search)
    await screen.findByRole('main') // wait for render
    expect(screen.queryByText(/save my card for future payments/i)).not.toBeInTheDocument()
  })

  it('passes save_card=true to initiatePayment when checkbox is checked and Pay-with-Card is clicked', async () => {
    ;(initiatePayment as any).mockResolvedValueOnce({
      success: true,
      data: { payment_url: 'https://grow.test/checkout/x' },
    })
    const search = '?type=booking&entity_id=b-1&amount=120'
    renderPage(search)
    const checkbox = await screen.findByLabelText(/save my card for future payments/i)
    fireEvent.click(checkbox)
    fireEvent.click(screen.getByRole('button', { name: /pay with card/i }))
    await vi.waitFor(() => {
      expect(initiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'booking', id: 'b-1' }),
        expect.objectContaining({ save_card: true }),
      )
    })
  })
})

describe('PaymentMethodPage — back button release', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    ;(getSavedCards as any).mockResolvedValueOnce({ success: true, data: [] })
  })

  it('shows booking leave message and calls releaseBookingHold on confirm', async () => {
    ;(releaseBookingHold as any).mockResolvedValueOnce({ success: true, data: { released: true } })
    renderPage('?type=booking&entity_id=b-1&amount=120')
    fireEvent.click(await screen.findByLabelText(/back/i))
    expect(await screen.findByText(/booking is not confirmed/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(i18n.t('payment.cancelButton')))
    await vi.waitFor(() => {
      expect(releaseBookingHold).toHaveBeenCalledWith('b-1')
    })
  })

  it('shows event leave message and calls releaseEvent on confirm', async () => {
    ;(releaseEvent as any).mockResolvedValueOnce({ success: true, data: { released: true } })
    renderPage('?type=event_participation&entity_id=p-1&amount=50&event_id=e-1')
    fireEvent.click(await screen.findByLabelText(/back/i))
    expect(await screen.findByText(/your spot is not confirmed/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(i18n.t('payment.cancelButton')))
    await vi.waitFor(() => {
      expect(releaseEvent).toHaveBeenCalledWith('e-1')
    })
  })

  it('tournament back does not open the dialog (just navigates back)', async () => {
    renderPage('?type=tournament_registration&entity_id=r-1&amount=80&tournament_id=t-1')
    fireEvent.click(await screen.findByLabelText(/back/i))
    expect(screen.queryByText(/are you sure you want to leave/i)).not.toBeInTheDocument()
  })
})

describe('PaymentMethodPage — grow_asmachta in navigate state', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
  })

  it('passes grow_asmachta and amount in navigate state after saved-card charge', async () => {
    const user = userEvent.setup()
    // Use mockResolvedValue (not Once) so React Query refetches don't return undefined
    mockGet.mockResolvedValue({
      success: true,
      data: [tokenCard()],
      meta: null,
      error: null,
    })
    mockCharge.mockResolvedValue({
      success: true,
      data: { grow_asmachta: 'A123', amount: 150 },
      meta: null,
      error: null,
    })

    let capturedState: any = undefined
    renderPage(
      '?type=tournament_registration&entity_id=r-1&amount=150&tournament_id=t-1&use_credits=false',
      (loc) => { capturedState = loc.state },
    )

    // Wait for the card to load (Pay Now button enabled = card selected)
    const payBtn = await screen.findByRole('button', { name: /Pay .* Now/i })
    await waitFor(() => expect((payBtn as HTMLButtonElement).disabled).toBe(false))
    await user.click(payBtn)

    await waitFor(() => {
      expect(screen.getByTestId('confirming-sentinel')).toBeInTheDocument()
    })

    expect(capturedState).toMatchObject({ asmachta: 'A123', amount: 150 })
  })
})

describe('PaymentMethodPage — initiating overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    ;(getSavedCards as any).mockResolvedValueOnce({ success: true, data: [] })
  })

  it('renders the full-screen "preparing payment" overlay while initiate is in-flight', async () => {
    let resolveInit!: (v: any) => void
    ;(initiatePayment as any).mockImplementationOnce(
      () => new Promise((res) => { resolveInit = res }),
    )
    renderPage('?type=booking&entity_id=b-1&amount=120')
    fireEvent.click(await screen.findByRole('button', { name: /pay with card/i }))
    // The overlay should appear while the promise is pending
    expect(await screen.findByText(/preparing/i)).toBeInTheDocument()
    // Resolve to avoid promise leak
    resolveInit({ success: true, data: { payment_url: 'https://grow.test/x' } })
  })
})

describe('PaymentMethodPage — pre-auth tournament hides saved cards (G4)', () => {
  it('hides saved cards + bottom Pay Now when requires_approval_event=true', async () => {
    mockGet.mockResolvedValue({ success: true, data: [tokenCard()], meta: null, error: null })
    renderPage(
      '?type=tournament_registration&entity_id=r-1&amount=150&tournament_id=t-1&use_credits=false&requires_approval_event=true',
    )
    expect(await screen.findByRole('button', { name: /pay with card/i })).toBeInTheDocument()
    expect(screen.queryByText(/Recommended Payment Option/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /Pay .* Now/i })).toBeNull()
  })

  it('shows saved cards + Pay Now for a non-approval tournament', async () => {
    const user = userEvent.setup()
    mockGet.mockResolvedValue({ success: true, data: [tokenCard()], meta: null, error: null })
    mockCharge.mockResolvedValue({ success: true, data: { grow_asmachta: 'A1', amount: 150 }, meta: null, error: null })
    renderPage(
      '?type=tournament_registration&entity_id=r-1&amount=150&tournament_id=t-1&use_credits=false&requires_approval_event=false',
    )
    const payBtn = await screen.findByRole('button', { name: /Pay .* Now/i })
    await user.click(payBtn)
    await waitFor(() => expect(mockCharge).toHaveBeenCalled())
  })
})

describe('PaymentMethodPage — events are saved-card-only (G8 web part)', () => {
  it('does not render "Pay with Card" for event_participation', async () => {
    mockGet.mockResolvedValue({ success: true, data: [tokenCard()], meta: null, error: null })
    renderPage('?type=event_participation&entity_id=p-1&amount=50&event_id=e-1')
    await screen.findByRole('main')
    expect(screen.queryByRole('button', { name: /pay with card/i })).toBeNull()
  })

  it('shows guidance when an event has no saved card', async () => {
    mockGet.mockResolvedValue({ success: true, data: [], meta: null, error: null })
    renderPage('?type=event_participation&entity_id=p-1&amount=50&event_id=e-1')
    expect(await screen.findByText(/only with a saved card/i)).toBeInTheDocument()
  })
})