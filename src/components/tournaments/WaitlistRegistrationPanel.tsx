import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { CreditCard } from 'lucide-react'
import { EvidenceSlot } from '@/components/tournaments/EvidenceSlot'
import { evidenceFailureKey } from '@/lib/evidenceRules'
import { waitlistPaymentState, type WaitlistPaymentState } from '@/lib/waitlistPayment'
import type { MyRegistration } from '@/types/api'

interface Props {
  /** `my_waitlist_entry.registration` — the sign-up behind the waiting-list entry. */
  registration: MyRegistration
  tournament: { id: string; format: string; entry_fee: number }
  /** Same-origin path the payment pages hand back to (the corporate /join page). */
  returnTo?: string
  /** rally-api's code for an upload that failed while registering, if one did. */
  evidenceError?: string | null
  /** Re-reads the tournament after an add-evidence upload so the count updates. */
  onEvidenceChanged: () => Promise<unknown>
}

// Literal keys on purpose: src/i18n/__tests__/literalKeys.test.ts scans `t('…')`
// calls, and a lookup table of key strings would escape it.
function paymentLabel(state: WaitlistPaymentState, t: TFunction): string {
  switch (state) {
    case 'held': return t('tournament.tournamentWaitlistPaymentHeld')
    case 'settled': return t('tournament.tournamentWaitlistPaymentSettled')
    case 'free': return t('tournament.tournamentWaitlistPaymentFree')
    default: return t('tournament.tournamentWaitlistPaymentAwaiting')
  }
}

/**
 * The registration behind a waiting-list entry, as the player sees it: partner,
 * residency review, payment state (with Complete payment while unpaid) and the
 * residency document slots. Rendered inside `WaitlistCard` on both the
 * tournament page and the corporate /join page.
 */
export function WaitlistRegistrationPanel({
  registration, tournament, returnTo, evidenceError = null, onEvidenceChanged,
}: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const seats: 1 | 2 = tournament.format === 'singles' ? 1 : 2
  const residents = (registration.fee_waiver_resident_count ?? 0) as 0 | 1 | 2
  const pay = waitlistPaymentState(registration, tournament.entry_fee, seats)
  const partner = seats === 2 ? registration.player_2_name ?? registration.guest_player_2_name ?? null : null

  const waiverPending = registration.fee_waiver_status === 'pending' && residents > 0
  const waiverApproved = registration.fee_waiver_status === 'approved' && residents > 0
  const waiverLine = waiverPending
    ? registration.fee_waiver_type === 'holon_resident'
      ? t('corporate.reg.registeredStatus_waiverPending', { residents })
      : t('tournament.registeredStatus_waiverPending', { residents, seats })
    : waiverApproved
    ? t('corporate.reg.waiverApproved')
    : null

  // Same rules as the corporate RegisteredCard: a slot exists per declared
  // resident (bounded by the seat count), and a claim still takes documents
  // while pending, or approved with a slot left empty.
  const declaredSlots = ([1, 2] as const).filter((slot) => slot <= residents && slot <= seats)
  const slotCount = (slot: 1 | 2) => registration.evidence_counts?.[slot === 1 ? '1' : '2'] ?? 0
  const claimOpen = residents > 0 && (waiverPending || waiverApproved)
  const missingEvidence = claimOpen && declaredSlots.some((slot) => slotCount(slot) === 0)

  const completePayment = () =>
    navigate(
      `/payment-method?${new URLSearchParams({
        registration_id: registration.id,
        tournament_id: tournament.id,
        waitlist: '1',
        ...(returnTo ? { return_to: returnTo } : {}),
      }).toString()}`,
    )

  return (
    <div data-testid="waitlist-registration-panel" className="space-y-2 text-sm">
      {partner && (
        <p className="text-rally-text-2">
          {t('tournament.tournamentPartner')}: <span className="font-bold text-rally-text">{partner}</span>
        </p>
      )}
      {waiverLine && (
        <p data-testid="waitlist-waiver-line" className="text-rally-text-2">{waiverLine}</p>
      )}
      <p data-testid="waitlist-payment-state" className="font-semibold text-rally-text">
        {paymentLabel(pay, t)}
      </p>
      {pay === 'awaiting' && (
        <>
          <p className="text-rally-text-2">{t('tournament.tournamentWaitlistAwaitingNote')}</p>
          <button
            type="button"
            data-testid="waitlist-complete-payment"
            onClick={completePayment}
            className="w-full h-11 rounded-full bg-rally-accent text-rally-accent-text font-display font-bold inline-flex items-center justify-center gap-2 hover:bg-rally-accent-hover transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            {t('tournament.tournamentWaitlistCompletePayment')}
          </button>
        </>
      )}
      {missingEvidence && (
        <div role="alert" className="rounded-xl border border-rally-error/50 bg-rally-error/10 p-4">
          <p className="font-bold text-rally-error">{t('corporate.reg.evidenceMissingTitle')}</p>
          <p className="mt-1 text-rally-text-2 leading-relaxed">
            {waiverPending
              ? t('corporate.reg.evidenceMissingBodyPending')
              : t('corporate.reg.evidenceMissingBodyApproved')}
          </p>
          {evidenceError && (
            <p className="mt-2 text-rally-text leading-relaxed">
              {t(`corporate.reg.${evidenceFailureKey(evidenceError)}`)}
            </p>
          )}
        </div>
      )}
      {declaredSlots.length > 0 && (
        <div className="space-y-4">
          {declaredSlots.map((slot) => (
            <EvidenceSlot
              key={slot}
              registrationId={registration.id}
              slot={slot}
              label={
                slot === 2 ? t('corporate.reg.evidencePartner')
                : residents === 1 && seats === 2 ? t('corporate.reg.evidenceResident')
                : t('corporate.reg.evidenceMine')
              }
              count={slotCount(slot)}
              open={claimOpen}
              refetchTournament={onEvidenceChanged}
            />
          ))}
        </div>
      )}
    </div>
  )
}
