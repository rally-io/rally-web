import { useId, type ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { genericAvatarUrl } from './genericAvatar';
import { SHIELD_PATH, SVG_H, SVG_W } from './shieldGeometry';
import type { SkillTier } from '../types';

/**
 * Shield colour = SKILL TIER, exactly as the app's player card colours it —
 * hexes verbatim from rally-mobile `theme/colors.ts` — and never rank.
 * Gold/silver/bronze already mean skill on this platform; colouring by position
 * would hand a top-ranked D-player a gold card the rest of the product calls
 * bronze. The fallback is the mobile card's own `surfaceElevated`, because
 * roughly half the board has no tier and no photo — the neutral card is the
 * primary look, not an edge case.
 */
const TIER_COLORS: Record<SkillTier | 'none', string> = {
  gold: '#D4AF37',
  silver: '#BEC2CB',
  bronze: '#CD7F32',
  none: '#27272a',
};

export type PlayerShieldSource = {
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  avatar_clean_url?: string | null;
  skill_tier?: SkillTier | null;
  gender?: string | null;
};

type PlayerShieldProps = {
  player: PlayerShieldSource;
  className?: string;
};

/**
 * The product's player card as a thumbnail: the same 280x434 shield the profile
 * screen and the mobile ranking board draw (`SHIELD_PATH` is verbatim from
 * rally-mobile), with the cut-out photo sliced into the crown the way
 * `RankingShield.tsx` frames it. No name plate — at thumbnail sizes the text is
 * unreadable, so the row around this component carries the words.
 *
 * Every shield carries a person: the player's own cut-out when they uploaded a
 * photo, the gender-matched generic portrait when they did not. The card never
 * falls back to an empty metal face.
 *
 * SVG ids come from `useId` because many shields share one document and a
 * duplicated clip id silently clips every card with the first one's path.
 */
export function PlayerShield({ player, className }: PlayerShieldProps): ReactElement {
  const uid = useId();
  const base = TIER_COLORS[player.skill_tier ?? 'none'];
  const photo =
    player.avatar_clean_url || player.avatar_url || genericAvatarUrl(player.gender);
  const clipId = `shield-clip-${uid}`;
  const shimmerId = `shield-shimmer-${uid}`;

  return (
    <div className={cn('relative', className)}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="block w-full" aria-hidden>
        <defs>
          <clipPath id={clipId}>
            <path d={SHIELD_PATH} />
          </clipPath>
          <linearGradient id={shimmerId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0.22" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width={SVG_W} height={SVG_H} fill={base} />
          {/* Full-bleed portrait, unlike mobile's crown-only framing: the web
              card has no name plate or stats area below, so a 62%-height image
              left the bottom of the card as bare metal. `xMidYMin slice` keeps
              the head in the crown and crops the sides/bottom instead. */}
          <image
            href={photo}
            x={0}
            y={SVG_H * 0.03}
            width={SVG_W}
            height={SVG_H * 0.97}
            preserveAspectRatio="xMidYMin slice"
          />
          <rect x="0" y="0" width={SVG_W} height={SVG_H * 0.45} fill={`url(#${shimmerId})`} />
        </g>
      </svg>
    </div>
  );
}
