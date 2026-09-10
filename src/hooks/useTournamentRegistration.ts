import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { registerTournament } from '@/services/api/tournaments'
import { confirmTournamentZeroPayment } from '@/services/api/payments'
import { translateRegistrationError } from '@/lib/registrationErrors'
import { trackFunnel } from '@/lib/analytics'
import type { useRegistrationGate } from '@/features/screenMessages/hooks/useRegistrationGate'
import type { PartnerSelectionState } from '@/types/partner'
import type {
  AcknowledgedMessageRef,
  FeeWaiverRequest,
  RegisterPayload,
  TournamentRegistrationResult,
} from '@/types/api'

export type RegistrationGate = ReturnType<typeof useRegistrationGate>

// Pure helper — no side-effects, fully testable in isolation. Shared by the
// register and join-waitlist paths (the waitlist replays the same payload shape
// at promotion time).
export function buildRegisterPayload(
  format: string,
  state: PartnerSelectionState,
  acknowledgedMessages: AcknowledgedMessageRef[],
  feeWaiver?: FeeWaiverRequest,
): RegisterPayload {
  const needsPartner = format === 'doubles' || format === 'mixed'
  if (!needsPartner) {
    return {
      partner_type: 'none',
      acknowledged_messages: acknowledgedMessages,
      ...(feeWaiver ? { fee_waiver: feeWaiver } : {}),
    }
  }

  if (state.phase === 'selected') {
    if (state.partner.type === 'existing') {
      return {
        partner_type: 'existing',
        partner_player_id: state.partner.id,
        acknowledged_messages: acknowledgedMessages,
        ...(feeWaiver ? { fee_waiver: feeWaiver } : {}),
      }
    }
    return {
      partner_type: 'invite',
      invite_first_name: state.partner.firstName,
      invite_last_name: state.partner.lastName,
      invite_country_code: state.partner.countryCode,
      invite_phone: state.partner.phone,
      acknowledged_messages: acknowledgedMessages,
      ...(feeWaiver ? { fee_waiver: feeWaiver } : {}),
    }
  }
  // Guard — unreachable when the partner-required gate is enforced by the caller.
  return {
    partner_type: 'none',
    acknowledged_messages: acknowledgedMessages,
    ...(feeWaiver ? { fee_waiver: feeWaiver } : {}),
  }
}

export interface UseTournamentRegistrationOptions {
  /** Same-origin path the payment pages return to afterwards (e.g. /join/acme).
   *  Omitted ⇒ today's behaviour (confirmation offers /my-activity). */
  returnTo?: string
  /** 409 TOURNAMENT_FULL: set the full-line error and call this (the caller
   *  refetches so the page flips to its full state). Omitted ⇒ the raw backend
   *  message is shown, as before. */
  onTournamentFull?: () => void
  /** Keep a residual 422 PROFILE_FIELDS_REQUIRED inline instead of the global
   *  redirect to /profile/edit. */
  skipProfileRedirect?: boolean
  /** Fired once the registration row exists, before the payment hand-off — the
   *  only moment a caller may drop state it must not replay (the partner draft).
   *  Never called when the caller unmounted mid-flight. Awaited before the
   *  payment branches run — CorporateRegistrationPage uses this to upload fee
   *  waiver evidence against the just-created registration. A rejection is
   *  logged and swallowed: an evidence upload failure must never strand an
   *  already-created registration, the page offers "add evidence" later. */
  onRegistered?: (reg: TournamentRegistrationResult) => void | Promise<void>
}

/**
 * The register branching TournamentDetailPage's "Register now" used to own:
 * build the payload → POST → 409 terms gate → free (confirm-zero-payment →
 * confirming) or paid (→ /payment-method) → translated errors. The caller still
 * owns sign-in, the profile prerequisites (TournamentDetailPage redirects to
 * /profile/edit, CorporateRegistrationPage collects them in its own form), the
 * partner-required scroll and the unsatisfied-gate scroll — those are decisions
 * of a specific page, not of the register call.
 */
