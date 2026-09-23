import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BallMark } from '@/components/icons/BallMark';
import type { GlobeOpenSource } from '@/lib/analytics';
import { cn } from '@/lib/utils';

type BallLinkProps = {
  playerId: string;
  /** "find yourself" on the viewer's own row or page, "see on the ball" everywhere else */
  isSelf?: boolean;
  source: Extract<GlobeOpenSource, 'ranking_row' | 'player_page'>;
  /** show the words beside the mark (player page); the board shows the mark alone */
  withLabel?: boolean;
  className?: string;
};

/**
 * The door from a player on the board to that player on the ball. A real link — middle-click
 * and copy-link work — that stops propagation, because every surface it sits on has its own
 * click (a table row opens the season modal; so does a podium card). The door it came from
 * travels as navigation state, never as a query param a visitor could copy and re-share.
 */
export function BallLink({
  playerId,
  isSelf = false,
  source,
  withLabel = false,
  className,
}: BallLinkProps) {
  const { t } = useTranslation();
  const label = isSelf ? t('league.ball.findYourself') : t('league.ball.see');
  const stop = (e: MouseEvent) => e.stopPropagation();
  return (
    <Link
      to={{ pathname: '/network', search: `?player=${encodeURIComponent(playerId)}` }}
      state={{ source }}
      aria-label={withLabel ? undefined : label}
      title={withLabel ? undefined : label}
      onClick={stop}
      onAuxClick={stop}
      data-testid="ball-link"
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full text-rally-text-2 transition-colors hover:text-rally-accent focus-visible:outline-2 focus-visible:outline-rally-accent',
        withLabel
          ? 'border border-rally-border px-3 py-1.5 text-sm font-bold hover:border-rally-accent/40'
          : 'p-1.5',
        className,
      )}
    >
      <BallMark size={withLabel ? 16 : 18} />
      {withLabel ? <span>{label}</span> : null}
    </Link>
  );
}
