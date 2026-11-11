import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { evidenceFailureKey } from '@/lib/evidenceRules'
import { toApiFailure, uploadCorporateEvidence } from '../api'
import { useRegistrationStatus } from '../hooks'
import { Markdown } from '../markdown'
import type { StoredRegistration } from '../storage'
import { findComponent, type ApiFailure, type PublicCorporateEvent } from '../types'
import { uploadAllEvidence } from '../evidence'
import { EvidenceBlock } from './EvidenceBlock'

export interface PendingEvidence {
  files: Record<1 | 2, File[]>
  slots: (1 | 2)[]
}

type SlotState = 'idle' | 'uploading' | 'failed'

/**
 * What a visitor sees once registered: confirmed, or waitlisted with its position, read from
 * `GET /public/corporate-registrations/{id}` with the stored token. Also where evidence that is
 * still missing gets uploaded — right after submit (files the form held) or on a later visit —
 * and where "register another pair" lives.
 */
export function RegisteredCard({
  event, registration, pendingEvidence, onRegisterAnother, onInvalidToken,
}: {
  event: PublicCorporateEvent
  registration: StoredRegistration
  /** Files the form held when it registered; uploaded once, here, without blocking the card. */
  pendingEvidence?: PendingEvidence
  onRegisterAnother: () => void
  /** The token no longer opens this registration (rotated / unknown): the page drops it and shows the form. */
  onInvalidToken: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: status, error, isPending, refetch } = useRegistrationStatus(registration.registration_id, registration.access_token)
  const evidence = findComponent(event.landing_config, 'evidence')
  const [files, setFiles] = useState<Record<1 | 2, File[]>>({ 1: [], 2: [] })
  const [slotState, setSlotState] = useState<Record<1 | 2, SlotState>>({ 1: 'idle', 2: 'idle' })
  const [slotError, setSlotError] = useState<Partial<Record<1 | 2, string>>>({})
  const startedUpload = useRef(false)

  const failure = error as unknown as ApiFailure | null
  const tokenRejected = failure != null && (failure.status === 401 || failure.status === 403 || failure.status === 404)
  useEffect(() => {
    if (tokenRejected) onInvalidToken()
  }, [tokenRejected, onInvalidToken])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['corporate-registration', registration.registration_id] })

  // The first upload after registering. Independent per participant; a failure keeps the files and
  // shows a retry — it never throws and never hides the "you're registered" card.
  useEffect(() => {
    if (!pendingEvidence || startedUpload.current) return
    startedUpload.current = true
    const { slots, files: held } = pendingEvidence
    if (!slots.some((s) => held[s].length > 0)) return
    setSlotState((s) => ({ ...s, ...Object.fromEntries(slots.filter((x) => held[x].length > 0).map((x) => [x, 'uploading'])) }))
    void uploadAllEvidence(registration.registration_id, registration.access_token, held, slots).then((results) => {
      setSlotState((s) => {
        const next = { ...s }
        for (const slot of slots) if (results[slot].outcome !== 'skipped') next[slot] = results[slot].outcome === 'failed' ? 'failed' : 'idle'
        return next
      })
      setSlotError((e) => {
        const next = { ...e }
        for (const slot of slots) {
          if (results[slot].outcome === 'failed') next[slot] = t(`corporate.reg.${evidenceFailureKey(results[slot].code)}`)
        }
        return next
      })
      setFiles((f) => {
        const next = { ...f }
        for (const slot of slots) if (results[slot].outcome === 'failed') next[slot] = held[slot]
        return next
      })
      void refresh()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once for the registration just made
  }, [pendingEvidence])

  async function upload(slot: 1 | 2) {
    if (files[slot].length === 0) return
    setSlotState((s) => ({ ...s, [slot]: 'uploading' }))
    setSlotError((e) => ({ ...e, [slot]: undefined }))
    try {
      await uploadCorporateEvidence(registration.registration_id, registration.access_token, slot, files[slot])
      setFiles((f) => ({ ...f, [slot]: [] }))
      setSlotState((s) => ({ ...s, [slot]: 'idle' }))
      void refresh()
    } catch (e) {
      const code = toApiFailure(e).code
      setSlotState((s) => ({ ...s, [slot]: 'failed' }))
      setSlotError((m) => ({ ...m, [slot]: t(`corporate.reg.${evidenceFailureKey(code)}`) }))
    }
  }

  if (isPending || tokenRejected) {
    return <div className="h-48 rounded-2xl bg-rally-surface animate-pulse" data-testid="registered-loading" />
  }

  if (!status) {
    return (
      <div className="rounded-2xl bg-rally-surface border border-rally-border p-6 text-center space-y-4" role="alert">
        <p className="text-sm text-rally-text-2">{t('corporate.dyn.statusError')}</p>
        <button type="button" onClick={() => void refetch()} className="text-sm font-display font-bold text-rally-accent">
          {t('corporate.reg.retry')}
        </button>
      </div>
    )
  }

  const active = status.status === 'confirmed' || status.status === 'waitlisted'
  const customMessage = event.landing_config.success_message_md.trim()
  const names = status.participants.map((p) => `${p.first_name} ${p.last_name}`.trim())
  const evidenceSlots: (1 | 2)[] = evidence?.enabled
    ? (evidence.per_participant && status.participants.length === 2 ? [1, 2] : [1])
    : []
  // Slots that still need files: nothing on the server yet, or a failed attempt we hold files for.
  const missing = evidenceSlots.filter((s) => (status.evidence_counts[String(s)] ?? 0) === 0 || files[s].length > 0 || slotState[s] !== 'idle')
  const uploading = missing.some((s) => slotState[s] === 'uploading')

  return (
    <div className="rounded-2xl bg-rally-surface border border-rally-accent/40 p-6 sm:p-8 shadow-glow-electric space-y-5" data-testid="registered-card">
      <div className="text-center">
        {status.status === 'confirmed' && <CheckCircle2 className="w-12 h-12 text-rally-accent mb-4 mx-auto" aria-hidden />}
        {status.status === 'waitlisted' && <Clock className="w-12 h-12 text-rally-warning mb-4 mx-auto" aria-hidden />}
        {!active && <XCircle className="w-12 h-12 text-rally-text-muted mb-4 mx-auto" aria-hidden />}
        <h2 className="font-display text-2xl sm:text-3xl font-black text-rally-text mb-2">{t(`corporate.dyn.status.${status.status}.title`)}</h2>
        {!(status.status === 'confirmed' && customMessage) && (
          <p className="text-base text-rally-text-2 leading-relaxed">
            {status.status === 'waitlisted' && status.waitlist_position
              ? t('corporate.dyn.status.waitlisted.position', { n: status.waitlist_position })
              : t(`corporate.dyn.status.${status.status}.body`)}
          </p>
        )}
      </div>

      {/* The CRM's success message is the confirmation text (markdown). Without one, the stock wording
          already above is the message. A waitlisted registration keeps its own wording first — the
          manager's "you're in!" must not be the only thing a waitlisted pair reads. */}
      {active && customMessage && <Markdown source={customMessage} />}

      {active && evidenceSlots.length > 0 && missing.length > 0 && (
        <section className="space-y-3 border-t border-rally-border-subtle pt-5" data-testid="remaining-evidence">
          <h3 className="font-display font-bold text-sm text-rally-text">{t('corporate.dyn.evidenceRemainingTitle')}</h3>
          <EvidenceBlock
            idPrefix="corp-card-evidence" instructions={evidence?.instructions_md} slots={missing}
            names={{ 1: status.participants[0]?.first_name, 2: status.participants[1]?.first_name }}
            files={files} maxFiles={evidence?.max_files ?? 2} disabled={uploading}
            onChange={(slot, next) => setFiles((f) => ({ ...f, [slot]: next }))}
            errors={slotError}
          />
          {missing.map((slot) => (
            <div key={slot}>
              {slotState[slot] === 'failed' && !slotError[slot] && (
                <p role="alert" className="text-xs text-rally-error mb-2">{t('corporate.reg.evidenceUploadFailed')}</p>
              )}
              <button
                type="button" onClick={() => void upload(slot)} disabled={files[slot].length === 0 || slotState[slot] === 'uploading'}
                className="h-11 px-4 rounded-lg bg-rally-accent text-rally-accent-text text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2"
              >
                {slotState[slot] === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                {missing.length > 1 && names[slot - 1]
                  ? t('corporate.dyn.evidenceUploadFor', { name: status.participants[slot - 1]?.first_name })
                  : t('corporate.dyn.evidenceUpload')}
              </button>
            </div>
          ))}
        </section>
      )}

      <div className="text-center">
        <button type="button" onClick={onRegisterAnother} className="text-xs text-rally-text-2 underline underline-offset-4 hover:text-rally-accent transition-colors">
          {t('corporate.dyn.registerAnother')}
        </button>
      </div>
    </div>
  )
}
