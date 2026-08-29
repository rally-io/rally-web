import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useAcknowledgeMessage, useDismissMessage } from './useMessageActions'
import type { ScreenMessage, ScreenMessageSelection } from '../types'

/**
 * THE visibility and action state machine for one screen message.
 *
 * Headless on purpose. `ScreenMessageCard` and `ScreenMessageModal` render the
 * same message in two different shells, and every one of these derivations was
 * previously written out twice, line for line, under a comment promising the two
 * copies were "kept deliberately in sync". Nothing enforced that, and they had
 * already drifted — the modal awaited `mutateAsync` in a try/catch (so a failed
 * write kept the player's consent on screen) while the card fired
 * `acknowledge.mutate` and forgot about it. The awaited variant is canonical here.
 *
 * The next input the API adds to "should this control show" gets added once.
 */
export function useScreenMessageState(
  message: ScreenMessage,
  selection?: ScreenMessageSelection,
) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { requireSignIn } = useAuthGate()
  const acknowledge = useAcknowledgeMessage()
  const dismiss = useDismissMessage()

  // `requires_acknowledgment` is the API's ENFORCEMENT-AWARE field: it is false
  // when the server would not actually refuse this action for this client, even
  // though `gate_actions` is non-empty. Reading it (rather than
  // `gate_actions.length > 0`) is what keeps the UI from blocking on a gate the
  // API lets straight through.
  const needsAcknowledgment = message.requires_acknowledgment && !message.is_acknowledged
  const gatesSelectedAction =
    !!selection && (message.gate_actions ?? []).includes(selection.action)
  const showCheckbox = gatesSelectedAction && needsAcknowledgment
  const showAccept = needsAcknowledgment && !showCheckbox
  const showConfirmed = message.requires_acknowledgment && message.is_acknowledged
  const isChecked = !!selection && selection.selectedIds.has(message.id)

  // Signed-out visitors never see a dismiss control. `handleAccept` has
  // `requireSignIn()` to fall back on; dismiss has no such gate server-side (it
  // POSTs and 403s), and "do not show a control they cannot use" wins over
  // forcing a sign-in just to hide a notice.
  const canDismiss = message.is_dismissible && !!session

  /** Accept. Awaited, so a failed write leaves the control on screen rather
   *  than silently losing the player's consent. Resolves true on success. */
  async function accept(): Promise<boolean> {
    if (!session) {
      try {
        await requireSignIn()
      } catch {
        // USER_CANCELLED or SUPERSEDED (see AuthGateContext) — leave the
        // control exactly as it was; nothing to acknowledge yet.
        return false
      }
    }
    try {
      await acknowledge.mutateAsync({ messageId: message.id, version: message.version })
      return true
    } catch {
      return false
    }
  }

  async function dismissMessage(): Promise<boolean> {
    try {
      await dismiss.mutateAsync({ messageId: message.id, version: message.version })
      return true
    } catch {
      return false
    }
  }

  // Whichever mutation last failed drives the note — accept and dismiss are
  // never both offered on the same message (is_dismissible and
  // requires_acknowledgment are never both set by the API), so there is no real
  // case where both could be showing an error at once.
  const actionError = acknowledge.error ?? dismiss.error
  const actionErrorMessage = actionError
    ? actionError.code === 'MESSAGE_VERSION_STALE'
      ? t('screenMessages.messageChanged', {
          defaultValue: 'This message was updated. Please read it again.',
        })
      : t('screenMessages.actionFailed', {
          defaultValue: 'Something went wrong. Please try again.',
        })
    : null

  return {
    needsAcknowledgment,
    showCheckbox,
    showAccept,
    showConfirmed,
    canDismiss,
    isChecked,
    accept,
    dismissMessage,
    isAccepting: acknowledge.isPending,
    isDismissing: dismiss.isPending,
    actionErrorMessage,
  }
}
