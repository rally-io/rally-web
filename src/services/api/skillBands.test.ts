import { beforeEach, describe, expect, it, vi } from 'vitest'
import client from './client'
import { fetchSkillBands } from './skillBands'
import fallback5Body from '@/lib/skillBands.fallback5.json'

vi.mock('./client', () => ({ default: { get: vi.fn() } }))

describe('fetchSkillBands', () => {
  // Braces matter: a function returned from beforeEach is run as teardown, and this mock
  // returned would be called once more after every test.
  beforeEach(() => {
    vi.mocked(client.get).mockReset()
  })

  it('GETs /public/skill-bands without auth and returns the parsed ladder', async () => {
    vi.mocked(client.get).mockResolvedValue(fallback5Body as never)
    const ladder = await fetchSkillBands()
    expect(client.get).toHaveBeenCalledWith('/public/skill-bands', { headers: { 'X-Skip-Auth': '1' } })
    expect(ladder.level_scale).toBe(5)
    expect(ladder.bands.map((b) => b.code)).toEqual(['D2', 'D1', 'C2', 'C1', 'B2', 'B1', 'A'])
  })

  it('adds a cache-busting param only when asked to', async () => {
    vi.mocked(client.get).mockResolvedValue(fallback5Body as never)
    await fetchSkillBands(1727344000000)
    expect(client.get).toHaveBeenCalledWith('/public/skill-bands', {
      headers: { 'X-Skip-Auth': '1' },
      params: { t: 1727344000000 },
    })
  })

  it('rejects a body the contract does not allow', async () => {
    vi.mocked(client.get).mockResolvedValue({ success: true, data: { level_scale: 5, bands: [] } } as never)
    await expect(fetchSkillBands()).rejects.toThrow()
  })

  it('passes an HTTP rejection through (a 404 before the API ships the endpoint)', async () => {
    vi.mocked(client.get).mockRejectedValue({ isNotFound: true, status: 404, message: 'Not Found' })
    const error = await fetchSkillBands().catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 404 })
  })
})
