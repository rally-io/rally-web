import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTournamentFilterOptions } from '@/hooks/useTournamentFilterOptions'
import { FilterDropdown } from './FilterDropdown'

export function OrganizerFilterDropdown({
  selected,
  onApply,
  search = '',
}: {
  selected: string[]
  onApply: (organizerSlugs: string[]) => void
  /** The page's own search term, forwarded to filter-options so the counts
   * describe the same list the page is showing. */
  search?: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data, isError, isPending, refetch } = useTournamentFilterOptions(open, search)
  // Counts here span every tournament an organizer has run, past included —
  // the API does not scope them to the open feed the way it does for clubs.
  const organizers = data?.organizers ?? []

  return (
    <FilterDropdown
      label={t('tournament.tournamentsFilterOrganizers')}
      options={organizers.map((o) => ({
        value: o.slug,
        label: o.name,
        count: o.count,
        avatarUrl: o.avatar_url,
      }))}
      selected={selected}
      onApply={onApply}
      applyLabel={(count) =>
        count === 0
          ? t('tournament.tournamentsFilterApplyBare')
          : t('tournament.tournamentsFilterApplyOrganizers', { count })
      }
      emptyLabel={t('tournament.tournamentsFilterNoOrganizers')}
      searchable
      searchPlaceholder={t('tournament.tournamentsFilterSearchOrganizer')}
      isPending={isPending}
      isError={isError}
      onRetry={() => refetch()}
      onOpenChange={setOpen}
    />
  )
}