export function useTournamentRegistration(
  tournament: { id: string; format: string } | null | undefined,
  gate: RegistrationGate,
  options: UseTournamentRegistrationOptions = {},
) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { returnTo, onTournamentFull, skipProfileRedirect, onRegistered } = options
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  // Separate from registerError on purpose: this is the ONE state a tick can
  // retire on its own, without the player pressing anything. Overloading
  // registerError meant a ticked, re-enabled button could still sit under a
  // red "you must accept the terms" sentence from the 409 that led to the
  // tick in the first place.
  const [gateError, setGateError] = useState<string | null>(null)

  // A press can start before sign-in, so the awaited work below outlives this
  // hook's owner whenever the account changes: TournamentDetailPage remounts on
  // a new user id. Without this guard the previous account's in-flight register
  // still navigates the new one to a payment page for a row it does not own.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // Read at call time, not at closure-capture time: `register` is invoked from
  // an async continuation (after sign-in and the caller's profile check), and a
  // gating message may have been ticked or unticked in between.
  const gateRef = useRef(gate)
  gateRef.current = gate

  // The moment ticking satisfies the gate, any stale 409 note is wrong — the
  // player just did the thing it was asking for.
  useEffect(() => {
    if (gate.isSatisfied) setGateError(null)
  }, [gate.isSatisfied])

  const register = useCallback(
    async (partnerState: PartnerSelectionState, feeWaiver?: FeeWaiverRequest): Promise<void> => {
      if (!tournament) return
      const gate = gateRef.current
      setIsRegistering(true)
      setRegisterError(null)
      setGateError(null)
      try {
        const payload = buildRegisterPayload(tournament.format, partnerState, gate.payload, feeWaiver)
        const result = skipProfileRedirect
          ? await registerTournament(tournament.id, payload, { skipProfileRedirect: true })
          : await registerTournament(tournament.id, payload)
        if (!mounted.current) return
        if (!result.success) {
          setRegisterError(translateRegistrationError(result.error.message, t))
          return
        }
        const reg = result.data
        trackFunnel('registration_created', { tournament_id: tournament.id })
        // The registration row exists — the caller may now drop the state it
        // must never replay (the partner draft). Deliberately before the
        // payment hand-off: a failed payment is resumed from the row, not by
        // re-registering. Awaited so an evidence upload can complete before we
        // navigate away — but a failure here must never strand the already-
        // created registration, so it's logged and swallowed, not fatal.
        try {
          await onRegistered?.(reg)
        } catch (onRegisteredError) {
          console.error('[useTournamentRegistration] onRegistered failed:', onRegisteredError)
        }
        // onRegistered can take real time (an evidence upload) — re-check
        // after awaiting it, or a since-unmounted owner (account swap,
        // back button) would still navigate the new context to a payment
        // page for a row it doesn't own.
        if (!mounted.current) return
        const amountToPay = reg.amount_to_pay ?? 0
        // No intermediate summary screen — go straight from Register Now to
        // the add-card step (or, for a free tournament, straight to confirming).
        if (amountToPay < 0.01) {
          const zeroResult = await confirmTournamentZeroPayment(reg.id)
          if (!mounted.current) return
          if (!zeroResult.success) {
            setRegisterError(zeroResult.error.message)
            return
          }
          const sp = new URLSearchParams({
            type: 'tournament_registration',
            id: reg.id,
            tournament_id: tournament.id,
          })
          if (returnTo) sp.set('return_to', returnTo)
          navigate(`/payments/confirming?${sp.toString()}`)
          return
        }
        const sp = new URLSearchParams({
          registration_id: reg.id,
          tournament_id: tournament.id,
          amount: String(amountToPay),
        })
        if (returnTo) sp.set('return_to', returnTo)
        navigate(`/payment-method?${sp.toString()}`)
      } catch (e) {
        // Validation failures (partner already registered, tournament closed,
        // etc.) are RallyException on rally-api — a non-2xx response, which the
        // axios client's interceptor turns into a rejected plain object
        // ({status, code, message, details}), not an Error instance.
        const err = e as { code?: string; message?: string; details?: unknown } | null
        if (!mounted.current) return
        trackFunnel('registration_error', { tournament_id: tournament.id })
        // The 409 safety net (SCREEN_MESSAGES_WEB_SPEC.md §6a): a message
        // was published/edited between page load and register. Refetch,
        // clear ticks, and say so — never auto-retry, the player hasn't
        // seen the new text yet. Must run before the generic fallback below
        // so ACKNOWLEDGMENT_REQUIRED never surfaces as raw backend text.
        if (gate.handleGateError(err)) {
          setGateError(
            t('screenMessages.registrationGateRequired', {
              defaultValue: 'You must accept the tournament terms to continue',
            }),
          )
          return
        }
        if (err?.code === 'TOURNAMENT_FULL' && onTournamentFull) {
          setRegisterError(t('tournament.tournamentFullLine'))
          onTournamentFull()
          return
        }
        // The club cleared fee_waiver_type (or the tournament never had one)
        // while the form was open — a distinct error code, unlike most of
        // rally-api's register_tournament errors, so it can be translated
        // without matching on English text.
        if (err?.code === 'FEE_WAIVER_NOT_AVAILABLE') {
          setRegisterError(t('tournament.registrationErrors.feeWaiverUnavailable'))
          return
        }
        // Extract the real backend message and translate it — rally-api
        // sends plain English text with no distinct error code for most of
        // these.
        setRegisterError(
          err?.message
            ? translateRegistrationError(err.message, t)
            : t('tournament.registrationFailedTitle'),
        )
      } finally {
        if (mounted.current) setIsRegistering(false)
      }
    },
    [tournament, t, navigate, returnTo, onTournamentFull, skipProfileRedirect, onRegistered],
  )

  return { register, isRegistering, registerError, gateError, setRegisterError, setGateError }
}
