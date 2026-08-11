import React from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { FitText } from './FitText';
import { PairChip } from './PairChip';
import { isFinishedStatus, isLiveStatus, localizeTeamPlaceholder, teamLabel } from '../utils';
import type { PublicMatch } from '../types';

type LaneMatchCardProps = { match: PublicMatch; isNext: boolean };
type Side = 'team_a' | 'team_b';
type CardState = 'done' | 'live' | 'next' | 'scheduled';

function matchTime(match: PublicMatch): string {
    if (!match.scheduled_at) return '';
    try {
        return format(parseISO(match.scheduled_at), 'HH:mm');
    } catch {
        // parseISO never throws — a malformed string just becomes an Invalid Date, and it's
        // format() that then throws RangeError. Either way, a bad timestamp must not take the
        // whole board down on an unattended screen.
        return '';
    }
}

/**
 * One match on a group's lane. The four states are what make the lane readable as a timeline at a
 * glance — finished recedes, live burns, next is called out, the rest stay quiet — so each one
 * carries its own frame, header and emphasis rather than only a colour.
 */
export function LaneMatchCard({ match, isNext }: LaneMatchCardProps): React.ReactElement {
    const { t } = useTranslation();
    const isLive = isLiveStatus(match.status);
    const isDone = isFinishedStatus(match.status);
    const state: CardState = isLive ? 'live' : isDone ? 'done' : isNext ? 'next' : 'scheduled';
    const winner = match.winner_team ?? null;

    const header = isLive
        ? [t('public_bracket.status.live', 'Live'), match.court_name].filter(Boolean).join(' · ')
        : isDone
            ? t('public_bracket.lane_finished', 'Final')
            : [matchTime(match), match.court_name].filter(Boolean).join(' · ');

    function line(side: Side): React.ReactElement {
        const team = side === 'team_a' ? match.team_a : match.team_b;
        const raw = teamLabel(team);
        const name = raw
            ? (team?.player_1 ? raw : localizeTeamPlaceholder(raw, t))
            : t('public_bracket.status.tbd', 'TBD');
        const isWinner = winner === side;
        const isLoser = winner !== null && !isWinner;
        return (
            <div className="flex items-center gap-1.5">
                <PairChip pair={team} />
                <FitText
                    text={name}
                    maxPx={13}
                    minPx={9}
                    className={cn(
                        'min-w-0 flex-1 leading-tight',
                        isWinner ? 'font-extrabold text-(--pb-text)'
                            : isLoser ? 'font-semibold text-(--pb-text-muted)'
                            : 'font-bold text-(--pb-text)',
                    )}
                />
                {/* One element per set number. A joined "6:4" would mirror in RTL — the colon is a
                    bidi number-joiner — so the scores are never assembled into a string. */}
                {match.sets.length > 0 && (
                    <span className="flex shrink-0 gap-1">
                        {match.sets.map((s, i) => {
                            const mine = side === 'team_a' ? s.team_a_score : s.team_b_score;
                            const other = side === 'team_a' ? s.team_b_score : s.team_a_score;
                            // During a live match both sides deliberately share the live colour
                            // (className below tests isLive first) — the numbers sit stacked in
                            // one column so the larger one reads without a colour cue. Do not
                            // "restore" a leader highlight here; that would be a design change.
                            const ahead = isWinner && mine > other;
                            return (
                                <b
                                    key={i}
                                    className={cn(
                                        'w-[15px] text-center text-[13px] font-black leading-tight tabular-nums',
                                        isLive ? 'text-(--pb-live)' : ahead ? 'text-(--pb-highlight)' : 'text-(--pb-text-faint)',
                                    )}
                                >
                                    {mine}
                                </b>
                            );
                        })}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div
            data-pb-state={state}
            className={cn(
                'flex min-w-0 flex-col overflow-hidden rounded-xl border bg-(--pb-card)',
                state === 'live' && 'pb-live-card border-(--pb-live)',
                state === 'next' && 'border-(--pb-accent)',
                state === 'done' && 'border-(--pb-border) opacity-80',
                state === 'scheduled' && 'border-(--pb-border)',
            )}
        >
            <div
                className={cn(
                    'flex shrink-0 items-center gap-1.5 border-b border-(--pb-border) px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide',
                    state === 'live' ? 'text-(--pb-live)'
                        : state === 'next' ? 'bg-(--pb-accent-bg) text-(--pb-accent)'
                        : 'bg-(--pb-card-header) text-(--pb-text-faint)',
                )}
            >
                {state === 'live' && <span className="pb-live-dot h-1.5 w-1.5 rounded-full bg-(--pb-live)" />}
                <span className="truncate">{header}</span>
            </div>
            <div className="flex flex-1 flex-col justify-evenly gap-0.5 px-2 py-1">
                {line('team_a')}
                {line('team_b')}
            </div>
        </div>
    );
}
