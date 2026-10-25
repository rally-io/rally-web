import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { WaitlistRegistrationPanel } from '@/components/tournaments/WaitlistRegistrationPanel'
import type { MyRegistration } from '@/types/api'

interface Props {
  /** Queue position from `myWaitlistEntry.position` — 1-indexed. */
  position: number
  onLeave: () => void | Promise<void>
  isLeaving?: boolean
  /**
   * The registration behind the entry (`my_waitlist_entry.registration`): a
   * sign-up made through Register, or a pair bumped to the list. Null/absent
   * for an old card-only join, which renders exactly as it always has.
   */
  registration?: MyRegistration | null
  /** Needed with `registration`: the fee and format decide what is owed. */
  tournament?: { id: string; format: string; entry_fee: number }
  returnTo?: string
  evidenceError?: string | null
  onEvidenceChanged?: () => Promise<unknown>
}

/**
 * Rendered on the tournament detail page and the corporate /join page when
 * `ctaFor` resolves to 'waiting'. The partner/guest picker is gone — that choice
 * was made with the Register form — leaving the place in line, the payment
 * state and documents of the registration behind it, and the option to leave.
 */
export function WaitlistCard({
  position, onLeave, isLeaving = false,
  registration = null, tournament, returnTo, evidenceError = null, onEvidenceChanged,
}: Props) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <section
      data-testid="tournament-waitlist-card"
      className="rounded-2xl bg-rally-surface border border-rally-border p-5 space-y-2"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-rally-accent/70">
        {t('tournament.tournamentWaitlistCardEyebrow')}
      </p>
      <p
        data-testid="tournament-waitlist-position"
        className="text-base font-bold text-rally-text"
      >
        {t('tournament.tournamentWaitlistPosition', { position })}
      </p>
      {/* The position is a queue order, not a promise. Promotion takes an
          explicit entry id from the tournament manager — it does not pop the
          head of the queue — so #1 is genuinely not guaranteed to go first.
          Saying so here is cheaper than a support conversation after someone
          at #2 watches #5 get in. */}
      <p className="text-sm text-rally-text-2">
        {t('tournament.tournamentWaitlistOrderNote')}
      </p>
      {registration && tournament && (
        <WaitlistRegistrationPanel
          registration={registration}
          tournament={tournament}
          returnTo={returnTo}
          evidenceError={evidenceError}
          onEvidenceChanged={onEvidenceChanged ?? (async () => undefined)}
        />
      )}
      <button
        type="button"
        data-testid="tournament-leave-waitlist-button"
        disabled={isLeaving}
        onClick={() => setConfirmOpen(true)}
        className="mt-1 inline-flex items-center justify-center h-10 px-4 rounded-full border border-rally-error text-rally-error font-bold text-sm disabled:opacity-60"
      >
        {isLeaving ? '…' : t('tournament.tournamentLeaveWaitlist')}
      </button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm rounded-3xl bg-rally-surface border-rally-border">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="font-display text-xl font-black text-rally-text">
              {t('tournament.tournamentLeaveWaitlistConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-rally-text-2">
              {registration
                ? t('tournament.tournamentLeaveWaitlistConfirmBodyPaid', { position })
                : t('tournament.tournamentLeaveWaitlistConfirmBody', { position })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="h-11 px-5 rounded-full border border-rally-border text-rally-text font-semibold"
            >
              {t('tournament.tournamentLeaveWaitlistCancelCta')}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false)
                void onLeave()
              }}
              className="h-11 px-5 rounded-full bg-rally-error text-white font-bold"
            >
              {t('tournament.tournamentLeaveWaitlist')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
