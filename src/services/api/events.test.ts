import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import client from './client'
import { releaseEvent } from './events'

describe('releaseEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POSTs to the event release endpoint', async () => {
    ;(client.post as any).mockResolvedValueOnce({ success: true, data: { released: true }, error: null })
    const result = await releaseEvent('e-1')
    expect(client.post).toHaveBeenCalledWith('/rally/v1/events/e-1/release', {})
    expect(result.success).toBe(true)
  })

  it('returns ApiResponse failure shape when POST throws', async () => {
    ;(client.post as any).mockRejectedValueOnce({ code: 'NET_ERR', message: 'Network failure' })
    const result = await releaseEvent('e-1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('NET_ERR')
    }
  })
})
