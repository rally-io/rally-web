import { useTranslation } from 'react-i18next'
import { AlertTriangle, FileText, Info, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScreenMessageState } from '../hooks/useScreenMessageState'
import { MessageAcceptControls } from './MessageAcceptControls'
import type { ScreenMessage, ScreenMessageSelection } from '../types'

interface Props {
  message: ScreenMessage
  /** Present only on a page that gates an action (today: tournament
   *  registration) on acceptance. See the comment above `showCheckbox` below
   *  for how this interacts with `kind`. */
  selection?: ScreenMessageSelection
}

// `kind` drives presentation ONLY — never behaviour. Every gate below
// (accept/checkbox/confirmed/dismiss) reads exclusively from
// requires_acknowledgment / is_acknowledged / is_dismissible / gate_actions,
// never from `kind`.
const KIND_ICON: Record<ScreenMessage['kind'], LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  terms: FileText,
}

// Background and border are split so the blocking-and-unticked treatment
// (isUntickedBlocking below) can swap in `border-rally-error` without leaving
// two same-specificity border-color utilities on the element at once —
// Tailwind resolves those by stylesheet order, not by position in
// `className`, so which one "wins" would otherwise be undefined.
const KIND_BG_STYLES: Record<ScreenMessage['kind'], string> = {
  info: 'bg-rally-surface',
  warning: 'bg-rally-warning/10',
  // terms reads like a document: quieter surface, no accent border.
  terms: 'bg-rally-surface-2',
}

const KIND_BORDER_STYLES: Record<ScreenMessage['kind'], string> = {
  info: 'border-rally-border',
  warning: 'border-rally-warning/40',
  terms: 'border-rally-border',
}

const KIND_ICON_STYLES: Record<ScreenMessage['kind'], string> = {
  info: 'bg-rally-bg/40 text-rally-text-muted',
  warning: 'bg-rally-warning/15 text-rally-warning',
  terms: 'bg-rally-bg/40 text-rally-text-2',
}

export function ScreenMessageCard({ message, selection }: Props) {
  const { t } = useTranslation()
  const {
    showCheckbox, showAccept, showConfirmed, canDismiss, isChecked,
    accept, dismissMessage, isAccepting, isDismissing, actionErrorMessage,
  } = useScreenMessageState(message, selection)

  // This card is display_mode-agnostic by design: it always renders as a
  // plain inline block, whether the message is display_mode 'inline' or
  // 'modal'. The routing decision — whether THIS card gets mounted at all
  // for a given message, and whether a ScreenMessageModal also renders
  // alongside it — belongs to ScreenMessageList / ScreenMessageModalHost,
  // never here. See SCREEN_MESSAGES_WEB_SPEC.md §6b.
  void message.display_mode

  // A blocking message the player hasn't ticked yet gets the "you must do
  // something here" treatment below (red border + Required badge). It calms
  // down the instant it's ticked — a permanent red border after compliance
  // would read as an unresolved error, which is worse than no marker at all.
  const isUntickedBlocking = showCheckbox && !isChecked

  const Icon = KIND_ICON[message.kind]

  return (
    <div
      id={`screen-message-${message.id}`}
      className={cn(
        'rounded-2xl border p-5 transition-colors',
        KIND_BG_STYLES[message.kind],
        isUntickedBlocking ? 'border-rally-error' : KIND_BORDER_STYLES[message.kind],
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0',
            KIND_ICON_STYLES[message.kind],
          )}
        >
          <Icon className="w-5 h-5" />
        </span>
        {/* `dir="auto"` rather than a server-supplied locale: the browser reads
            direction off the first strong character the author actually typed, so
            a Hebrew notice renders RTL inside an English page and vice versa,
            with no language field to store, resolve or get wrong. */}
        <div dir="auto" className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className="font-display font-bold text-rally-text text-lg">{message.title}</h3>
            {isUntickedBlocking && (
              // Colour is never the only signal — colourblind readers and
              // dark mode both need the word, not just the red tone.
              <span className="inline-flex items-center gap-1 rounded-full bg-rally-error/15 px-2 py-0.5 text-xs font-bold text-rally-error shrink-0">
                <span aria-hidden="true">*</span>
                {t('screenMessages.requiredBadge', { defaultValue: 'Required' })}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-rally-text-2 leading-relaxed whitespace-pre-line">
            {message.body}
          </p>
        </div>
      </div>

      {(showAccept || showCheckbox || showConfirmed || canDismiss) && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <MessageAcceptControls
            message={message}
            selection={selection}
            idPrefix="screen-message"
            showCheckbox={showCheckbox}
            showAccept={showAccept}
            showConfirmed={showConfirmed}
            isChecked={isChecked}
            isAccepting={isAccepting}
            onAccept={() => void accept()}
          />
          {canDismiss && (
            <button
              type="button"
              onClick={() => void dismissMessage()}
              disabled={isDismissing}
              className="text-sm font-semibold text-rally-text-muted hover:text-rally-text disabled:opacity-50 transition-colors"
            >
              {t('screenMessages.dismiss', { defaultValue: 'Dismiss' })}
            </button>
          )}
        </div>
      )}

      {actionErrorMessage && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {actionErrorMessage}
        </p>
      )}
    </div>
  )
}
