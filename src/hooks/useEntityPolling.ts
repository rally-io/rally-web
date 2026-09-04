// src/hooks/useEntityPolling.ts
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getBooking } from '@/services/api/bookings'
import { getRegistration } from '@/services/api/tournaments'
import { getEvent } from '@/services/api/events'
import { getWaitlistHoldStatus } from '@/services/api/payments'
import type { PaymentEntityType } from '@/types/api'

const INTERVAL_MS = 3000
const MAX_ATTEMPTS = 10

// Only treat consecutive errors as confirmed after seeing at least one
// successful response, so transient backend hiccups don't produce false positives.
// After MAX_ATTEMPTS the polling times out regardless.
const ERROR_FALLBACK_THRESHOLD = 2

export type PollingStatus = 'polling' | 'confirmed' | 'timeout'

export interface UseEntityPollingArgs {
  type: PaymentEntityType
  entityId: string
  tournamentId?: string
  eventId?: string
}

export interface UseEntityPollingResult {
  status: PollingStatus
  attempts: number
  entity: any | null
}

interface FetchOutcome {
  ok: boolean
  confirmed: boolean
  entity?: any
}

async function fetchOnce(args: UseEntityPollingArgs): Promise<FetchOutcome> {
  if (args.type === 'booking') {
    const r = await getBooking(args.entityId)
    if (!r.success) return { ok: false, confirmed: false }
    const d: any = r.data
    return {
      ok: true,
      confirmed: d.status === 'confirmed' || d.payment_status === 'completed',
      entity: d,
    }
  }
  if (args.type === 'tournament_registration') {
    if (!args.tournamentId) return { ok: false, confirmed: false }
    const r = await getRegistration(args.tournamentId, args.entityId)
    if (!r.success) return { ok: false, confirmed: false }
    const d: any = r.data
    // Pre-auth hold (statusCode=11) leaves status='registered' & payment_held —
    // that IS a successful payment on web; the TM approves later. (gap spec §2.4)
    const done =
      d.payment_status === 'payment_held' ||
      d.payment_status === 'completed' ||
      d.status === 'confirmed'
    return { ok: true, confirmed: done, entity: d }
  }
  if (args.type === 'tournament_waitlist_hold') {
    // No registration exists yet — promotion is manager-triggered and may
    // happen days later. The only thing to confirm here is that Grow's
    // webhook landed and the hold is actually in place.
    const r = await getWaitlistHoldStatus(args.entityId)
    if (!r.success) return { ok: false, confirmed: false }
    const d = r.data
    return { ok: true, confirmed: d.hold_confirmed === true, entity: d }
  }
  if (!args.eventId) return { ok: false, confirmed: false }
  const r = await getEvent(args.eventId)
  if (!r.success) return { ok: false, confirmed: false }
  const d: any = r.data
  return { ok: true, confirmed: d.joined === true, entity: d }
}

export function useEntityPolling(args: UseEntityPollingArgs): UseEntityPollingResult {
  const [status, setStatus] = useState<PollingStatus>('polling')
  const [attempts, setAttempts] = useState(0)
  // Tracks whether we've ever received a successful (ok=true) response.
  // Once set, stays true for the lifetime of this hook instance so that
  // transient backend errors after entity existence is confirmed don't flip
  // the user to "still processing" — they get the optimistic confirmed screen.
  const hasSeenOkRef = useRef(false)
  // Counts consecutive errors only after hasSeenOkRef is true.
  const consecutiveErrorsRef = useRef(0)
  const lastEntityRef = useRef<any>(null)

  useQuery({
    queryKey: ['entity-polling', args.type, args.entityId, args.tournamentId, args.eventId],
    queryFn: async () => {
      const outcome = await fetchOnce(args)
      setAttempts((n) => n + 1)
      if (!outcome.ok) {
        // Only apply the error-as-confirmed fallback once we've confirmed the
        // entity exists (hasSeenOkRef). Without a prior success, let the
        // timeout mechanism handle persistently failing entities.
        if (hasSeenOkRef.current) {
          consecutiveErrorsRef.current += 1
          if (consecutiveErrorsRef.current >= ERROR_FALLBACK_THRESHOLD) {
            setStatus('confirmed')
          }
        }
      } else {
        hasSeenOkRef.current = true
        consecutiveErrorsRef.current = 0
        if (outcome.entity) lastEntityRef.current = outcome.entity
        if (outcome.confirmed) setStatus('confirmed')
      }
      return outcome
    },
    enabled: status === 'polling',
    refetchInterval: status === 'polling' ? INTERVAL_MS : false,
    refetchOnWindowFocus: false,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  })

  useEffect(() => {
    if (status === 'polling' && attempts >= MAX_ATTEMPTS) {
      setStatus('timeout')
    }
  }, [status, attempts])

  return { status, attempts, entity: lastEntityRef.current }
}