import { describe, it, expect, vi, beforeEach } from 'vitest'
import client from './client'
import { initiateTournamentRegistrationPayment, confirmTournamentZeroPayment } from './payments'

vi.mock('./client', () => ({ default: { post: vi.fn().mockResolvedValue({ success: true }) } }))

describe('payments api', () => {
  beforeEach(() => vi.mocked(client.post).mockClear())

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
})
