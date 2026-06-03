import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

import client from './client'
import { confirmZeroPayment } from './tournaments'

describe('confirmZeroPayment', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('POSTs to /payments/tournament-registration/{id}/confirm-zero-payment', async () => {
    ;(client.post as any).mockResolvedValueOnce({ success: true, data: { confirmed: true }, error: null })
    await confirmZeroPayment('t-1', 'r-1')
    expect(client.post).toHaveBeenCalledWith(
      '/rally/v1/payments/tournament-registration/r-1/confirm-zero-payment',
      {},
    )
  })
})
