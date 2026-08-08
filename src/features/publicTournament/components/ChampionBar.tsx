import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { teamLabel } from '../utils';
import type { PublicMatch } from '../types';

type ChampionBarProps = { match: PublicMatch | null | undefined; className?: string };

export function ChampionBar({ match, className }: ChampionBarProps): React.ReactElement | null {
    const { t } = useTranslation();
    if (!match) return null;
    const champion = match.winner_team
        ? (match.winner_team === 'team_a' ? match.team_a : match.team_b)
        : null;
    return (
        <div
            className={cn(
                'rounded-full border px-5 py-2 text-center',
                champion
                    ? 'border-(--pb-highlight)/60 bg-(--pb-winner-bg)'
                    : 'border-(--pb-border) bg-(--pb-card)',
                className,
            )}
        >
            <span className="block text-[8px] font-black uppercase tracking-[0.3em] text-(--pb-text-faint)">
                {t('public_bracket.champion', 'Tournament Champion')}
            </span>
            <span className={cn(
                'block truncate text-sm font-black',
                champion ? 'text-(--pb-highlight)' : 'text-(--pb-text-faint)',
            )}>
                {champion ? teamLabel(champion) : '—'}
            </span>
        </div>
    );
}
