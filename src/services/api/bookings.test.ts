import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import client from './client'
import { releaseBookingHold } from './bookings'

describe('releaseBookingHold', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POSTs to the release endpoint and returns the envelope', async () => {
    ;(client.post as any).mockResolvedValueOnce({ success: true, data: { released: true }, error: null })
    const result = await releaseBookingHold('b-1')
    expect(client.post).toHaveBeenCalledWith('/rally/v1/bookings/b-1/release', {})
    expect(result.success).toBe(true)
  })

  it('wraps errors in ApiResponse envelope on rejection', async () => {
    ;(client.post as any).mockRejectedValueOnce({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' })
    const result = await releaseBookingHold('b-invalid')
    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('BOOKING_NOT_FOUND')
    expect(result.error?.message).toBe('Booking not found')
  })
})
