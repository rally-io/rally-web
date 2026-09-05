import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PlayerIdentity } from './PlayerIdentity';
import { RankCell } from './RankCell';
import type { StandingsRow } from '../types';

type StandingsTableProps = {
  /**
   * The rows to render, in the order the server returned them.
   *
   * Passed straight to `<tbody>`: not sorted, not deduped, not renumbered. The
   * server ranks the whole frame and then cuts the page, so page two legitimately
   * opens at 51 and a tie legitimately repeats a number. The page may hand this
   * table a display slice (rows after the featured column) — that is fine, because
   * every rank still travels with its row.
   */
  rows: StandingsRow[];
  /**
   * Called with the row whose player the visitor picked (opens the player
   * modal). Absent → names are plain text, which also keeps this component
   * renderable in isolation.
   */
  onSelectPlayer?: (row: StandingsRow) => void;
  /** The page's biggest weekly climb — rows matching it wear the crown chip. */
  climbOfTheWeek?: number | null;
  /** Accessible name for the table. Defaults to the generic league caption. */
  caption?: string;
  /** Wording for the zero-row case. Defaults to the generic "nobody yet" line. */
  emptyMessage?: string;
  className?: string;
};

/**
 * The public league board, drawn on the site's dark surface.
 *
 * THE RANK IS NEVER DERIVED HERE. Every number in the first column comes from
 * `row.rank` by way of `RankCell`, which takes a rank and has no access to an
 * index — so `1, 1, 3` stays `1, 1, 3`, and a page starting at 51 starts at 51.
 * `map((row, i) => …)` in this file would be a defect even if it looked right on
 * page one, because page two is where it becomes visible and by then it reads as
 * authoritative. Rows are keyed by `player_id` for the same reason: ranks tie, so
 * a rank is not a key and an index must not become one.
 *
 * Layout: the table sits in its OWN horizontal scroller. A public page is read on
 * phones in Hebrew, and a table wide enough to push the body sideways breaks the
 * whole document, not just itself. Direction utilities are logical throughout
 * (`text-start`/`text-end`) because the app mirrors via the `dir` attribute and
 * physical utilities do not follow it.
 */
export function StandingsTable({
  rows,
  onSelectPlayer,
  climbOfTheWeek,
  caption,
  emptyMessage,
  className,
}: StandingsTableProps): ReactElement {
  const { t } = useTranslation();

  // An empty frame gets a sentence, not a table head with nothing under it: a
  // lone header row reads as "still loading" when it actually means "nobody yet".
  if (rows.length === 0) {
    return (
      <p
        data-testid="standings-empty"
        className={cn(
          'rounded-2xl border border-rally-border bg-rally-surface px-4 py-10 text-center text-sm font-semibold text-rally-text-2',
          className,
        )}
      >
        {emptyMessage ?? t('league.table.empty')}
      </p>
    );
  }

  return (
    <div
      data-testid="standings-scroll"
      className={cn(
        'w-full overflow-x-auto rounded-2xl border border-rally-border bg-rally-surface',
        className,
      )}
    >
      <table className="w-full min-w-[28rem] border-collapse">
        {/* A real <caption>, not an aria-label: it is the table's accessible name
            for a screen reader and it survives for a crawler reading the markup. */}
        <caption className="sr-only">{caption ?? t('league.table.caption')}</caption>
        <thead>
          <tr className="border-b border-rally-border bg-rally-surface-2 text-[11px] font-black uppercase tracking-wider text-rally-text-muted">
            <th scope="col" className="px-4 py-2.5 text-start">
              {t('league.table.rank')}
            </th>
            <th scope="col" className="px-3 py-2.5 text-start">
              {t('league.table.player')}
            </th>
            <th scope="col" className="px-3 py-2.5 text-start">
              {t('league.table.band')}
            </th>
            <th scope="col" className="px-4 py-2.5 text-end">
              {t('league.table.points')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.player_id}
              className="border-b border-rally-border-subtle transition-colors last:border-b-0 hover:bg-white/[0.03]"
            >
              <td data-testid="standings-rank" className="whitespace-nowrap px-4 py-2.5 align-middle">
                <RankCell rank={row.rank} rankChange={row.rank_change} />
              </td>
              {/* The player is the row's header: it is what identifies the row, and
                  a screen reader should announce it with every other cell. */}
              <th scope="row" className="px-3 py-2.5 text-start font-normal">
                <span className="inline-flex min-w-0 max-w-full items-center gap-2">
                  {onSelectPlayer ? (
                    <button
                      type="button"
                      onClick={() => onSelectPlayer(row)}
                      className="min-w-0 rounded-md text-start hover:opacity-80 focus-visible:outline-2 focus-visible:outline-rally-accent"
                    >
                      <PlayerIdentity player={row} />
                    </button>
                  ) : (
                    <PlayerIdentity player={row} />
                  )}
                  {climbOfTheWeek != null && row.rank_change === climbOfTheWeek ? (
                    <span
                      data-testid="league-climber"
                      className="shrink-0 rounded-full bg-rally-accent px-2 py-0.5 text-[10px] font-black leading-none text-rally-accent-text"
                    >
                      {t('league.climber', { places: climbOfTheWeek })}
                    </span>
                  ) : null}
                </span>
              </th>
              <td data-testid="standings-band" className="px-3 py-2.5 align-middle">
                {row.band_code ? (
                  <span className="rounded-full bg-rally-accent-dim px-2.5 py-0.5 text-[11px] font-black text-rally-accent">
                    {row.band_code}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-rally-text-muted">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-end align-middle text-sm font-black tabular-nums text-rally-text">
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
