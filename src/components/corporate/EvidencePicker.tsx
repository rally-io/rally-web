import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EVIDENCE_ACCEPT, validateEvidenceFiles, type EvidenceError } from '@/lib/evidenceRules'
import { Field } from './Field'
import { inputClass } from './inputClass'

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Controlled file picker for residency evidence. Holds no state of its own —
 * the page owns `files`; this only reads/validates a pick and reports the
 * outcome. On a rejected pick (too many / bad type) it calls `onError` and
 * leaves `files` untouched — no `onChange` fires.
 */
export function EvidencePicker({
  id,
  label,
  files,
  onChange,
  onError,
  error,
  disabled,
}: {
  id: string
  label: string
  files: File[]
  onChange: (files: File[]) => void
  onError: (key: EvidenceError) => void
  error?: string | null
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    // Reset immediately so re-picking the exact same file still fires a change event.
    e.target.value = ''
    if (picked.length === 0) return

    const err = validateEvidenceFiles(files, picked)
    if (err) {
      onError(err)
      return
    }
    onChange([...files, ...picked])
  }

  function handleRemove(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <Field label={label} htmlFor={id} error={error ?? undefined}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept={EVIDENCE_ACCEPT}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(inputClass(false), 'text-start cursor-pointer disabled:cursor-not-allowed disabled:opacity-50')}
      >
        {t('corporate.reg.evidencePick')}
      </button>

      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${id}-file-${index}`}
              className="flex items-center gap-2 rounded-md bg-rally-surface-2 border border-rally-border px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-rally-text text-start">{file.name}</span>
              <span className="shrink-0 text-xs text-rally-text-muted">{formatMb(file.size)}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleRemove(index)}
                aria-label={t('corporate.reg.evidenceRemove')}
                className="shrink-0 text-rally-text-muted hover:text-rally-text-2 p-1 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  )
}
