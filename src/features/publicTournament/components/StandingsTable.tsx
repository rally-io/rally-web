import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { FitText } from './FitText';
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
    const namePx = large ? 14 : 12;
    // Same rule as GroupBoardCard, derived the same way from the same rows, so the phone and the
    // TV cannot disagree about which pairs are shown as through. See the comment there.
    const ranked = standings.some(s => s.wins + s.losses > 0);
    return (
        <div className="overflow-hidden rounded-xl border border-(--pb-border) bg-(--pb-card)">
            <div className="flex items-center justify-between border-b border-(--pb-border) bg-(--pb-card-header) px-3 py-2">
                <span className={cn('font-black uppercase tracking-widest text-(--pb-text-faint)', large ? 'text-[11px]' : 'text-[10px]')}>{title}</span>
                <span className="flex gap-3 text-[9px] font-black uppercase text-(--pb-text-faint)">
                    <span className="w-5 text-center">{t('public_bracket.col_wins', 'W')}</span>
                    <span className="w-5 text-center">{t('public_bracket.col_losses', 'L')}</span>
                    <span className="w-10 text-center">{t('public_bracket.standings_headers.games', 'Games')}</span>
                    <span className="w-7 text-center">+/-</span>
                </span>
            </div>
            {standings.map((s, i) => {
                const players = rowPlayers(s);
                // A disqualified row is numbered last, so in a small enough group
                // its position still falls inside qualifyCount — guard explicitly.
                const dq = s.is_disqualified === true;
                const qualifies = ranked && !dq && qualifyCount != null && s.position <= qualifyCount;
                // Games, not sets — the TV board's diff is games-based and the two
                // surfaces may not disagree about a pair's balance.
                const diff = s.games_won - s.games_lost;
                return (
                    <React.Fragment key={`${s.position}-${rowLabel(s)}`}>
                        <div className={cn(
                            'flex items-center gap-2 px-3',
                            large ? 'py-1.5' : 'py-2',
                            i > 0 && 'border-t border-(--pb-border)',
                            qualifies && 'bg-(--pb-winner-bg)',
                            dq && 'opacity-60',
                        )}>
                            <span className={cn('w-4 shrink-0 font-black', nameText, qualifies ? 'text-(--pb-highlight)' : 'text-(--pb-text-faint)')}>
                                {dq ? '—' : s.position}
                            </span>
                            <span className={cn('flex min-w-0 flex-1', large ? 'items-center' : 'flex-col gap-0.5')}>
                                {dq ? (
                                    <span className={cn('flex min-w-0 items-center gap-1.5', nameText)}>
                                        <FitText
                                            text={rowLabel(s) || players.map(playerFullName).join(' / ')}
                                            maxPx={namePx}
                                            minPx={9}
                                            className="min-w-0 font-bold text-(--pb-text-muted) line-through"
                                        />
                                        <span className="shrink-0 rounded px-1 py-0.5 text-[8px] font-black uppercase tracking-widest text-(--pb-text-faint) ring-1 ring-(--pb-border)">
                                            {t('public_bracket.disqualified', 'Disqualified')}
                                        </span>
                                    </span>
                                ) : players.length === 0 ? (
                                    <FitText text={rowLabel(s)} maxPx={namePx} minPx={9} className="font-bold text-(--pb-text)" />
                                ) : large ? (
                                    // TV: one line per team, broadcast-table style — halves the panel height
                                    <span className="flex min-w-0 items-center gap-1.5 font-bold text-(--pb-text)">
                                        {players.map((p, pi) => (
                                            <React.Fragment key={p.id}>
                                                {/* The separator needs `nameText` of its own: the names
                                                    beside it carry an inline font-size from FitText, so
                                                    without this the slash renders at the inherited root
                                                    size — visibly bigger than the names it separates. */}
                                                {pi > 0 && <span className={cn('shrink-0 text-(--pb-text-faint)', nameText)}>/</span>}
                                                <FitText text={playerFullName(p)} maxPx={namePx} minPx={9} className="min-w-0" />
                                                <RatingChip rating={p.skill_level} />
                                            </React.Fragment>
                                        ))}
                                    </span>
                                ) : (
                                    players.map(p => (
                                        <span key={p.id} className="flex min-w-0 items-center gap-1.5 font-bold text-(--pb-text)">
                                            <FitText text={playerFullName(p)} maxPx={namePx} minPx={9} className="min-w-0" />
                                            <RatingChip rating={p.skill_level} />
                                        </span>
                                    ))
                                )}
                            </span>
                            <span className={cn('flex shrink-0 items-center gap-3 font-extrabold', nameText)}>
                                <span className="w-5 text-center text-(--pb-text)">{dq ? '—' : s.wins}</span>
                                <span className="w-5 text-center text-(--pb-text-muted)">{dq ? '—' : s.losses}</span>
                                {/* Won/lost as separate elements inside dir="ltr" — a joined "12-7"
                                    would mirror in RTL. Own games green, opponents' red, every row. */}
                                <span dir="ltr" className="flex w-10 items-center justify-center gap-px tabular-nums">
                                    {dq ? (
                                        <span className="text-(--pb-text-muted)">—</span>
                                    ) : (
                                        <>
                                            <span className="text-(--pb-won)">{s.games_won}</span>
                                            <span className="font-normal text-(--pb-text-faint)">–</span>
                                            <span className="text-(--pb-lost)">{s.games_lost}</span>
                                        </>
                                    )}
                                </span>
                                {/* Muted at zero/DQ — the same token GroupBoardCard uses, so the
                                    phone and the TV cannot drift into two different greys. */}
                                <span dir="ltr" className={cn(
                                    'w-7 text-center tabular-nums',
                                    dq || diff === 0 ? 'text-(--pb-text-muted)' : diff > 0 ? 'text-(--pb-won)' : 'text-(--pb-lost)',
                                )}>
                                    {dq ? '—' : diff > 0 ? `+${diff}` : diff}
                                </span>
                            </span>
                        </div>
                        {!dq && qualifyCount != null && s.position === qualifyCount && i < standings.length - 1 && (
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
