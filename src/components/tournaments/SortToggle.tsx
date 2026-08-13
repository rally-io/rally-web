import { useTranslation } from 'react-i18next'
import { ArrowUpDown } from 'lucide-react'

export type TournamentSort = 'soonest' | 'latest'

export function SortToggle({
  value,
  onChange,
}: {
  value: TournamentSort
  onChange: (next: TournamentSort) => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => onChange(value === 'soonest' ? 'latest' : 'soonest')}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-rally-border bg-rally-surface px-4 text-sm font-semibold text-rally-text transition-colors hover:border-rally-border-strong"
    >
      <ArrowUpDown className="h-4 w-4" />
      {value === 'soonest'
        ? t('tournament.tournamentsSortSoonest')
        : t('tournament.tournamentsSortLatest')}
    </button>
  )
}
