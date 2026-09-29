import client from './client'
import { parseSkillBands, type SkillLadder } from '@/lib/skillLadder'

/**
 * `GET /public/skill-bands` — no auth; the API sends `Cache-Control: public, max-age=300`.
 * `bust` adds a throwaway query param so a forced refetch cannot be answered from the browser
 * cache. Rejects on an HTTP error (the client's interceptor) and on a body the contract does
 * not allow (`parseSkillBands`); the caller falls back to a bundled ladder either way.
 */
export async function fetchSkillBands(bust?: number | null): Promise<SkillLadder> {
  const body: unknown = await client.get('/public/skill-bands', {
    headers: { 'X-Skip-Auth': '1' },
    ...(bust ? { params: { t: bust } } : {}),
  })
  return parseSkillBands(body)
}
