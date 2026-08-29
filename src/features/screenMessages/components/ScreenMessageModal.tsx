import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useScreenMessageState } from '../hooks/useScreenMessageState'
import { MessageAcceptControls } from './MessageAcceptControls'
import type { ScreenMessage, ScreenMessageSelection } from '../types'

interface Props {
  message: ScreenMessage
  /** Present only when this page enforces a gate (today: tournament
   *  registration) — mirrors ScreenMessageCard's own `selection` prop
   *  exactly, so the modal and its inline duplicate (when one exists) never
   *  disagree about which control to show. */
  selection?: ScreenMessageSelection
  /** Radix's close vocabulary — Escape, backdrop click and the built-in X
   *  button all call this with `false`. The host owns "closed this session"
   *  bookkeeping; this component never decides whether to reopen itself. */
  onOpenChange: (open: boolean) => void
}

/**
 * A message rendered as a modal (SCREEN_MESSAGES_WEB_SPEC.md §6b). Mounted
 * only by ScreenMessageModalHost, which is the only thing that ever creates
 * or destroys one of these — this component is always open; it holds no
 * open/closed state of its own. That makes every close path an *unmount*
 * (the host simply stops rendering it), which is why focus restoration below
 * is a manual mount/unmount effect rather than Radix's `onCloseAutoFocus`:
 * that prop only fires on Radix's own internal close transition, which this
 * always-open component never goes through.
 */
