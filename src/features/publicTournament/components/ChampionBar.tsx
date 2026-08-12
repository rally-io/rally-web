import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { FitText } from './FitText';
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
            {/* The champion pair is the one name on this screen nobody may have to guess at,
                so it shrinks to fit rather than ellipsizing. maxPx 14 is the text-sm it
                replaces. The placeholder stays a plain span: a single em-dash never overflows,
                and FitText would hang a title="—" off it. */}
            {champion ? (
                <FitText
                    text={teamLabel(champion)}
                    maxPx={14}
                    minPx={9}
                    className="font-black text-(--pb-highlight)"
                />
            ) : (
                <span className="block text-sm font-black text-(--pb-text-faint)">—</span>
            )}
        </div>
    );
}
