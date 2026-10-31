import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { leaveTournamentWaitlist } from '@/services/api/tournaments'
import { translateWaitlistError } from '@/lib/registrationErrors'

export interface UseLeaveWaitlistOptions {
  /** Re-reads the tournament. Called after a success and after an answered refusal. */
  refetch: () => unknown
  /** The server took the pair off the list. */
  onLeft?: () => void
  /** The server says there is no such entry (the club removed or seated it). */
  onEntryGone?: () => void
}

/**
 * Leave the waiting list (the server returns whatever the pair paid or put on
 * hold). A refusal means the page may be out of date, so it refetches; only
 * "not on the waiting list" means the entry is gone, any other refusal leaves
 * the player waiting. A failure that never reached the server carries no status
 * and no site-language text, so it gets the generic message and no refetch.
 */
export function useLeaveWaitlist(tournamentId: string | undefined, options: UseLeaveWaitlistOptions) {
  const { t } = useTranslation()
  const { refetch, onLeft, onEntryGone } = options
  const [isLeaving, setIsLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  // The call outlives the component when the account changes under the page.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const leave = useCallback(async () => {
    if (!tournamentId) return
    setIsLeaving(true)
    setLeaveError(null)
    const refused = (message: string, code?: string) => {
      setLeaveError(translateWaitlistError(message, t))
      if (code === 'WAITLIST_ENTRY_NOT_FOUND') onEntryGone?.()
      void refetch()
    }
    try {
      const result = await leaveTournamentWaitlist(tournamentId)
      if (!mounted.current) return
      if (!result.success) {
        refused(result.error.message, result.error.code)
        return
      }
      onLeft?.()
      void refetch()
    } catch (e) {
      const err = e as { status?: number; code?: string; message?: string } | null
      if (!mounted.current) return
      if (typeof err?.status === 'number' && err.message) refused(err.message, err.code)
      else setLeaveError(t('tournament.tournamentLeaveWaitlistFailed'))
    } finally {
      if (mounted.current) setIsLeaving(false)
    }
  }, [tournamentId, t, refetch, onLeft, onEntryGone])

  return { leave, isLeaving, leaveError }
}
