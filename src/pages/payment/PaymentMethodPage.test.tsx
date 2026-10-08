import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from '@/i18n'

vi.mock('@/services/api/payments', () => ({
  initiateTournamentRegistrationPayment: vi.fn(),
  initiateTournamentWaitlistHoldPayment: vi.fn(),
  confirmTournamentZeroPayment: vi.fn(),
}))

vi.mock('@/services/api/coupons', () => ({
  listCoupons: vi.fn(),
  previewCoupon: vi.fn(),
}))

import PaymentMethodPage from './PaymentMethodPage'
import {
  initiateTournamentRegistrationPayment, confirmTournamentZeroPayment,
} from '@/services/api/payments'
import { listCoupons, previewCoupon } from '@/services/api/coupons'
import { pendingPayment } from '@/hooks/usePendingPayment'

const mockInitiate = vi.mocked(initiateTournamentRegistrationPayment)
const mockConfirmZero = vi.mocked(confirmTournamentZeroPayment)
const mockListCoupons = vi.mocked(listCoupons)
const mockPreviewCoupon = vi.mocked(previewCoupon)

const couponPreview = {
  coupon_id: 'coupon-9',
  code: 'SAVE10',
  name: '10% off',
  discount_amount: 15,
  original_amount: 150,
  final_amount: 135,
  currency: 'ILS',
  rule_points: [],
}

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
  mockListCoupons.mockResolvedValue({ success: true, data: [], meta: null, error: null })
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
    expect(mockInitiate).toHaveBeenCalledWith('r-1', undefined)
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

  it('stores return_to in the pending-payment context before redirecting', async () => {
    mockInitiate.mockResolvedValue({ success: true, data: { payment_url: 'https://grow.example/checkout/abc' }, meta: null, error: null })
    renderAt('?registration_id=r-1&tournament_id=t-1&amount=150&return_to=%2Fjoin%2Facme')
    fireEvent.click(screen.getByRole('button', { name: i18n.t('payment.paymentMethodAddCardCta') }))
    await waitFor(() => expect(pendingPayment.get()?.returnTo).toBe('/join/acme'))
  })

  it('applying a coupon shows the breakdown and carries the coupon_id + discounted amount into checkout', async () => {
    mockPreviewCoupon.mockResolvedValue({ success: true, data: couponPreview, meta: null, error: null })
    mockInitiate.mockResolvedValue({
      success: true,
      data: { payment_url: 'https://grow.example/checkout/abc' },
      meta: null,
      error: null,
    })
    renderAt('?registration_id=r-1&tournament_id=t-1&amount=150')

    fireEvent.change(screen.getByPlaceholderText(i18n.t('coupon.placeholder')), {
      target: { value: 'save10' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('coupon.apply') }))

    await screen.findByText('SAVE10')
    expect(screen.getByText(i18n.t('coupon.totalDue'))).toBeInTheDocument()
    expect(screen.getByText('-₪15')).toBeInTheDocument()
    // The headline price and the breakdown's own total row both show it.
    expect(screen.getAllByText('₪135').length).toBeGreaterThanOrEqual(2)

    fireEvent.click(screen.getByRole('button', { name: i18n.t('payment.paymentMethodAddCardCta') }))
    await waitFor(() => expect(window.location.href).toBe('https://grow.example/checkout/abc'))
    expect(mockInitiate).toHaveBeenCalledWith('r-1', 'coupon-9')
    expect(pendingPayment.get()).toMatchObject({ amount: 135 })
  })

  it('a coupon that covers the full fee confirms for free instead of launching checkout', async () => {
    mockPreviewCoupon.mockResolvedValue({
      success: true,
      data: { ...couponPreview, discount_amount: 150, final_amount: 0 },
      meta: null,
      error: null,
    })
    mockConfirmZero.mockResolvedValue({ success: true, data: { confirmed: true }, meta: null, error: null })
    renderAt('?registration_id=r-1&tournament_id=t-1&amount=150')

    fireEvent.change(screen.getByPlaceholderText(i18n.t('coupon.placeholder')), {
      target: { value: 'FREE100' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('coupon.apply') }))
    await screen.findByText('SAVE10')

    const confirmButton = await screen.findByRole('button', { name: i18n.t('coupon.confirmFree') })
    fireEvent.click(confirmButton)

    await waitFor(() => expect(mockConfirmZero).toHaveBeenCalledWith('r-1', 'coupon-9'))
    expect(mockInitiate).not.toHaveBeenCalled()
  })

  // The /join page applied a code before registering and hands it over.
  it('applies a handed-over code once on arrival — never typed twice', async () => {
    mockPreviewCoupon.mockResolvedValue({ success: true, data: couponPreview, meta: null, error: null })
    renderAt('?registration_id=r-1&tournament_id=t-1&amount=150&coupon=SAVE10')
    await screen.findByText('SAVE10')
    expect(mockPreviewCoupon).toHaveBeenCalledTimes(1)
    expect(mockPreviewCoupon).toHaveBeenCalledWith('SAVE10', { tournamentId: 't-1', orderValue: 150 })
    expect(screen.getAllByText('₪135').length).toBeGreaterThanOrEqual(1)
  })

  it('a handed-over code that no longer applies says so', async () => {
    mockPreviewCoupon.mockResolvedValue({
      success: false, data: null, meta: null, error: { message: 'Coupon expired' },
    } as any)
    renderAt('?registration_id=r-1&tournament_id=t-1&amount=150&coupon=OLD')
    expect(await screen.findByText('Coupon expired')).toBeInTheDocument()
  })

  it('shows the backend error when the typed code is invalid', async () => {
    mockPreviewCoupon.mockResolvedValue({
      success: false,
      error: { code: 'INVALID', message: 'Coupon has expired', details: null },
    })
    renderAt('?registration_id=r-1&tournament_id=t-1&amount=150')

    fireEvent.change(screen.getByPlaceholderText(i18n.t('coupon.placeholder')), {
      target: { value: 'EXPIRED' },
    })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('coupon.apply') }))
    expect(await screen.findByText('Coupon has expired')).toBeInTheDocument()
  })
})
