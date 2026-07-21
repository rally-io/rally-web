import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { pendingPayment } from '@/hooks/usePendingPayment'

const ALLOWED_ENTITY_TYPES = new Set(['booking', 'tournament_registration', 'event_participation'])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(v: string | null | undefined): v is string {
  return !!v && UUID_RE.test(v)
}

export default function PaymentReturnPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const pending = pendingPayment.get()

  useEffect(() => {
    const status = params.get('status')
    const type = params.get('type')
    const id = params.get('id')

    // Guard against spoofed success redirects (C3 + C2 combo).
    // An attacker could link someone to /payment-return?status=success&type=booking&id=<random>;
    // combined with the error-fallback-to-confirmed bug (C2) this would produce a false positive.
    // With C2 fixed, the allowlist is still a defense-in-depth hygiene measure.
    // Also require id to be a valid UUID (spec §4.2).
    if (status === 'success' && type && isUuid(id) && ALLOWED_ENTITY_TYPES.has(type)) {
      const sp = new URLSearchParams({ type, id })
      const tid = params.get('tournament_id') ?? pending?.tournamentId
      const eid = params.get('event_id') ?? pending?.eventId
      if (tid) sp.set('tournament_id', tid)
      if (eid) sp.set('event_id', eid)
      navigate(`/payments/confirming?${sp.toString()}`, { replace: true })
    } else {
      const sp = new URLSearchParams()
      if (type) sp.set('type', type)
      if (id) sp.set('id', id)
      navigate(`/payments/failed?${sp.toString()}`, { replace: true })
    }
  }, [params, navigate])

  return (
    <main className="min-h-screen bg-rally-bg flex items-center justify-center px-4">
      <div className="text-center text-rally-text-2">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-rally-border border-t-rally-accent" />
        <p>{t('payment.confirming')}</p>
      </div>
    </main>
  )
}