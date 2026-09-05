import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { dropDayLabel, lastCountingDayLabel, quarterParts } from '../utils/quarterDates';
import type { LeagueQuarterBlock } from '../types';

type QuarterTilesProps = {
  /** As the API sends them: oldest first. Displayed newest first. */
  quarters: LeagueQuarterBlock[];
  className?: string;
};

/**
 * The four quarters of the window, in the slot the best-N tray used to occupy and in its
 * visual language: a small grid of tiles, one per quarter, newest first. A filled tile shows
 * the quarter's total, how many events it came from and what was on offer; an empty tile is
 * an invitation, not an apology. Every tile says until when it counts — the oldest says when
 * it leaves, because that is the one a player can watch approach.
 */
export function QuarterTiles({ quarters, className }: QuarterTilesProps): ReactElement | null {
  const { t } = useTranslation();
  if (quarters.length === 0) return null;
  // Keys are "YYYY-Qn", so a string sort is chronological; the wire order is not trusted.
  const ordered = [...quarters].sort((a, b) => a.key.localeCompare(b.key));
  const oldestKey = ordered[0].key;
  const newestFirst = [...ordered].reverse();

  return (
    <ul className={cn('mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4', className)} data-testid="league-quarters">
      {newestFirst.map(quarter => {
        const parts = quarterParts(quarter.key);
        const title = parts ? t('league.quarters.label', { n: parts.n, year: parts.year }) : quarter.key;
        const played = quarter.results.length > 0;
        const when = quarter.key === oldestKey
          ? t('league.quarters.dropsOn', { date: dropDayLabel(quarter.drops_at) })
          : t('league.quarters.until', { date: lastCountingDayLabel(quarter.drops_at) });
        return (
          <li
            key={quarter.key}
            data-testid={`league-quarter-${quarter.key}`}
            data-quarter={quarter.key}
            className={cn(
              'flex min-h-[4.5rem] flex-col justify-between gap-1 rounded-xl px-2.5 py-2',
              played ? 'border border-rally-border bg-rally-surface' : 'border border-dashed border-rally-border',
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-rally-text-muted">{title}</span>
            <span className={cn('font-display text-lg font-black leading-none tabular-nums', played ? 'text-rally-text' : 'text-rally-text-muted')}>
              {quarter.points}
            </span>
            <span className="text-[10px] leading-tight text-rally-text-muted">
              {played
                ? `${t('league.quarters.events', { count: quarter.results.length })} · ${t('league.quarters.onOffer', { available: quarter.available })}`
                : t('league.quarters.empty')}
            </span>
            <span className="text-[10px] leading-tight text-rally-text-muted">{when}</span>
          </li>
        );
      })}
    </ul>
  );
}
