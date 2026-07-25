import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
  },
}))

import client from './client'
import { getClubs, getClub } from './clubs'

describe('getClubs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(client.get as any).mockResolvedValue({ success: true, data: [], error: null, meta: {} })
  })

  it('requests the web view and clubs without availability today', async () => {
    await getClubs()
    expect(client.get).toHaveBeenCalledWith(
      '/rally/v1/clubs/',
      expect.objectContaining({
        params: expect.objectContaining({ view: 'web', show_without_availability: true }),
      }),
    )
  })

  it('merges caller filters and lets them override the defaults', async () => {
    await getClubs({ q: 'tel aviv', show_without_availability: false })
    const { params } = (client.get as any).mock.calls[0][1]
    expect(params.q).toBe('tel aviv')
    expect(params.show_without_availability).toBe(false)
    expect(params.view).toBe('web')
  })
})

describe('getClub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(client.get as any).mockResolvedValue({ success: true, data: {}, error: null })
  })

  it('requests the web view for the detail payload', async () => {
    await getClub('c-1')
    expect(client.get).toHaveBeenCalledWith(
      '/rally/v1/clubs/c-1',
      expect.objectContaining({ params: expect.objectContaining({ view: 'web' }) }),
    )
  })
})
