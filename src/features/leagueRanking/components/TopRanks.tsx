import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { playerFullName } from './playerName';
import { PlayerShield } from './PlayerShield';
import { RankMovement } from './RankCell';
import { Reveal } from './Reveal';
import type { StandingsRow } from '../types';

type TopRanksProps = {
  /**
   * The leaders, in the order the server returned them. Ranks come from each
   * row and ONLY from each row: two rows tied on 1 render two rows marked 1.
   * This component never sees an index it could number from.
   */
  rows: StandingsRow[];
  /** Called with the row whose player the visitor picked. */
  onSelect?: (row: StandingsRow) => void;
  /**
   * The page's biggest weekly climb (from `biggestClimb`), or null. Every row
   * that climbed exactly this much wears the crown — ties stay real.
   */
  climbOfTheWeek?: number | null;
  className?: string;
};

/**
 * The board's crown as FIP runs it: a single VERTICAL column of featured rows —
 * big rank numeral, the product's shield card as the portrait, name, movement,
 * points. The vertical stack is the point: first is above second is above third,
 * which is what a ranking feels like. A grid of cards reads as a gallery; a
 * column reads as a ladder.
 *
 * The podium positions (rank ≤ 3) sit visibly heavier — bigger shield, bigger
 * numeral, and a lime edge on the leaders — but the emphasis is SIZE and the
 * brand accent, never gold/silver/bronze: those metals mean skill tier
 * everywhere else in the product. Ties keep their honesty here too: two rows
 * tied at 1 are simply two lime-edged rows.
 *
 * Rows reveal as they scroll into view (`Reveal`), staggered top-down.
 */
export function TopRanks({ rows, onSelect, climbOfTheWeek, className }: TopRanksProps): ReactElement {
  const { t } = useTranslation();

  return (
    <ol
      data-testid="top-ranks"
      aria-label={t('league.shields.aria')}
      className={cn('flex flex-col gap-2', className)}
    >
      {rows.map((row, index) => {
        // Display staggering only — the rank itself always comes from the row.
        const podium = row.rank <= 3;
        const leader = row.rank === 1;
        return (
          <li key={row.player_id}>
            <Reveal delay={Math.min(index * 55, 330)}>
              <button
                type="button"
                onClick={onSelect ? () => onSelect(row) : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border bg-rally-surface px-3 text-start sm:gap-4 sm:px-4',
                  'transition-colors hover:border-rally-border-strong hover:bg-rally-surface-2',
                  'focus-visible:outline-2 focus-visible:outline-rally-accent',
                  podium ? 'py-2.5' : 'py-2',
                  leader
                    ? 'border-rally-accent/50 shadow-glow-electric hover:border-rally-accent'
                    : 'border-rally-border',
                )}
              >
                {/* The rank, from the row and nowhere else — see the note above. */}
                <span
                  data-testid="top-rank"
                  className={cn(
                    'shrink-0 text-center font-display font-black leading-none tabular-nums',
                    podium
                      ? 'w-10 text-3xl sm:w-14 sm:text-5xl'
                      : 'w-10 text-2xl sm:w-14 sm:text-3xl',
                    leader && 'text-rally-accent',
                  )}
                >
                  {row.rank}
                </span>

                <PlayerShield
                  player={row}
                  className={cn('shrink-0', podium ? 'w-12 sm:w-16' : 'w-9 sm:w-11')}
                />

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate font-display font-bold',
                      podium ? 'text-lg sm:text-xl' : 'text-base sm:text-lg',
                    )}
                  >
                    {playerFullName(row) || '—'}
                  </span>
                  {climbOfTheWeek != null && row.rank_change === climbOfTheWeek ? (
                    <span
                      data-testid="league-climber"
                      className="mt-0.5 me-1.5 inline-block rounded-full bg-rally-accent px-2 py-0.5 text-[10px] font-black leading-none text-rally-accent-text"
                    >
                      {t('league.climber', { places: climbOfTheWeek })}
                    </span>
                  ) : null}
                  {row.band_code ? (
                    <span className="mt-0.5 inline-block rounded-full bg-rally-accent-dim px-2 py-0.5 text-[10px] font-black leading-none text-rally-accent">
                      {row.band_code}
                    </span>
                  ) : null}
                </span>

                <RankMovement change={row.rank_change} size="lg" className="shrink-0" />

                <span
                  className={cn(
                    'shrink-0 text-end font-display font-black tabular-nums text-rally-accent',
                    podium ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl',
                  )}
                >
                  {row.points}
                </span>
              </button>
            </Reveal>
          </li>
        );
      })}
    </ol>
  );
}
