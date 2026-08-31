import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTournamentFilterOptions } from '@/hooks/useTournamentFilterOptions'
import { FilterDropdown } from './FilterDropdown'

export function ClubFilterDropdown({
  selected,
  onApply,
  search = '',
}: {
  selected: string[]
  onApply: (clubIds: string[]) => void
  /** The page's own search box term (not the popover's club-name filter
   * below) — forwarded to filter-options so a club's advertised count
   * matches what selecting it yields while the list is search-narrowed. */
  search?: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data, isError, isPending, refetch } = useTournamentFilterOptions(open, search)
  const clubs = data?.clubs ?? []

  return (
    <FilterDropdown
      label={t('tournament.tournamentsFilterClubs')}
      options={clubs.map((c) => ({ value: c.id, label: c.name, count: c.count }))}
      selected={selected}
      onApply={onApply}
      applyLabel={(count) =>
        count === 0
          ? t('tournament.tournamentsFilterApplyBare')
          : t('tournament.tournamentsFilterApplyClubs', { count })
      }
      emptyLabel={t('clubs.empty')}
      searchable
      searchPlaceholder={t('tournament.tournamentsFilterSearchClub')}
      isPending={isPending}
      isError={isError}
      onRetry={() => refetch()}
      onOpenChange={setOpen}
    />
  )
}
