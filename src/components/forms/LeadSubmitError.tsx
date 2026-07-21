import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface LeadSubmitErrorProps {
  /** Re-shows the form so the user can resubmit. */
  onRetry: () => void
}

/**
 * Shown when a lead form fails to reach the backend.
 *
 * The three lead forms (/crm, /contact, /coaches) previously rendered their
 * success screen regardless of whether the write succeeded, so a failed
 * submission looked identical to a successful one and the person walked away
 * believing they had applied. This is the honest alternative: say it failed and
 * give them a route that works.
 */
export default function LeadSubmitError({ onRetry }: LeadSubmitErrorProps) {
  const { t } = useTranslation()
  const email = t('common.supportEmail')

  return (
    <div
      role="alert"
      className="rounded-2xl bg-rally-surface border border-rally-error/40 p-8 text-center"
    >
      <AlertTriangle className="w-12 h-12 text-rally-error mb-4 mx-auto" />
      <h3 className="font-display text-2xl sm:text-3xl font-black text-rally-text mb-3">
        {t('common.leadErrorTitle')}
      </h3>
      <p className="text-base text-rally-text-2 leading-relaxed max-w-md mx-auto mb-6">
        {t('common.leadErrorMessage', { email })}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl bg-rally-accent text-rally-accent-text font-bold hover:bg-rally-accent-hover transition-colors"
        >
          {t('common.leadErrorRetry')}
        </button>
        <a
          href={`mailto:${email}`}
          className="px-5 py-2.5 rounded-xl border border-rally-border text-rally-text font-bold hover:border-rally-border-strong transition-colors"
        >
          {email}
        </a>
      </div>
    </div>
  )
}
