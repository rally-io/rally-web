import { cn } from '@/lib/utils'
import { useScreenMessages } from '../hooks/useScreenMessages'
import { ScreenMessageCard } from './ScreenMessageCard'
import type { ScreenMessageSelection, ScreenMessagesQuery } from '../types'

interface Props {
  query: ScreenMessagesQuery
  /** Page-supplied container/spacing classes (e.g. `container mx-auto px-4
   *  max-w-3xl`) — this component owns no layout of its own so it never adds
   *  a stray wrapper when there is nothing to show. */
  className?: string
  /** Passed straight through to every card — see `useRegistrationGate` and
   *  `ScreenMessageCard`'s own `selection` prop. Omitted by every page that
   *  isn't enforcing a gate (e.g. the club page), which leaves every card in
   *  its original accept-button behaviour. */
  selection?: ScreenMessageSelection
}

/** Renders nothing — no wrapper, no skeleton, no empty state — while loading
 *  or when there is nothing to show inline. The host pages already have
 *  content; an empty placeholder above it would be noise.
 *
 *  Every `display_mode: 'inline'` message renders here, as always. A
 *  `'modal'` message joins them ONLY when it gates an action (`gate_actions`
 *  non-empty) — SCREEN_MESSAGES_WEB_SPEC.md §6b: a gating modal needs a
 *  durable surface the player can still reach after closing it, or a closed
 *  modal leaves a disabled register button with no way back to the terms.
 *  A non-gating modal (an announcement) has no inline duplicate — it's
 *  handled entirely by ScreenMessageModalHost, mounted separately by the
 *  page. */
export function ScreenMessageList({ query, className, selection }: Props) {
  const { data: messages } = useScreenMessages(query)

  const inlineMessages = (messages ?? []).filter(
    (m) => m.display_mode === 'inline' || (m.gate_actions ?? []).length > 0,
  )

  if (inlineMessages.length === 0) return null

  return (
    <div data-testid="screen-message-list" className={cn('space-y-4', className)}>
      {inlineMessages.map((message) => (
        <ScreenMessageCard key={message.id} message={message} selection={selection} />
      ))}
    </div>
  )
}
