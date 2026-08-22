import { describe, it, expect, vi, beforeEach } from 'vitest'
import client from './client'
import { searchPlayers } from './players'

vi.mock('./client', () => ({ default: { get: vi.fn().mockResolvedValue({ success: true }) } }))

describe('players api', () => {
  beforeEach(() => vi.mocked(client.get).mockClear())

  it('searches players by query on the correct path', async () => {
    await searchPlayers('dana')
    expect(client.get).toHaveBeenCalledWith('/rally/v1/players/search', {
      params: { query: 'dana' },
    })
  })
})
