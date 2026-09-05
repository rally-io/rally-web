import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type RankCellProps = {
  /**
   * The rank the SERVER decided, for this one player.
   *
   * Null means unranked — a real state on the personal card, where a player with
   * no counted results has no position yet.
   */
  rank: number | null;
  /** Places gained (+) or lost (-) since the last snapshot. Null means unknown. */
  rankChange?: number | null;
  /** `hero` scales the numeral up for the personal card and the player header. */
  size?: 'base' | 'hero';
  className?: string;
};

type Direction = 'up' | 'down' | 'same';

/**
 * Renders one server-provided rank and its movement.
 *
 * THIS COMPONENT IS THE TIE GUARANTEE. It receives `rank` and nothing else — no
 * array, no index, no siblings, no row position — so there is nowhere for a
 * client-side renumbering to live. Two players tied on 1 both render 1, and the
 * board reads 1, 1, 3. A page that starts at 51 starts at 51.
 *
 * Do not add an `index` prop. Do not derive a rank from anything.
 *
 * It renders a span rather than a `<td>` so the standings table owns its own cell
 * markup and the personal card can reuse the same primitive outside a table.
 */
export function RankCell({ rank, rankChange, size = 'base', className }: RankCellProps): ReactElement {
  const { t } = useTranslation();

  // At hero size a lone em-dash scales into what reads as a redacted bar — and
  // the unranked state is exactly what every new player sees first. Say it in
  // words instead. Table cells keep the compact dash.
  if (rank == null && size === 'hero') {
    return (
      <span
        data-testid="rank-unranked"
        className={cn('text-base font-bold text-rally-text-2', className)}
      >
        {t('league.unranked')}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <span
        className={cn(
          'font-black tabular-nums text-rally-text',
          size === 'hero' ? 'font-display text-4xl leading-none tracking-tight' : 'text-base',
        )}
      >
        {rank == null ? '—' : rank}
      </span>
      <RankMovement change={rankChange} size={size === 'hero' ? 'lg' : 'sm'} />
    </span>
  );
}

/**
 * Literal keys in a map, not `t(\`league.rank_change.${direction}\`)`. A key built
 * by template literal is invisible to grep, which is how the mobile build shipped
 * a namespace whose keys nothing could find.
 */
const MOVEMENT_KEYS = {
  up: 'league.rank_change.up',
  down: 'league.rank_change.down',
  same: 'league.rank_change.same',
} as const;

const MOVEMENT_GLYPH: Record<Direction, string> = { up: '▲', down: '▼', same: '·' };

const MOVEMENT_TONE: Record<Direction, string> = {
  up: 'text-rally-accent',
  down: 'text-rally-error',
  same: 'text-rally-text-muted',
};

type RankMovementProps = {
  /** Places gained (+) or lost (-). Null/undefined renders nothing: unknown is silent. */
  change: number | null | undefined;
  size?: 'sm' | 'lg';
  className?: string;
};

/**
 * The movement badge on its own, shared by RankCell and the featured top rows.
 *
 * The glyph carries the direction visually, the label carries it to a screen
 * reader, and the number is the DISTANCE — always positive. A signed number beside
 * a direction glyph is redundant, and in an RTL layout the minus sign reorders.
 * An explicit null check, not a falsy one: a change of 0 is meaningful ("held
 * station") and must not be swallowed as "unknown".
 */
export function RankMovement({ change, size = 'sm', className }: RankMovementProps): ReactElement | null {
  const { t } = useTranslation();

  if (change == null) return null;
  const direction: Direction = change > 0 ? 'up' : change < 0 ? 'down' : 'same';

  return (
    <span
      data-testid="rank-movement"
      data-direction={direction}
      className={cn(
        'inline-flex items-baseline gap-0.5 font-bold leading-none tabular-nums',
        size === 'lg' ? 'text-sm' : 'text-[11px]',
        MOVEMENT_TONE[direction],
        className,
      )}
    >
      {/*
        role="img" + aria-label sit on the GLYPH, not the wrapper. An aria-label on
        a plain span (role generic) is ignored by some assistive tech, so the label
        would be test-only. Labelling the wrapper instead would make it a leaf and
        hide the number inside it — a screen reader would hear "moved up" and never
        learn by how much. This way it hears "moved up", then "3".
      */}
      <span role="img" aria-label={t(MOVEMENT_KEYS[direction])}>
        {MOVEMENT_GLYPH[direction]}
      </span>
      {direction !== 'same' && <span>{Math.abs(change)}</span>}
    </span>
  );
}
