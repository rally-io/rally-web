import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { playerFullName, playerInitials } from './playerName';
import type { SkillTier } from '../types';

/**
 * The identity fields, named exactly as the API names them, so a `StandingsRow`
 * and a `PublicPlayerSeason` both satisfy this without a mapping step. Every field
 * is optional because the player-season payload carries no tier.
 */
export type PlayerIdentitySource = {
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  /** Cut-out avatar. Preferred when present — see below. */
  avatar_clean_url?: string | null;
  skill_tier?: SkillTier | null;
};

type PlayerIdentityProps = {
  player: PlayerIdentitySource;
  className?: string;
};

/**
 * Monogram colours — the tier metals the whole platform uses (rally-mobile
 * `theme/colors.ts`: gold #D4AF37, silver #BEC2CB, bronze #CD7F32). The `none`
 * entry matters: a player with no tier still needs a monogram, and falling
 * through to an undefined class would render an invisible tile.
 */
const MONOGRAM_TONE: Record<SkillTier | 'none', string> = {
  gold: 'bg-[#D4AF37] text-black/70',
  silver: 'bg-[#BEC2CB] text-black/70',
  bronze: 'bg-[#CD7F32] text-white',
  none: 'bg-rally-surface-2 text-rally-text-2',
};

/**
 * Avatar + name + tier for one player, drawn for the site's dark surfaces.
 *
 * `avatar_clean_url` wins over `avatar_url` whenever it exists: it is the cut-out,
 * shot to sit on the board's own background, where the raw upload brings its own
 * backdrop and reads as a pasted rectangle. Both absent is the common case — most
 * players never upload one — so the monogram is a first-class branch, not a
 * defensive afterthought.
 */
export function PlayerIdentity({ player, className }: PlayerIdentityProps): ReactElement {
  const name = playerFullName(player);
  const avatarSrc = player.avatar_clean_url || player.avatar_url || null;
  const tier = player.skill_tier ?? null;

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      {avatarSrc ? (
        <img
          data-testid="player-avatar"
          src={avatarSrc}
          // Empty alt on purpose: the name sits right beside it as text, and a
          // duplicated alt makes a screen reader announce every player twice.
          alt=""
          loading="lazy"
          className="h-8 w-8 shrink-0 rounded-full bg-rally-surface-2 object-cover"
        />
      ) : (
        <span
          data-testid="player-monogram"
          data-tier={tier ?? 'none'}
          aria-hidden
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black leading-none',
            MONOGRAM_TONE[tier ?? 'none'],
          )}
        >
          {playerInitials(player)}
        </span>
      )}

      <span className="min-w-0 truncate text-sm font-semibold text-rally-text">{name || '—'}</span>
    </span>
  );
}
