import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from '@/i18n'

vi.mock('@/services/api/payments', () => ({
  initiateTournamentRegistrationPayment: vi.fn(),
}))

import PaymentMethodPage from './PaymentMethodPage'
import { initiateTournamentRegistrationPayment } from '@/services/api/payments'
import { pendingPayment } from '@/hooks/usePendingPayment'

const mockInitiate = vi.mocked(initiateTournamentRegistrationPayment)

function renderAt(search: string) {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[`/payment-method${search}`]}>
          <Routes>
            <Route path="/payment-method" element={<PaymentMethodPage />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

const originalLocation = window.location

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  // jsdom throws on a real navigation — swap in a plain writable stub.
  // @ts-expect-error simplified stub for the test
  delete window.location
  ;(window as unknown as { location: Location }).location = {
    ...originalLocation,
    href: '',
  }
})

afterEach(() => {
  ;(window as unknown as { location: Location }).location = originalLocation
})

describe('PaymentMethodPage', () => {
  it('shows the hold notice and amount', () => {
    renderAt('?registration_id=r-1&tournament_id=t-1&amount=150')
    expect(screen.getByText(i18n.t('payment.paymentMethodHoldNotice'))).toBeInTheDocument()
    expect(screen.getByText(/150/)).toBeInTheDocument()
  })

  it('persists pending-payment context and redirects to the hosted checkout on success', async () => {
    mockInitiate.mockResolvedValue({
      success: true,
      data: { payment_url: 'https://grow.example/checkout/abc' },
      meta: null,
      error: null,
    })
    renderAt('?registration_id=r-1&tournament_id=t-1&amount=150')
    fireEvent.click(screen.getByRole('button', { name: i18n.t('payment.paymentMethodAddCardCta') }))

    await waitFor(() => expect(window.location.href).toBe('https://grow.example/checkout/abc'))
    expect(mockInitiate).toHaveBeenCalledWith('r-1')
    expect(pendingPayment.get()).toEqual({
      type: 'tournament_registration',
      entityId: 'r-1',
      tournamentId: 't-1',
      amount: 150,
    })
  })

  it('shows a checkout error when initiate fails', async () => {
    mockInitiate.mockResolvedValue({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'nope', details: null },
    })
    renderAt('?registration_id=r-1&tournament_id=t-1&amount=150')
    fireEvent.click(screen.getByRole('button', { name: i18n.t('payment.paymentMethodAddCardCta') }))
    expect(await screen.findByText(i18n.t('payment.checkoutError'))).toBeInTheDocument()
  })
})
