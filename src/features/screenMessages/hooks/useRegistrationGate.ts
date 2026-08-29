import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useScreenMessages } from './useScreenMessages'
import type { AcknowledgedMessageRef } from '@/types/api'
import type { GateAction, OutstandingMessage, ScreenMessagesQuery } from '../types'

/** The interceptor's rejection shape (client.ts) for a 409 that might carry
 *  ACKNOWLEDGMENT_REQUIRED's `details.messages`. Not an Error instance —
 *  see useMessageActions.ts's own FlatApiError, which this mirrors but with
 *  `details` added, since that mutation never needs it. */
export interface GateErrorLike {
  code?: string
  message?: string
  status?: number
  details?: unknown
}

function parseOutstanding(details: unknown): OutstandingMessage[] {
  const raw = (details as { messages?: unknown } | null | undefined)?.messages
  if (!Array.isArray(raw)) return []
  // Malformed entries are skipped, not rejected — mirrors the service's own
  // per-item KeyError/TypeError/ValueError handling (SCREEN_MESSAGES_WEB_SPEC.md
  // §6a). A dropped entry here just loses its scroll target, nothing crashes.
  return raw.filter(
    (m): m is OutstandingMessage =>
      !!m &&
      typeof m === 'object' &&
      typeof (m as Record<string, unknown>).id === 'string' &&
      typeof (m as Record<string, unknown>).version === 'number' &&
      typeof (m as Record<string, unknown>).title === 'string',
  )
}

/**
 * Owns the local, never-networked checkbox state for the messages that gate
 * `action` on `query`'s scope, plus the 409 ACKNOWLEDGMENT_REQUIRED safety
 * net.
 *
 * Ticking a checkbox must never call the API. `assert_gate_satisfied` on
 * rally-api writes the acceptance receipt itself, from `acknowledged_messages`
 * on the register request, inside the registration's own transaction — "so
 * ack and action commit together." Calling `/acknowledge` here would record
 * an acceptance for a registration that might still fail (payment declined,
 * tournament full), leaving an orphan receipt. See SCREEN_MESSAGES_WEB_SPEC.md
 * §6a.
 *
 * Shares its `useScreenMessages` query with the page's own `ScreenMessageList`
 * — same query key, so react-query dedupes the two into one fetch.
 */
export function useRegistrationGate(query: ScreenMessagesQuery, action: GateAction) {
  const queryClient = useQueryClient()
  const { data: messages, isLoading } = useScreenMessages(query)
  // id -> the version that was current WHEN THE BOX WAS TICKED, not whatever
  // the live query says now. A sibling card's Accept/Dismiss on the same page
  // invalidates ['screenMessages'] too, which can bump this message's version
  // out from under an already-ticked box between tick and submit. Sending the
  // stale version is the correct outcome — assert_gate_satisfied then fails to
  // match it and 409s, so the player re-reads the new text instead of silently
  // accepting text they never saw. Re-deriving the version from `blocking` at
  // payload time (the previous version of this hook) would have defeated that.
  const [selectedVersions, setSelectedVersions] = useState<ReadonlyMap<string, number>>(new Map())
  const [outstanding, setOutstanding] = useState<OutstandingMessage[]>([])

  const selectedIds = useMemo(() => new Set(selectedVersions.keys()), [selectedVersions])

  // Gating, unacknowledged messages for this action — the ones a checkbox
  // must cover before the page can consider the gate satisfied.
  const blocking = useMemo(
    () =>
      (messages ?? []).filter(
        (m) =>
          (m.gate_actions ?? []).includes(action) &&
          m.requires_acknowledgment &&
          !m.is_acknowledged,
      ),
    [messages, action],
  )

  const toggle = useCallback((id: string, version: number) => {
    setSelectedVersions((prev) => {
      const next = new Map(prev)
      if (next.has(id)) next.delete(id)
      else next.set(id, version)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setSelectedVersions(new Map())
    setOutstanding([])
  }, [])

  // Closed while LOADING, open on ERROR — and the asymmetry is deliberate.
  //
  // Loading is transient and short: holding the button for a moment avoids
  // flashing an enabled Register that is about to sprout a mandatory checkbox.
  //
  // An ERRORED query is a different situation, and treating it like loading was
  // an outage waiting to happen. `blocking` is `[]` on error, and the reason
  // text is driven by `blocking.length > 0`, so a failing endpoint disabled
  // Register on EVERY tournament page with no message on screen explaining why,
  // permanently (`refetchOnWindowFocus` is off, and react-query only retries
  // twice). Deploy the web app before the messages table exists — the default
  // here, since nothing runs `alembic upgrade` on deploy — and every web
  // registration dies behind a grey button.
  //
  // Failing open is not a compliance hole, because THIS IS NOT THE GATE. The
  // gate is `assert_gate_satisfied` inside the register transaction: if terms
  // are genuinely outstanding the POST returns 409 ACKNOWLEDGMENT_REQUIRED, and
  // `handleGateError` below turns that into the checkbox the player then has to
  // tick. The worst case for failing open is one refused registration with a
  // clear reason; the worst case for failing closed is silent, total, and
  // affects tournaments that have no terms at all.
  const isSatisfied = !isLoading && blocking.every((m) => selectedVersions.has(m.id))

  // Only the ticked messages that are actually blocking on this page — never
  // every message the player has ever seen (MAX_INLINE_ACKNOWLEDGEMENTS is a
  // server-side cap, but there's no reason to approach it from here either).
  // Version comes from `selectedVersions` (captured at tick time), not from
  // `blocking`'s live data — see the comment on `selectedVersions` above.
  const payload: AcknowledgedMessageRef[] = useMemo(
    () =>
      blocking
        .filter((m) => selectedVersions.has(m.id))
        .map((m) => ({ id: m.id, version: selectedVersions.get(m.id)! })),
    [blocking, selectedVersions],
  )

  // The safety net, not the main path — fires only when a message was
  // published/edited between page load and register. Refetches (the list is
  // stale by definition), clears ticks via reset() (never auto-accept text
  // the player hasn't seen), and records the outstanding messages for the
  // page to scroll to. No retry here — the caller decides when to let the
  // player try again.
  const handleGateError = useCallback(
    (e: GateErrorLike | null | undefined): boolean => {
      if (e?.code !== 'ACKNOWLEDGMENT_REQUIRED') return false
      // Not merely a safety net any more — with the gate failing open above,
      // this is THE path that surfaces terms when the messages read failed but
      // the register call reached a server that does enforce them.
      void queryClient.invalidateQueries({ queryKey: ['screenMessages'] })
      reset()
      setOutstanding(parseOutstanding(e.details))
      return true
    },
    [queryClient, reset],
  )

  return { blocking, selectedIds, toggle, isSatisfied, payload, outstanding, handleGateError, reset }
}
