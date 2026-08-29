import { useEffect, useReducer, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useScreenMessages } from '../hooks/useScreenMessages'
import { ScreenMessageModal } from './ScreenMessageModal'
import type { ScreenMessageSelection, ScreenMessagesQuery } from '../types'

interface Props {
  query: ScreenMessagesQuery
  /** Passed straight through to ScreenMessageModal — see ScreenMessageList's
   *  own `selection` prop. Omitted by any page that isn't enforcing a gate
   *  (e.g. the club page). */
  selection?: ScreenMessageSelection
}

function seenKey(id: string, version: number): string {
  return `${id}:${version}`
}

// Module-scoped, not component state (SCREEN_MESSAGES_WEB_PLAN.md Task 9 #3).
// A useState-backed seen-set dies the moment the host unmounts, so navigating
// away from a tournament/club page and back re-mounts the host with a fresh
// Set and re-pops a modal the player already closed. A module-scoped Set
// survives that remount for the lifetime of the SPA session and is cleared
// only by a real page reload — exactly the "once per session, a fresh load
// re-opens it" contract in SCREEN_MESSAGES_WEB_SPEC.md §6b. Still keyed on
// `id:version`, so an edited message (a version bump) is new text and
// reopens regardless of what was closed before.
let seenModalMessages = new Set<string>()

/** Test-only escape hatch — a module-level cache tests cannot clear leaks
 *  state between tests, which is its own bug. Call in `beforeEach`. */
export function resetScreenMessageModalSeenSet(): void {
  seenModalMessages = new Set<string>()
}

/**
 * At most one modal at a time, in the list's own order, for every
 * `display_mode: 'modal'` message not yet closed this SPA session and whose
 * acknowledgment obligation (if any) isn't already satisfied
 * (SCREEN_MESSAGES_WEB_SPEC.md §6b, SCREEN_MESSAGES_WEB_PLAN.md Task 9 #2).
 * Renders nothing while loading or when there is nothing left to show — same
 * convention as ScreenMessageList.
 *
 * Deliberately does NOT filter on `is_dismissible`: the API already omits
 * messages this player dismissed, and a non-dismissible, non-acknowledgeable
 * info modal has no "satisfied" state of its own, so it correctly shows once
 * per visit regardless.
 *
 * Shares its `useScreenMessages` query with the page's own ScreenMessageList
 * — same query key, so react-query dedupes the two into one fetch (see
 * useRegistrationGate's own comment on this pattern).
 */
export function ScreenMessageModalHost({ query, selection }: Props) {
  const { user } = useAuth()
  const { data: messages } = useScreenMessages(query)
  // The Set above mutates outside React's knowledge, so nothing forces a
  // re-render when a message is added to it — this tick is that trigger.
  const [, forceRender] = useReducer((count: number) => count + 1, 0)

  // The seen-set is module-scoped so it survives navigation, which also means
  // it survives a SIGN-OUT: without this, the next person to sign in in the
  // same tab silently never sees a modal the previous viewer had closed. Reset
  // on any change of viewer (including sign-out to anonymous), the same reason
  // the messages query key carries the viewer id.
  const lastViewerRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const viewer = user?.id ?? null
    if (lastViewerRef.current !== undefined && lastViewerRef.current !== viewer) {
      resetScreenMessageModalSeenSet()
      forceRender()
    }
    lastViewerRef.current = viewer
  }, [user?.id])

  const active = (messages ?? [])
    .filter((m) => m.display_mode === 'modal')
    // `is_acknowledged` alone, NOT `requires_acknowledgment && is_acknowledged`.
    // `requires_acknowledgment` is enforcement-aware now, so the conjunction goes
    // false the moment an operator flips the kill switch off — and a gating modal
    // the player already accepted would re-pop once per SPA session, rendering
    // with no accept control (they have accepted) and no dismiss (a gating
    // message is never dismissible). An accepted message is satisfied whatever
    // the switch says.
    .filter((m) => !m.is_acknowledged)
    .find((m) => !seenModalMessages.has(seenKey(m.id, m.version)))

  if (!active) return null

  const key = seenKey(active.id, active.version)
  return (
    <ScreenMessageModal
      key={key}
      message={active}
      selection={selection}
      onOpenChange={(next) => {
        if (!next) {
          seenModalMessages.add(key)
          forceRender()
        }
      }}
    />
  )
}
