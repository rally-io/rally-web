import { useMemo, type ReactNode } from 'react'
import { useRtl } from '@/hooks/useRtl'
import { groupByMonth, isCurrentMonth, type MonthGroup } from '@/lib/monthGroups'
import { MonthSection } from '@/components/clubs/MonthSection'
import { MonthScrubber } from '@/components/clubs/MonthScrubber'

export interface ArchiveSection<T> {
  /** Namespaces this section's anchor ids, e.g. 'up' / 'past'. */
  key: string
  items: T[]
  /** Chronological direction inside the section: 'asc' for what is coming,
   * 'desc' for what already happened. */
  direction: 'asc' | 'desc'
  isPast: boolean
}

interface Props<T> {
  sections: ArchiveSection<T>[]
  getDate: (item: T) => string
  renderItem: (item: T, isPast: boolean) => ReactNode
  countLabel: (count: number) => string
  /** Rendered between two sections that both have content. */
  dividerLabel?: string
  /** Rendered when nothing groups — e.g. a "no tournaments in this view" panel. */
  empty?: ReactNode
  /** Rendered below the last section, e.g. a load-more button. */
  footer?: ReactNode
}

/**
 * Month-grouped archive: sticky month headings, a per-month count, and the
 * floating month scrubber. Entity-agnostic — the caller decides what a row
 * is (a tournament card, an event card) and how a date is read off it.
 *
 * Shared by the club archive, the organizer archive and the tournaments
 * history tab so the three read identically; the grouping and the scrubber's
 * label disambiguation live here once.
 */
export function MonthArchive<T extends { id: string }>({
  sections,
  getDate,
  renderItem,
  countLabel,
  dividerLabel,
  empty,
  footer,
}: Props<T>) {
  const { locale } = useRtl()

  const grouped = useMemo(
    () =>
      sections.map((section) => ({
        section,
        groups: groupByMonth(section.items, getDate, section.direction),
      })),
    [sections, getDate],
  )

  const scrubberMonths = useMemo(() => {
    const seenMonths = new Set<string>()
    const raw: { key: string; label: string; year: number }[] = []
    for (const { section, groups } of grouped) {
      for (const g of groups) {
        if (seenMonths.has(g.key)) continue
        seenMonths.add(g.key)
        raw.push({
          key: `${section.key}-${g.key}`,
          label: g.date.toLocaleDateString(locale, { month: 'short' }),
          year: g.date.getFullYear() % 100,
        })
      }
    }
    const labelCounts = new Map<string, number>()
    for (const m of raw) labelCounts.set(m.label, (labelCounts.get(m.label) ?? 0) + 1)
    return raw.map(({ key, label, year }) => ({
      key,
      label:
        (labelCounts.get(label) ?? 0) > 1
          ? `${label} ${String(year).padStart(2, '0')}`
          : label,
    }))
  }, [grouped, locale])

  const nonEmpty = grouped.filter(({ groups }) => groups.length > 0)
  if (nonEmpty.length === 0) return <>{empty}</>

  const renderGroup = (g: MonthGroup<T>, section: ArchiveSection<T>) => (
    <MonthSection
      key={`${section.key}-${g.key}`}
      anchorId={`m-${section.key}-${g.key}`}
      monthLabel={g.date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
      countLabel={countLabel(g.items.length)}
      isCurrent={isCurrentMonth(g.key)}
    >
      {g.items.map((item) => renderItem(item, section.isPast))}
    </MonthSection>
  )

  return (
    <>
      {nonEmpty.map(({ section, groups }, i) => (
        <div key={section.key}>
          {i > 0 && dividerLabel && (
            <div className="my-8 flex items-center gap-4 text-[12px] font-bold uppercase tracking-[0.14em] text-rally-text-muted">
              <span className="h-px flex-1 bg-rally-border" />
              {dividerLabel}
              <span className="h-px flex-1 bg-rally-border" />
            </div>
          )}
          {groups.map((g) => renderGroup(g, section))}
        </div>
      ))}
      {footer}
      <MonthScrubber months={scrubberMonths} />
    </>
  )
}
