import { useTranslation } from 'react-i18next'
import { statusColor, STATUS_BG } from '@/lib/tournamentTheme'

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const cls = STATUS_BG[statusColor(status)]
  const label = t(`tournament.registrationStatus_${status}`, {
    defaultValue: status.replace(/_/g, ' '),
  })
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  )
}
