// src/pages/payment/PaymentConfirmingPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from '@/i18n'

// Mock useEntityPolling so the component doesn't actually poll and immediately
// transitions to the 'confirmed' state.
vi.mock('@/hooks/useEntityPolling', () => ({
  useEntityPolling: vi.fn(),
}))

import PaymentConfirmingPage from './PaymentConfirmingPage'
import { useEntityPolling } from '@/hooks/useEntityPolling'

const mockUseEntityPolling = vi.mocked(useEntityPolling)

function renderConfirming(
  search = '?type=booking&id=b-1',
  state: Record<string, unknown> | null = null,
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const initialEntry = { pathname: '/payments/confirming', search, state }
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/payments/confirming" element={<PaymentConfirmingPage />} />
          <Route path="/my-activity" element={<div>MY ACTIVITY</div>} />
          <Route path="/join/:slug" element={<div>EVENT PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
})

describe('PaymentConfirmingPage — confirmed state', () => {
  it('shows the success heading when polling resolves to confirmed', () => {
    mockUseEntityPolling.mockReturnValue({ status: 'confirmed', attempts: 1, entity: null })
    renderConfirming()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/payment confirmed/i)
  })

  it('renders the asmachta reference number when location state includes asmachta', () => {
    mockUseEntityPolling.mockReturnValue({ status: 'confirmed', attempts: 1, entity: null })
    renderConfirming('?type=booking&id=b-1', { asmachta: 'GRW-9999', amount: 150 })
    expect(screen.getByText('#GRW-9999')).toBeInTheDocument()
  })

  it('does NOT render an asmachta element when location state is absent', () => {
    mockUseEntityPolling.mockReturnValue({ status: 'confirmed', attempts: 1, entity: null })
    renderConfirming('?type=booking&id=b-1', null)
    expect(screen.queryByText(/^#/)).not.toBeInTheDocument()
  })
})

describe('PaymentConfirmingPage — polling state', () => {
  it('shows spinner while polling', () => {
    mockUseEntityPolling.mockReturnValue({ status: 'polling', attempts: 0, entity: null })
    renderConfirming()
    // The spinner div has animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })
})

describe('PaymentConfirmingPage — timeout state', () => {
  it('shows still-processing message on timeout', () => {
    mockUseEntityPolling.mockReturnValue({ status: 'timeout', attempts: 10, entity: null })
    renderConfirming()
    // heading is h1 with stillProcessing key
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('renders payment.stillProcessingSubtitle on timeout', () => {
    mockUseEntityPolling.mockReturnValue({ status: 'timeout', attempts: 10, entity: null })
    renderConfirming()
    expect(screen.getByText(/your booking is being confirmed/i)).toBeInTheDocument()
  })
})

describe('PaymentConfirmingPage — tournament pending vs confirmed (G3)', () => {
  it('shows "Registration Submitted" for a payment_held registration', () => {
    mockUseEntityPolling.mockReturnValue({
      status: 'confirmed',
      attempts: 1,
      entity: { status: 'registered', payment_status: 'payment_held' },
    })
    renderConfirming('?type=tournament_registration&id=r-1&tournament_id=t-1')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/registration submitted/i)
  })

  it('shows "Registration Confirmed" for a completed registration', () => {
    mockUseEntityPolling.mockReturnValue({
      status: 'confirmed',
      attempts: 1,
      entity: { status: 'confirmed', payment_status: 'completed' },
    })
    renderConfirming('?type=tournament_registration&id=r-1&tournament_id=t-1')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/registration confirmed/i)
  })

  it('a fully waived pair is "submitted", not "confirmed", while the club still has to check residency', () => {
    // confirm-zero-payment leaves a ₪0 pair on registered + completed. Before the
    // fix that short-circuited to "Registration Confirmed" seconds after they
    // uploaded their proof of address.
    mockUseEntityPolling.mockReturnValue({
      status: 'confirmed',
      attempts: 1,
      entity: { status: 'registered', payment_status: 'completed', fee_waiver_status: 'pending' },
    })
    renderConfirming('?type=tournament_registration&id=r-1&tournament_id=t-1')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/registration submitted/i)
  })

  it('an approved waiver reads as confirmed like any other completed registration', () => {
    mockUseEntityPolling.mockReturnValue({
      status: 'confirmed',
      attempts: 1,
      entity: { status: 'confirmed', payment_status: 'completed', fee_waiver_status: 'approved' },
    })
    renderConfirming('?type=tournament_registration&id=r-1&tournament_id=t-1')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/registration confirmed/i)
  })

  it('falls back to pending copy for a tournament when entity is null (error fallback)', () => {
    mockUseEntityPolling.mockReturnValue({ status: 'confirmed', attempts: 1, entity: null })
    renderConfirming('?type=tournament_registration&id=r-1&tournament_id=t-1')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/registration submitted/i)
  })

  it('still shows generic success for a booking', () => {
    mockUseEntityPolling.mockReturnValue({
      status: 'confirmed',
      attempts: 1,
      entity: { status: 'confirmed', payment_status: 'completed' },
    })
    renderConfirming('?type=booking&id=b-1')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/payment confirmed/i)
  })

  it('a queued sign-up with the hold in place says it is on the waiting list', () => {
    mockUseEntityPolling.mockReturnValue({
      status: 'confirmed',
      attempts: 1,
      entity: { status: 'registered', payment_status: 'payment_held', waitlist_position: 3 },
    })
    renderConfirming('?type=tournament_registration&id=r-1&tournament_id=t-1')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(i18n.t('payment.waitlistHoldConfirmedTitle'))
    expect(screen.getByText(i18n.t('payment.waitlistSignupSubtitle'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('payment.registrationSubmittedSubtitle'))).not.toBeInTheDocument()
  })

  it('a free queued sign-up (registered + completed) is never "Registration Confirmed"', () => {
    mockUseEntityPolling.mockReturnValue({
      status: 'confirmed',
      attempts: 1,
      entity: { status: 'registered', payment_status: 'completed', waitlist_position: 2 },
    })
    renderConfirming('?type=tournament_registration&id=r-1&tournament_id=t-1')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(i18n.t('payment.waitlistHoldConfirmedTitle'))
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent(/registration confirmed/i)
  })

  it('a free queued sign-up is not told its payment is settled later', () => {
    mockUseEntityPolling.mockReturnValue({
      status: 'confirmed',
      attempts: 1,
      entity: { status: 'registered', payment_status: 'completed', waitlist_position: 2 },
    })
    renderConfirming('?type=tournament_registration&id=r-1&tournament_id=t-1')
    expect(screen.getByText(i18n.t('payment.waitlistSignupFreeSubtitle'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('payment.waitlistSignupSubtitle'))).not.toBeInTheDocument()
  })
})

describe('PaymentConfirmingPage — return_to', () => {
  it('offers "back to the event" and navigates to a same-origin return_to', () => {
    mockUseEntityPolling.mockReturnValue({
      status: 'confirmed', attempts: 1,
      entity: { status: 'registered', payment_status: 'payment_held' },
    })
    renderConfirming('?type=tournament_registration&id=r-1&tournament_id=t-1&return_to=%2Fjoin%2Facme')
    const cta = screen.getByRole('button', { name: /back to the event/i })
    fireEvent.click(cta)
    expect(screen.getByText('EVENT PAGE')).toBeInTheDocument()
  })

  it('ignores an off-origin return_to and keeps the activity CTA', () => {
    mockUseEntityPolling.mockReturnValue({ status: 'confirmed', attempts: 1, entity: null })
    renderConfirming('?type=booking&id=b-1&return_to=https%3A%2F%2Fevil.example')
    expect(screen.queryByRole('button', { name: /back to the event/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /activity/i })).toBeInTheDocument()
  })
})

// A coupon confirmed on the payment page lands here without a page load, so the
// tournament in memory still says "awaiting payment" (staleTime, src/main.tsx).
describe('PaymentConfirmingPage — the tournament behind it', () => {
  const SEARCH = '?type=tournament_registration&id=r-1&tournament_id=t-1'

  it.each(['confirmed', 'timeout'] as const)('%s: marks it out of date', (status) => {
    const invalidate = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    mockUseEntityPolling.mockReturnValue({ status, attempts: 1, entity: null })
    renderConfirming(SEARCH)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tournament', 't-1'] })
    invalidate.mockRestore()
  })

  it('leaves it while still polling, and when there is no tournament', () => {
    const invalidate = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    mockUseEntityPolling.mockReturnValue({ status: 'polling', attempts: 1, entity: null })
    renderConfirming(SEARCH)
    mockUseEntityPolling.mockReturnValue({ status: 'confirmed', attempts: 1, entity: null })
    renderConfirming('?type=booking&id=b-1')
    expect(invalidate).not.toHaveBeenCalled()
    invalidate.mockRestore()
  })
})
