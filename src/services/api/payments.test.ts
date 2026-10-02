import { describe, it, expect, vi, beforeEach } from 'vitest'
import client from './client'
import {
  initiateTournamentRegistrationPayment, confirmTournamentZeroPayment, getPaymentLinkStatus,
} from './payments'

vi.mock('./client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ success: true }),
    get: vi.fn().mockResolvedValue({ success: true }),
  },
}))

describe('payments api', () => {
  beforeEach(() => {
    vi.mocked(client.post).mockClear()
    vi.mocked(client.get).mockClear()
  })

  it('initiates a tournament registration payment on the correct path', async () => {
    await initiateTournamentRegistrationPayment('reg-1')
    expect(client.post).toHaveBeenCalledWith(
      '/rally/v1/payments/tournament-registration/reg-1/initiate',
    )
  })

  it('confirms a zero-amount registration on the correct path', async () => {
    await confirmTournamentZeroPayment('reg-1')
    expect(client.post).toHaveBeenCalledWith(
      '/rally/v1/payments/tournament-registration/reg-1/confirm-zero-payment',
    )
  })

  it('initiates with a coupon_id body when a coupon is applied', async () => {
    await initiateTournamentRegistrationPayment('reg-1', 'coupon-9')
    expect(client.post).toHaveBeenCalledWith(
      '/rally/v1/payments/tournament-registration/reg-1/initiate',
      { coupon_id: 'coupon-9' },
    )
  })

  it('confirms a zero-amount registration with a coupon_id body when a coupon is applied', async () => {
    await confirmTournamentZeroPayment('reg-1', 'coupon-9')
    expect(client.post).toHaveBeenCalledWith(
      '/rally/v1/payments/tournament-registration/reg-1/confirm-zero-payment',
      { coupon_id: 'coupon-9' },
    )
  })

  it('polls a payment link status by transaction id', async () => {
    await getPaymentLinkStatus('txn-1')
    expect(client.get).toHaveBeenCalledWith('/rally/v1/payments/link/txn-1/status')
  })
})
