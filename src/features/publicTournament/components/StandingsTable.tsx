import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { RatingChip } from './RatingChip';
import { playerFullName } from '../utils';
import type { PublicPlayer, PublicStanding } from '../types';

type StandingsTableProps = { title: string; standings: PublicStanding[]; qualifyCount?: number; large?: boolean };

function rowPlayers(s: PublicStanding): PublicPlayer[] {
    return [s.player_1, s.player_2].filter((p): p is PublicPlayer => Boolean(p));
}

function rowLabel(s: PublicStanding): string {
    return s.player_name ?? s.team_name ?? '';
}

export function StandingsTable({ title, standings, qualifyCount, large }: StandingsTableProps): React.ReactElement {
    const { t } = useTranslation();
    const nameText = large ? 'text-sm' : 'text-xs';
    return (
        <div className="overflow-hidden rounded-xl border border-(--pb-border) bg-(--pb-card)">
            <div className="flex items-center justify-between border-b border-(--pb-border) bg-(--pb-card-header) px-3 py-2">
                <span className={cn('font-black uppercase tracking-widest text-(--pb-text-faint)', large ? 'text-[11px]' : 'text-[10px]')}>{title}</span>
                <span className="flex gap-3 text-[9px] font-black uppercase text-(--pb-text-faint)">
                    <span className="w-5 text-center">{t('public_bracket.col_wins', 'W')}</span>
                    <span className="w-5 text-center">{t('public_bracket.col_losses', 'L')}</span>
                    <span className="w-7 text-center">+/-</span>
                </span>
            </div>
            {standings.map((s, i) => {
                const players = rowPlayers(s);
                const qualifies = qualifyCount != null && s.position <= qualifyCount;
                const diff = s.sets_won - s.sets_lost;
                return (
                    <React.Fragment key={`${s.position}-${rowLabel(s)}`}>
                        <div className={cn(
                            'flex items-center gap-2 px-3',
                            large ? 'py-1.5' : 'py-2',
                            i > 0 && 'border-t border-(--pb-border)',
                            qualifies && 'bg-(--pb-winner-bg)',
                        )}>
                            <span className={cn('w-4 shrink-0 font-black', nameText, qualifies ? 'text-(--pb-highlight)' : 'text-(--pb-text-faint)')}>
                                {s.position}
                            </span>
                            <span className={cn('flex min-w-0 flex-1', large ? 'items-center' : 'flex-col gap-0.5')}>
                                {players.length === 0 ? (
                                    <span className={cn('truncate font-bold text-(--pb-text)', nameText)}>{rowLabel(s)}</span>
                                ) : large ? (
                                    // TV: one line per team, broadcast-table style — halves the panel height
                                    <span className={cn('flex min-w-0 items-center gap-1.5 font-bold text-(--pb-text)', nameText)}>
                                        {players.map((p, pi) => (
                                            <React.Fragment key={p.id}>
                                                {pi > 0 && <span className="shrink-0 text-(--pb-text-faint)">/</span>}
                                                <span className="min-w-0 truncate" title={playerFullName(p)}>{playerFullName(p)}</span>
                                                <RatingChip rating={p.skill_level} />
                                            </React.Fragment>
                                        ))}
                                    </span>
                                ) : (
                                    players.map(p => (
                                        <span key={p.id} className={cn('flex min-w-0 items-center gap-1.5 font-bold text-(--pb-text)', nameText)}>
                                            <span className="truncate" title={playerFullName(p)}>{playerFullName(p)}</span>
                                            <RatingChip rating={p.skill_level} />
                                        </span>
                                    ))
                                )}
                            </span>
                            <span className={cn('flex shrink-0 gap-3 font-extrabold', nameText)}>
                                <span className="w-5 text-center text-(--pb-text)">{s.wins}</span>
                                <span className="w-5 text-center text-(--pb-text-muted)">{s.losses}</span>
                                <span className={cn('w-7 text-center', diff > 0 ? 'text-(--pb-highlight)' : 'text-(--pb-text-faint)')}>
                                    {diff > 0 ? `+${diff}` : diff}
                                </span>
                            </span>
                        </div>
                        {qualifyCount != null && s.position === qualifyCount && i < standings.length - 1 && (
                            <div className="border-t border-dashed border-(--pb-border) px-3 py-1">
                                <span className="text-[8px] font-extrabold uppercase tracking-widest text-(--pb-text-faint)">
                                    {t('public_bracket.top_qualify', { count: qualifyCount, defaultValue: 'Top {{count}} advance' })}
                                </span>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
