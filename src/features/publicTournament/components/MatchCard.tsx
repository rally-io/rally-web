import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FitText } from './FitText';
import { RatingChip } from './RatingChip';
import { isLiveStatus, localizeMatchLabel, localizeTeamPlaceholder, playerFullName } from '../utils';
import type { PublicMatch, PublicPlayer, PublicTeam, SetScore } from '../types';

export type MatchCardVariant = 'default' | 'node' | 'hero';

type MatchCardProps = { match: PublicMatch; variant?: MatchCardVariant; className?: string };

function TeamNames({ team, maxPx }: { team: PublicTeam; maxPx: number }): React.ReactElement {
    const { t } = useTranslation();
    const players = [team.player_1, team.player_2].filter((p): p is PublicPlayer => Boolean(p));
    if (players.length === 0) {
        return <FitText text={team.team_name ? localizeTeamPlaceholder(team.team_name, t) : ''} maxPx={maxPx} minPx={9} className="min-w-0" />;
    }
    return (
        <span className="flex min-w-0 flex-col gap-0.5">
            {players.map(p => (
                <span key={p.id} className="flex min-w-0 items-center gap-1.5">
                    <FitText text={playerFullName(p)} maxPx={maxPx} minPx={9} className="min-w-0" />
                    <RatingChip rating={p.skill_level} />
                </span>
            ))}
            {/* Reached the knockout on best-loser ranking rather than by qualifying.
                Promotion still runs on every group-then-knockout tournament, so with
                nothing marking it the public bracket shows a pair that finished 3rd
                exactly like a group winner. */}
            {team.is_lucky_loser ? (
                <span className="w-fit rounded bg-(--pb-accent-bg) px-1 text-[8px] font-black uppercase tracking-wider text-(--pb-accent)" title={t('public_bracket.lucky_loser', 'Lucky loser')}>
                    LL
                </span>
            ) : null}
        </span>
    );
}

function TeamRow({ team, sets, side, winner, status, small, large }: {
    team: PublicTeam | null | undefined;
    sets: SetScore[];
    side: 'team_a' | 'team_b';
    winner: 'team_a' | 'team_b' | null;
    status: string;
    small: boolean;
    large: boolean;
}): React.ReactElement {
    const { t } = useTranslation();
    const isWinner = winner === side;
    const isLoser = winner !== null && !isWinner;
    const scores = sets.map(s => (side === 'team_a' ? s.team_a_score : s.team_b_score));
    // The same three-step ladder as the row's own text size below, in px: FitText needs a
    // number, and two copies of a variant ladder drift the moment one variant is retuned.
    const namePx = small ? 12 : large ? 15 : 13;
    return (
        <div className={cn('flex items-stretch', isWinner && 'bg-(--pb-winner-bg)')}>
            <div className={cn(
                'flex min-w-0 flex-1 items-center gap-1.5 font-bold text-(--pb-text)',
                small ? 'px-3 py-2 text-xs' : large ? 'px-4 py-3 text-[15px]' : 'px-3 py-2 text-[13px]',
                isLoser && 'text-(--pb-text-muted)',
            )}>
                {team ? (
                    <TeamNames team={team} maxPx={namePx} />
                ) : (
                    // `truncate` because the label is translated: `public_bracket.status.tbd`
                    // used to be an empty string here and now carries real text (Hebrew
                    // "טרם נקבע"), which on the fixed-width TV node cards has to clip
                    // rather than push the score column out of the card.
                    <span className="min-w-0 truncate text-(--pb-text-faint)">{t('public_bracket.status.tbd', 'TBD')}</span>
                )}
                {isWinner && <Trophy size={12} className="shrink-0 text-(--pb-highlight)" />}
            </div>
            <div className={cn(
                'flex items-center gap-2 border-s border-(--pb-border) px-2.5 font-black',
                small ? 'min-w-9 text-xs' : large ? 'min-w-12 px-3 text-[15px]' : 'min-w-10 text-[13px]',
                isWinner ? 'text-(--pb-highlight)' : 'text-(--pb-text-faint)',
            )}>
                {status === 'walkover' ? (
                    <span>{isWinner ? t('public_bracket.status.walkover', 'W/O') : ''}</span>
                ) : scores.length > 0 ? (
                    scores.map((s, i) => <span key={i}>{s}</span>)
                ) : (
                    <span>—</span>
                )}
            </div>
        </div>
    );
}

export function MatchCard({ match, variant = 'default', className }: MatchCardProps): React.ReactElement {
    const { t } = useTranslation();
    const small = variant === 'node';
    const large = variant === 'hero';
    const isLive = isLiveStatus(match.status);
    const isDone = match.status === 'completed' || match.status === 'walkover';
    const time = match.scheduled_at ? format(parseISO(match.scheduled_at), 'HH:mm') : null;

    const scoreKey = match.sets.map(s => `${s.team_a_score}-${s.team_b_score}`).join(',');
    const prevScoreRef = useRef(scoreKey);
    const justChanged = prevScoreRef.current !== scoreKey;
    useEffect(() => {
        prevScoreRef.current = scoreKey;
    }, [scoreKey]);

    return (
        <div className={cn(
            'overflow-hidden rounded-xl border bg-(--pb-card)',
            isLive ? 'border-(--pb-live)/50' : 'border-(--pb-border)',
            variant === 'hero' && 'border-(--pb-highlight)/60 shadow-[0_0_24px_var(--pb-glow)]',
            justChanged && 'pb-score-flash',
            className,
        )}>
            <div className="flex items-center justify-between gap-2 border-b border-(--pb-border) bg-(--pb-card-header) px-3 py-1.5">
                <span className="truncate text-[10px] font-black uppercase tracking-widest text-(--pb-text-faint)">
                    {[localizeMatchLabel(match.match_label, t), match.court_name].filter(Boolean).join(' · ')}
                </span>
                {isLive ? (
                    <span className="flex shrink-0 items-center gap-1">
                        <span className="pb-live-dot h-1.5 w-1.5 rounded-full bg-(--pb-live)" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-(--pb-live)">
                            {t('public_bracket.status.live', 'Live')}
                        </span>
                    </span>
                ) : isDone ? (
                    <span className="shrink-0 text-[10px] font-black text-(--pb-highlight)">✓</span>
                ) : time ? (
                    <span className="shrink-0 text-[10px] font-bold text-(--pb-accent)">{time}</span>
                ) : null}
            </div>
            <div className="divide-y divide-(--pb-border)">
                <TeamRow team={match.team_a} sets={match.sets} side="team_a" winner={match.winner_team ?? null} status={match.status} small={small} large={large} />
                <TeamRow team={match.team_b} sets={match.sets} side="team_b" winner={match.winner_team ?? null} status={match.status} small={small} large={large} />
            </div>
        </div>
    );
}
