import { useState } from 'react'
import { z } from 'zod'
import type { PartnerSelectionState } from '@/types/partner'

const partnerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('existing'), id: z.string().min(1), displayName: z.string(), avatarUrl: z.string().nullable().optional() }),
  z.object({ type: z.literal('invite'), firstName: z.string(), lastName: z.string(), countryCode: z.string(), phone: z.string() }),
])
const draftSchema = z.object({ owner: z.string(), tournament: z.string(), expires: z.number(), partner: partnerSchema })
const STORAGE_KEY = 'rally:tournament-partner'
const EMPTY: PartnerSelectionState = { phase: 'idle' }

function readDraft(owner: string, tournament: string): PartnerSelectionState {
  if (!owner) return EMPTY
  try {
    const draft = draftSchema.parse(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null'))
    if (draft.owner === owner && draft.tournament === tournament && draft.expires > Date.now()) {
      return { phase: 'selected', partner: draft.partner }
    }
  } catch { /* Missing, expired or malformed storage is an empty selection. */ }
  return EMPTY
}

/** Only a selected partner survives navigation; consent and registration are never replayed. */
export function useTournamentPartnerDraft(tournament: string, owner: string) {
  const key = `${owner}:${tournament}`
  const [draft, setDraft] = useState(() => ({ key, value: readDraft(owner, tournament) }))
  if (draft.key !== key) setDraft({ key, value: readDraft(owner, tournament) })

  function select(value: PartnerSelectionState) {
    setDraft({ key, value })
    try {
      if (owner && value.phase === 'selected') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ owner, tournament, expires: Date.now() + 60 * 60 * 1000, partner: value.partner }))
      } else {
        sessionStorage.removeItem(STORAGE_KEY)
      }
    } catch { /* Storage may be unavailable; in-page selection still works. */ }
  }
  return [draft.key === key ? draft.value : EMPTY, select] as const
}
