export type MessageKind = 'info' | 'warning' | 'terms'
export type MessageDisplayMode = 'inline' | 'modal'
export type MessageScope = 'club' | 'tournament' | 'event' | 'global'

/** rally-api's SCREEN_REACHABLE_ACTIONS keys (screen_message_service.py:39-48).
 *  Web only ever reaches `tournament_registration` — it has no booking-create
 *  or event-join call (SCREEN_MESSAGES_WEB_SPEC.md §1/§3) — but a message's
 *  `gate_actions` can still name any of the three, so the union stays complete. */
export type GateAction = 'tournament_registration' | 'court_booking' | 'event_join'

/** One message as the API returns it. `title`/`body` are the author's own
 *  single-language text; clients render them with `dir="auto"`. */
export interface ScreenMessage {
  id: string
  version: number
  kind: MessageKind
  display_mode: MessageDisplayMode
  title: string
  body: string
  is_dismissible: boolean
  /** ENFORCEMENT-AWARE: false whenever the API would not actually refuse this
   *  action for this client, even though `gate_actions` below is non-empty. Gate
   *  the UI on THIS, never on `gate_actions.length` — otherwise the page blocks
   *  on a rule the server does not apply, and keeps blocking after an operator
   *  turns enforcement off. */
  requires_acknowledgment: boolean
  /** The message's stored gates, unfiltered — which action a checkbox belongs to. */
  gate_actions: string[]
  is_acknowledged: boolean
  acknowledged_at: string | null
}

export interface ScreenMessagesQuery {
  scope: MessageScope
  /** Omitted for the global scope. */
  id?: string
}

/** Passed to `ScreenMessageList`/`ScreenMessageCard` by a page that gates an
 *  action on acceptance (today: tournament registration). When a card's own
 *  `gate_actions` includes `selection.action`, it renders a checkbox wired to
 *  `onToggle` instead of the Accept button — see `useRegistrationGate`. */
export interface ScreenMessageSelection {
  action: GateAction
  selectedIds: ReadonlySet<string>
  onToggle: (id: string, version: number) => void
}

/** One entry of a 409 ACKNOWLEDGMENT_REQUIRED's `details.messages` — the
 *  outstanding messages at their *current* version. */
export interface OutstandingMessage {
  id: string
  version: number
  title: string
}
