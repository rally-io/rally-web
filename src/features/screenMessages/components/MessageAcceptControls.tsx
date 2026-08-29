import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import type { GateAction, ScreenMessage, ScreenMessageSelection } from '../types'

interface Props {
  message: ScreenMessage
  selection?: ScreenMessageSelection
  idPrefix: string
  showCheckbox: boolean
  showAccept: boolean
  showConfirmed: boolean
  isChecked: boolean
  isAccepting: boolean
  onAccept: () => void
  /** What ticking the consent checkbox does. Defaults to `selection.onToggle`;
   *  the modal overrides it to also close itself, since the inline card behind
   *  it stays on screen holding the same tick. Never a network call either way —
   *  the receipt is written by the register request's own transaction. */
  onToggleGate?: () => void
}

/**
 * The accept surface of a message — consent checkbox, Accept button, or the
 * accepted confirmation — shared verbatim between the inline card and the modal.
 * Both previously carried their own byte-identical copy, down to the Tailwind
 * class strings.
 *
 * `idPrefix` is what keeps the checkbox's `htmlFor`/`id` unique when the card and
 * the modal render the same message at the same time, which is the normal case
 * for a gating `display_mode: 'modal'` message.
 */
export function MessageAcceptControls({
  message,
  selection,
  idPrefix,
  showCheckbox,
  showAccept,
  showConfirmed,
  isChecked,
  isAccepting,
  onAccept,
  onToggleGate,
}: Props) {
  const { t } = useTranslation()
  const checkboxId = `${idPrefix}-${message.id}-accept-checkbox`

  return (
    <>
      {showCheckbox && selection && (
        <label
          htmlFor={checkboxId}
          className="inline-flex items-center gap-2 text-sm font-semibold text-rally-text cursor-pointer"
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={isChecked}
            aria-required="true"
            onChange={() => (onToggleGate ? onToggleGate() : selection.onToggle(message.id, message.version))}
            className="w-4 h-4 rounded border-rally-border accent-rally-success cursor-pointer"
          />
          {t(consentLabel(selection.action).key, {
            defaultValue: consentLabel(selection.action).fallback,
          })}
        </label>
      )}
      {showAccept && (
        <button
          type="button"
          onClick={onAccept}
          disabled={isAccepting}
          className="inline-flex items-center rounded-full bg-rally-accent px-4 py-2 text-sm font-bold text-rally-accent-text hover:bg-rally-accent-hover disabled:opacity-50 transition-colors"
        >
          {t('screenMessages.accept', { defaultValue: 'Accept' })}
        </button>
      )}
      {showConfirmed && (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rally-success">
          <CheckCircle2 className="w-4 h-4" />
          {t('screenMessages.accepted', { defaultValue: 'Accepted' })}
        </span>
      )}
    </>
  )
}

/**
 * The i18n key and fallback for the consent checkbox's label, per gate action.
 *
 * Both surfaces previously hardcoded `screenMessages.acceptTournamentTerms` —
 * "I accept the tournament terms" — for ANY gate action, so wiring `court_booking`
 * or `event_join` would have mislabelled what the player was consenting to. Keyed
 * off the action, with a neutral fallback for one added later.
 */
const CONSENT_LABELS: Record<GateAction, { key: string; fallback: string }> = {
  tournament_registration: {
    key: 'screenMessages.consent.tournament_registration',
    fallback: 'I accept the tournament terms',
  },
  court_booking: {
    key: 'screenMessages.consent.court_booking',
    fallback: 'I accept the booking terms',
  },
  event_join: {
    key: 'screenMessages.consent.event_join',
    fallback: 'I accept the class terms',
  },
}

function consentLabel(action: GateAction): { key: string; fallback: string } {
  return (
    CONSENT_LABELS[action] ?? {
      key: 'screenMessages.consent.generic',
      fallback: 'I accept the terms',
    }
  )
}
