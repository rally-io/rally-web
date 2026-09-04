// src/hooks/usePendingPayment.ts
// Typed sessionStorage helper for the payment redirect round-trip
import type { PaymentEntityType } from '@/types/api'

const KEY = 'rally.pendingPayment'

export interface PendingPayment {
  type: PaymentEntityType
  entityId: string
  amount: number
  tournamentId?: string
  eventId?: string
  useCredits?: boolean
  requiresApproval?: boolean
}

function isValidShape(v: unknown): v is PendingPayment {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.type === 'string' &&
    (o.type === 'booking' ||
      o.type === 'tournament_registration' ||
      o.type === 'event_participation' ||
      o.type === 'tournament_waitlist_hold') &&
    typeof o.entityId === 'string' &&
    typeof o.amount === 'number'
  )
}

export const pendingPayment = {
  get(): PendingPayment | null {
    try {
      const raw = sessionStorage.getItem(KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return isValidShape(parsed) ? parsed : null
    } catch {
      return null
    }
  },
  set(value: PendingPayment): void {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(value))
    } catch {
      // sessionStorage unavailable (private mode, etc.) — silent drop.
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  },
}