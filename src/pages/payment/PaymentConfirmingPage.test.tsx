// src/pages/payment/PaymentConfirmingPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
})
