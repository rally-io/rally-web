// src/services/api/elections.ts
//
// The one seam between the /elections page and the backend. The page only ever
// calls these two functions, so wiring the real endpoints is a change here.
//
// Served by rally-api (app/routers/consumer/elections.py), user taken from the bearer token
// alone (no players row needed, so a brand-new account can vote):
//   GET  /rally/v1/elections/:electionId/my-vote  -> { success, data: { club_id, chain_id } | null }
//   POST /rally/v1/elections/:electionId/vote     body { club_id, chain_id|null, attribution }
//        -> 201 { success, data: { club_id, chain_id } }
//        -> 409 { success:false, error: { code: 'ALREADY_VOTED' } } when the user already voted
//        -> 400 { error: { code: 'INVALID_CHOICE' } } for ids not on the ballot
//        -> 403 { error: { code: 'VOTING_CLOSED' } } after the close date
// One vote per user = UNIQUE (election_id, user_id). See ELECTIONS_HANDOFF.md.
//
// Until then, VITE_ELECTIONS_MOCK=1 keeps the vote in localStorage so the whole
// flow (including the real sign-in) can be reviewed on a preview deploy.
import client from './client'
import type { ApiResponse } from '@/types/api'
import type { ElectionVote } from '@/features/elections/types'

const MOCK = import.meta.env.VITE_ELECTIONS_MOCK === '1'
const mockKey = (electionId: string, userId: string) =>
  `rally.elections.mock.${electionId}.${userId}`

export async function getMyVote(
  electionId: string,
  userId: string,
): Promise<ApiResponse<ElectionVote | null>> {
  if (MOCK) {
    const raw = localStorage.getItem(mockKey(electionId, userId))
    return {
      success: true,
      data: raw ? (JSON.parse(raw) as ElectionVote) : null,
      meta: null,
      error: null,
    }
  }
  return client.get(`/rally/v1/elections/${electionId}/my-vote`)
}

export async function submitVote(
  electionId: string,
  userId: string,
  vote: ElectionVote,
  attribution: Record<string, string | undefined> = {},
): Promise<ApiResponse<ElectionVote>> {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    const key = mockKey(electionId, userId)
    if (localStorage.getItem(key)) {
      return Promise.reject({
        status: 409,
        code: 'ALREADY_VOTED',
        message: 'Already voted',
      })
    }
    localStorage.setItem(key, JSON.stringify(vote))
    return { success: true, data: vote, meta: null, error: null }
  }
  return client.post(`/rally/v1/elections/${electionId}/vote`, {
    ...vote,
    attribution,
  })
}
