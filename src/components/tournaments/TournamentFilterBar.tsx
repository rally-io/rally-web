import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import {
  EMPTY_FILTERS,
  SKILL_BUCKETS,
  activeFilterCount,
  type MonthOption,
  type SkillBucket,
  type TournamentFilters,
} from '@/lib/tournamentFilters'
import { ClubFilterDropdown } from './ClubFilterDropdown'
import { OrganizerFilterDropdown } from './OrganizerFilterDropdown'
import { FilterDropdown } from './FilterDropdown'
import { SortToggle, type TournamentSort } from './SortToggle'

interface Props {
  filters: TournamentFilters
  onChange: (next: TournamentFilters) => void
  /** Months present in the loaded list — derived from data, so the dropdown
   * never offers a month with nothing behind it. */
  monthOptions: MonthOption[]
  /** The page's search term, forwarded to filter-options for matching counts. */
  search?: string
  sort?: TournamentSort
  onSortChange?: (next: TournamentSort) => void
}

/**
 * The tournament list toolbar. Each dropdown edits one dimension of the same
 * `TournamentFilters` value; where that dimension is resolved (API or client)
 * is decided in `@/lib/tournamentFilters`, not here.
 */
export function TournamentFilterBar({
  filters,
  onChange,
  monthOptions,
  search = '',
  sort,
  onSortChange,
}: Props) {
  const { t } = useTranslation()
  const total = activeFilterCount(filters)

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3">
      <ClubFilterDropdown
        selected={filters.clubIds}
        onApply={(clubIds) => onChange({ ...filters, clubIds })}
        search={search}
      />
      <OrganizerFilterDropdown
        selected={filters.organizerSlugs}
        onApply={(organizerSlugs) => onChange({ ...filters, organizerSlugs })}
        search={search}
      />
      <FilterDropdown
        label={t('tournament.tournamentsFilterSkill')}
        options={SKILL_BUCKETS.map((b) => ({ value: b.id, label: t(b.labelKey) }))}
        selected={filters.skills}
        onApply={(skills) => onChange({ ...filters, skills: skills as SkillBucket[] })}
        applyLabel={(count) =>
          count === 0
            ? t('tournament.tournamentsFilterApplyBare')
            : t('tournament.tournamentsFilterApplySkill', { count })
        }
        emptyLabel={t('tournament.skillLevelAll')}
      />
      <FilterDropdown
        label={t('tournament.tournamentsFilterMonth')}
        options={monthOptions.map((m) => ({ value: m.value, label: m.label }))}
        selected={filters.months}
        onApply={(months) => onChange({ ...filters, months })}
        applyLabel={(count) =>
          count === 0
            ? t('tournament.tournamentsFilterApplyBare')
            : t('tournament.tournamentsFilterApplyMonths', { count })
        }
        emptyLabel={t('tournament.tournamentsFilterNoMonths')}
      />
      {sort && onSortChange && <SortToggle value={sort} onChange={onSortChange} />}
      {total > 0 && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-rally-text-2 transition-colors hover:text-rally-text"
        >
          <X className="h-4 w-4" />
          {t('tournament.tournamentsFilterClearAll')}
        </button>
      )}
    </div>
  )
}
