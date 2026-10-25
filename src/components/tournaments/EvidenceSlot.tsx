import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EvidencePicker } from '@/components/corporate/EvidencePicker'
import { uploadRegistrationEvidence } from '@/services/api/registrationEvidence'
import { evidenceFailureKey, uploadErrorCode, validateEvidenceFiles } from '@/lib/evidenceRules'

/**
 * One declared resident's evidence on an existing registration (seated or on
 * the waiting list). This is the permanent recovery path for a failed
 * post-register upload (the form's own `uploadFailed` flash is gone):
 * whatever left this slot's count at 0 while the claim is still open (pending,
 * or approved with nothing in the slot), the player can pick files and retry
 * from here, as many times as it takes.
 */
export function EvidenceSlot({
  registrationId, slot, label, count, open, refetchTournament,
}: {
  registrationId: string
  slot: 1 | 2
  /** Whose proof this slot holds — the card decides ("the resident's" for a 1-of-2 claim). */
  label: string
  count: number
  /** The claim still takes documents (pending, or approved with this slot empty). */
  open: boolean
  refetchTournament: () => Promise<unknown>
}) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** rally-api's code for the last failed attempt — the message says why. */
  const [failure, setFailure] = useState<string | null>(null)

  const handleAdd = async () => {
    if (files.length === 0) {
      setError(t('corporate.reg.evidenceRequired'))
      return
    }
    const badFile = validateEvidenceFiles([], files)
    if (badFile) {
      setError(t(`corporate.reg.${badFile}`))
      return
    }
    setError(null)
    setFailure(null)
    setBusy(true)
    try {
      await uploadRegistrationEvidence(registrationId, slot, files)
      setFiles([])
    } catch (uploadError) {
      console.error('[EvidenceSlot] add-evidence upload failed:', uploadError)
      setFailure(uploadErrorCode(uploadError) ?? 'UNKNOWN')
    } finally {
      setBusy(false)
      await refetchTournament()
    }
  }

  return (
    <div>
      <p className="text-sm text-rally-text-2">{label} · {t('corporate.reg.evidenceCount', { n: count })}</p>
      {count === 0 && open && (
        <div className="mt-2 space-y-2">
          <EvidencePicker
            id={`registered-evidence-${slot}`}
            label={label}
            files={files}
            onChange={(next) => {
              setFiles(next)
              setError(null)
            }}
            onError={(key) => setError(t(`corporate.reg.${key}`))}
            error={error}
            disabled={busy}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleAdd()}
            className="w-full h-10 rounded-full border border-rally-accent text-rally-accent font-display font-bold text-sm disabled:opacity-50"
          >
            {t('corporate.reg.addEvidence')}
          </button>
          {failure && (
            <p role="alert" className="text-sm text-rally-error">
              {t(`corporate.reg.${evidenceFailureKey(failure)}`)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