export function ScreenMessageModal({ message, selection, onOpenChange }: Props) {
  const { t } = useTranslation()
  const [dontShowAgain, setDontShowAgain] = useState(false)

  // ONE derivation, shared with ScreenMessageCard. These were two hand-kept
  // copies that had already drifted; see useScreenMessageState.
  const {
    showCheckbox, showAccept: showAcceptButton, showConfirmed,
    canDismiss: showDontShowAgain, isChecked,
    accept, dismissMessage, isAccepting, isDismissing, actionErrorMessage,
  } = useScreenMessageState(message, selection)

  const dontShowAgainId = `screen-message-modal-${message.id}-dont-show-again`

  // Capture whatever had focus right before this mounted, and give it back
  // on unmount — which is how every close reaches this component (see the
  // class comment above). Deliberately not `document.body`: if nothing
  // meaningful was focused there is nothing useful to restore, but we must
  // never *steal* a real prior focus target and strand it on `<body>`.
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null
    return () => {
      const el = restoreFocusRef.current
      if (el && el !== document.body && document.contains(el)) {
        el.focus()
        return
      }
      // No real prior focus to restore — the common case, since this modal
      // is opened automatically by ScreenMessageModalHost on page load, not
      // by a trigger the player clicked. Leaving focus wherever Radix drops
      // it (in practice, <body>) stops a keyboard user cold with no sense of
      // where they landed (SCREEN_MESSAGES_WEB_PLAN.md Task 9 #4). Prefer
      // the message's own inline card — the durable surface for a gating
      // message (SCREEN_MESSAGES_WEB_SPEC.md §6b) — else the page's own
      // <main>. Both need an explicit tabindex to become focus targets at
      // all; set it here rather than in ScreenMessageCard/the page shells so
      // this fix stays contained to the one component that needs it.
      const fallback =
        document.getElementById(`screen-message-${message.id}`) ??
        document.querySelector('main')
      if (fallback instanceof HTMLElement) {
        fallback.tabIndex = -1
        fallback.focus()
      }
    }
  }, [message.id])

  // "Don't show again" is only committed at close time — ticking it is
  // local state until then, so ticking-then-unticking before closing never
  // fires a call (SCREEN_MESSAGES_WEB_SPEC.md §6b). A failed write here must
  // not silently lose the player's choice the way a fire-and-forget `.mutate`
  // did (SCREEN_MESSAGES_WEB_PLAN.md Task 9 #1): await it, and on failure
  // stay open and let `dismiss.error` render below instead of telling the
  // host to unmount this component.
  async function closeAfterDismissIfNeeded() {
    if (showDontShowAgain && dontShowAgain) {
      if (!(await dismissMessage())) return
    }
    onOpenChange(false)
  }

  // The single close-request path for everything Radix itself can trigger —
  // Escape, backdrop click, the built-in X. It stays a synchronous
  // `(open: boolean) => void`, matching Radix's own onOpenChange signature;
  // the async dismiss write it may need to await happens in
  // closeAfterDismissIfNeeded above, fired and not blocked on here.
  //
  // Ignored while a write this player already started is in flight: without
  // this, Escape during a pending Accept closes the modal (and marks it
  // "seen") out from under handleAccept's own await, which is precisely the
  // silent-consent-loss defect 9#1 fixes for the button itself — the plan's
  // "while pending, keep the modal open" applies to the whole modal, not
  // only the Accept button's disabled state. It also stops a second Escape
  // from firing a concurrent duplicate dismiss POST while the first is still
  // in flight. Not a trap (spec §6b rule 1): it lasts only as long as the
  // in-flight request the player themself triggered — success closes the
  // modal on its own, failure clears isPending and Escape works immediately.
  function handleDialogOpenChange(next: boolean) {
    if (next) return
    if (isAccepting || isDismissing) return
    void closeAfterDismissIfNeeded()
  }

  function handleToggleGate() {
    // No network call — the same local, never-networked state as the inline
    // checkbox. rally-api's assert_gate_satisfied writes the acceptance
    // receipt itself from the register request, inside that request's own
    // transaction, so a separate call here would risk an orphan receipt for
    // a registration that never happens (SCREEN_MESSAGES_WEB_SPEC.md §6a).
    // Deliberately bypasses closeAfterDismissIfNeeded: is_dismissible and
    // gate_actions are mutually exclusive at the DB level (`CHECK (NOT
    // (is_dismissible AND cardinality(gate_actions) > 0))`), so a gating
    // message can never also be "Don't show again"-able. Closing straight
    // through onOpenChange keeps that guarantee visible in the code, not
    // just in the data.
    selection?.onToggle(message.id, message.version)
    onOpenChange(false)
  }

  async function handleAccept() {
    // A consent record: closing before this write lands leaves the player
    // believing they accepted with no receipt on file. `accept()` awaits the
    // write and reports whether it landed; on failure stay open and let the
    // error note render below. Critically, never call `onOpenChange` on
    // failure — that is what tells the host to mark this message "seen" and
    // stop asking this visit.
    if (await accept()) onOpenChange(false)
  }

  return (
    <Dialog open onOpenChange={handleDialogOpenChange}>
      {/* aria-modal explicit: the installed @radix-ui/react-dialog (^1.0.5)
          sets role="dialog" and wires aria-labelledby/aria-describedby from
          Title/Description automatically, but does not set aria-modal
          itself — verified against node_modules, not assumed. */}
      <DialogContent
        aria-modal="true"
        className="bg-rally-surface border-rally-border max-w-md"
      >
        {/* `dir="auto"` — direction comes from the author's own text, not from
            a stored locale. See ScreenMessageCard for the full reasoning. */}
        <div dir="auto">
          <DialogHeader>
            <DialogTitle className="text-rally-text">{message.title}</DialogTitle>
            <DialogDescription
              className={cn('text-rally-text-2 leading-relaxed whitespace-pre-line')}
            >
              {message.body}
            </DialogDescription>
          </DialogHeader>
        </div>

        {(showCheckbox || showAcceptButton || showConfirmed || showDontShowAgain) && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <MessageAcceptControls
              message={message}
              selection={selection}
              idPrefix="screen-message-modal"
              showCheckbox={showCheckbox}
              showAccept={showAcceptButton}
              showConfirmed={showConfirmed}
              isChecked={isChecked}
              isAccepting={isAccepting}
              onAccept={() => void handleAccept()}
              onToggleGate={handleToggleGate}
            />
            {showDontShowAgain && (
              <label
                htmlFor={dontShowAgainId}
                className="inline-flex items-center gap-2 text-sm text-rally-text-muted cursor-pointer"
              >
                <input
                  id={dontShowAgainId}
                  type="checkbox"
                  checked={dontShowAgain}
                  disabled={isDismissing}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-rally-border cursor-pointer"
                />
                {t('screenMessages.dontShowAgain', { defaultValue: "Don't show again" })}
              </label>
            )}
          </div>
        )}

        {actionErrorMessage && (
          <p role="alert" className="mt-2 text-sm text-red-400">
            {actionErrorMessage}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
