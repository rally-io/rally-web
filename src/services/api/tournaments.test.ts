import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosRequestConfig } from 'axios'
import client from './client'
import { getTournaments, getTournamentFilterOptions } from './tournaments'

vi.mock('./client', () => ({ default: { get: vi.fn().mockResolvedValue({ success: true }) } }))

describe('tournaments api params', () => {
  beforeEach(() => vi.mocked(client.get).mockClear())

  it('serializes club_ids as repeated params (no [] brackets)', async () => {
    await getTournaments({ club_ids: ['a-1', 'b-2'], sort: 'latest' })
    const [, config] = vi.mocked(client.get).mock.calls[0]
    // axios must be told to emit club_ids=a-1&club_ids=b-2 — its default
    // club_ids[]= form is ignored by FastAPI's List[UUID] parsing
    expect((config as AxiosRequestConfig).paramsSerializer).toEqual({ indexes: null })
    expect((config as AxiosRequestConfig).params.club_ids).toEqual(['a-1', 'b-2'])
    expect((config as AxiosRequestConfig).params.sort).toBe('latest')
  })

  it('filter-options passes include_live=true (web lists live tournaments)', async () => {
    await getTournamentFilterOptions()
    const [url, config] = vi.mocked(client.get).mock.calls[0]
    expect(url).toBe('/rally/v1/tournaments/filter-options')
    expect((config as AxiosRequestConfig).params).toEqual({ include_live: true })
  })

  // The API's `search` param has min_length=1 — sending '' is a validation
  // error, so an empty term must be omitted entirely, not forwarded as ''.
  // toEqual (exact match, not toMatchObject) is what makes this test able to
  // catch a stray `search: ''` sneaking into the params object.
  it('omits search entirely when the term is empty, no []/undefined leaking in', async () => {
    await getTournamentFilterOptions('')
    const [, config] = vi.mocked(client.get).mock.calls[0]
    expect((config as AxiosRequestConfig).params).toEqual({ include_live: true })
  })

  it('forwards a non-empty search term to filter-options', async () => {
    await getTournamentFilterOptions('zcz')
    const [, config] = vi.mocked(client.get).mock.calls[0]
    expect((config as AxiosRequestConfig).params).toEqual({
      include_live: true,
      search: 'zcz',
    })
  })
})
