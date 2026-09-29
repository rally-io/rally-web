import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import type { ScreenMessage } from '@/features/screenMessages/types'

interface Props {
  messages: ScreenMessage[]
}

function TournamentRuleAccordionItem({ message }: { message: ScreenMessage }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      data-testid={`tournament-rule-${message.id}`}
      className="rounded-2xl border border-rally-border bg-rally-surface overflow-hidden transition-colors"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-rally-surface-2/50 transition-colors"
        aria-expanded={expanded}
        aria-controls={`tournament-rule-body-${message.id}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-rally-accent/15 text-rally-accent shrink-0">
            <FileText className="w-5 h-5 text-rally-accent" />
          </span>
          <h2 className="font-display text-lg md:text-xl font-bold text-rally-text truncate" dir="auto">
            {message.title}
          </h2>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-rally-text-2 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-rally-text-2 shrink-0" />
        )}
      </button>

      {expanded && (
        <div
          id={`tournament-rule-body-${message.id}`}
          className="border-t border-rally-border/60 px-5 pb-5 pt-4"
        >
          <p
            className="text-rally-text-2 text-sm md:text-base whitespace-pre-line leading-relaxed"
            dir="auto"
          >
            {message.body}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Expandable/collapsible "Tournament Rules" section for the web tournament detail page.
 *
 * Renders non-gating (gate_actions: []) tournament-scoped CRM messages as individual
 * expandable accordion items.
 *
 * Collapsed by default: the header displays the message's title, and the player
 * expands to read the full body text.
 */
export function TournamentRulesSection({ messages }: Props) {
  if (messages.length === 0) return null

  return (
    <section className="space-y-4" data-testid="tournament-rules-section">
      {messages.map((message) => (
        <TournamentRuleAccordionItem key={message.id} message={message} />
      ))}
    </section>
  )
}

