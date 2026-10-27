import { getBrand, getClub } from './config'
import type { ElectionVote } from './types'

// The ballot a signed-out voter filled in, kept across the sign-in round trip.
// localStorage, not sessionStorage: the email-verification link opens in a new
// tab (often from the mail app), and sessionStorage does not follow it there.
const KEY = 'rally.elections.pendingVote'
const TTL_MS = 3 * 24 * 60 * 60 * 1000

interface Stored extends ElectionVote {
  savedAt: number
}

export const pendingVote = {
  get(): ElectionVote | null {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return null
      const v = JSON.parse(raw) as Partial<Stored>
      if (typeof v.savedAt !== 'number' || Date.now() - v.savedAt > TTL_MS) return null
      if (!getClub(v.club_id)) return null
      const chain = v.chain_id && getBrand(v.chain_id) ? v.chain_id : null
      return { club_id: v.club_id as string, chain_id: chain }
    } catch {
      return null
    }
  },
  set(vote: ElectionVote): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...vote, savedAt: Date.now() }))
    } catch {
      // storage unavailable (private mode): the vote still submits in this tab.
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  },
}

// Picks in progress (before "cast"), so a refresh or a back-swipe mid-ballot
// doesn't wipe them. Per tab on purpose: it is a draft, not a vote.
const DRAFT_KEY = 'rally.elections.draft'

export const draftVote = {
  get(): { club_id: string | null; chain_id: string | null } {
    try {
      const v = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}') as Partial<ElectionVote>
      return {
        club_id: getClub(v.club_id) ? (v.club_id as string) : null,
        chain_id: v.chain_id && getBrand(v.chain_id) ? v.chain_id : null,
      }
    } catch {
      return { club_id: null, chain_id: null }
    }
  },
  set(club_id: string | null, chain_id: string | null): void {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ club_id, chain_id }))
    } catch {
      // ignore
    }
  },
}
