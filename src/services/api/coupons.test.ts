import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosRequestConfig } from 'axios'
import client from './client'
import { listCoupons, previewCoupon } from './coupons'

vi.mock('./client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ success: true }),
    post: vi.fn().mockResolvedValue({ success: true }),
  },
}))

describe('coupons api', () => {
  beforeEach(() => {
    vi.mocked(client.get).mockClear()
    vi.mocked(client.post).mockClear()
  })

  it('lists coupons for a tournament/order-value context', async () => {
    await listCoupons({ tournamentId: 't-1', orderValue: 150 })
    const [url, config] = vi.mocked(client.get).mock.calls[0]
    expect(url).toBe('/rally/v1/coupons')
    expect((config as AxiosRequestConfig).params).toEqual({
      tournament_id: 't-1',
      order_value: 150,
    })
  })

  it('previews a code against the same context, uppercased and trimmed', async () => {
    await previewCoupon('  save10 ', { tournamentId: 't-1', orderValue: 150 })
    expect(client.post).toHaveBeenCalledWith('/rally/v1/coupons/preview', {
      code: 'SAVE10',
      tournament_id: 't-1',
      order_value: 150,
    })
  })
})
