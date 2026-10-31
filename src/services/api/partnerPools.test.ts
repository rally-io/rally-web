import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import client from './client'
import {
  getDeck, getMatches, openTournamentPool, searchPlayers, setLooking, swipe, undoSwipe, unwrap,
} from './partnerPools'

const http = vi.mocked(client)
const OK = { success: true, data: {}, meta: null, error: null }

beforeEach(() => {
  vi.clearAllMocks()
  for (const method of [http.get, http.post, http.put, http.patch, http.delete]) method.mockResolvedValue(OK)
})

describe('partnerPools', () => {
  it('opens the tournament pool', async () => {
    await openTournamentPool('t-1')
    expect(http.post).toHaveBeenCalledWith('/rally/v1/partner-pools', { kind: 'tournament', tournament_id: 't-1' })
  })

  it('asks for a page of 20 cards by default', async () => {
    await getDeck('pool-1')
    expect(http.get).toHaveBeenCalledWith('/rally/v1/partner-pools/pool-1/deck', { params: { limit: 20 } })
  })

  it('records a swipe with PUT and undoes one with DELETE', async () => {
    await swipe('pool-1', 'p-1', 'like')
    expect(http.put).toHaveBeenCalledWith('/rally/v1/partner-pools/pool-1/swipes/p-1', { decision: 'like' })
    await undoSwipe('pool-1', 'p-1')
    expect(http.delete).toHaveBeenCalledWith('/rally/v1/partner-pools/pool-1/swipes/p-1')
  })

  it('lists matches', async () => {
    await getMatches('pool-1')
    expect(http.get).toHaveBeenCalledWith('/rally/v1/partner-pools/pool-1/matches')
  })

  it('searches with the trimmed query (axios encodes it)', async () => {
    await searchPlayers('pool-1', '  Noa Levi ')
    expect(http.get).toHaveBeenCalledWith('/rally/v1/partner-pools/pool-1/players', {
      params: { query: 'Noa Levi', limit: 20 },
    })
  })

  it('switches looking with PATCH on /me', async () => {
    await setLooking('pool-1', false)
    expect(http.patch).toHaveBeenCalledWith('/rally/v1/partner-pools/pool-1/me', { looking: false })
  })
})

describe('unwrap', () => {
  it('returns the data of a success envelope', () => {
    expect(unwrap({ success: true, data: { a: 1 }, meta: null, error: null })).toEqual({ a: 1 })
  })

  it('throws the code of a success:false envelope, the same shape the client rejects with', () => {
    expect(() =>
      unwrap({ success: false, error: { code: 'POOL_CLOSED', message: 'closed', details: null } }),
    ).toThrow(expect.objectContaining({ code: 'POOL_CLOSED' }))
  })
})
