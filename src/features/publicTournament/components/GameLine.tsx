import React from 'react';
import { cn } from '@/lib/utils';
import { FitText } from './FitText';
import { TieLabel } from './TieLabel';
import { NAME_TONE_CLASS, SCORE_TONE_CLASS, isFinishedStatus, isLiveStatus, keepNamesWhole, nameTone, scoreTone, teamLabel } from '../utils';
import type { PublicMatch } from '../types';

/** Type size by how many rounds share the screen: one or two get big rows, a full 4×2 board the compact ones. */
export type GameLineSize = 'lg' | 'md' | 'sm';

const NAME_PX: Record<GameLineSize, number> = { lg: 22, md: 17, sm: 15 };

/**
 * One Americano game on the venue screen: the court, then the two pairs on two lines with their
 * points. The lane card's states, compacted — a round card holds four of these in a quarter of the
 * screen, so the lane card's own header row would push the second pair off the bottom.
 */
export function GameLine({ match, size }: { match: PublicMatch; size: GameLineSize }): React.ReactElement {
    const isLive = isLiveStatus(match.status);
    // A level game names no winner, so neither line is emphasised: say why, as MatchCard does.
    const isTie = scoreTone(match, 'team_a') === 'tie';
    const isDone = isFinishedStatus(match.status);
    const court = /\d+/.exec(match.court_name ?? '')?.[0] ?? match.court_name ?? '';
    function line(side: 'team_a' | 'team_b'): React.ReactElement {
        const team = side === 'team_a' ? match.team_a : match.team_b;
        const score = match.sets[0] ? (side === 'team_a' ? match.sets[0].team_a_score : match.sets[0].team_b_score) : null;
        return (
            <div className="flex min-w-0 items-center gap-2">
                <FitText
                    text={keepNamesWhole(teamLabel(team))}
                    maxPx={NAME_PX[size]}
                    minPx={10}
                    wrapAtFloor
                    className={cn('min-w-0 flex-1 leading-tight', NAME_TONE_CLASS[nameTone(match, side)])}
                />
                {score != null && (
                    <b className={cn(
                        'shrink-0 text-center font-black tabular-nums',
                        size === 'lg' ? 'w-9 text-[22px]' : size === 'md' ? 'w-7 text-[17px]' : 'w-6 text-[15px]',
                        // After the size: twMerge drops a line-height that precedes a font-size.
                        'leading-tight',
                        SCORE_TONE_CLASS[scoreTone(match, side)],
                    )}>
                        {score}
                    </b>
                )}
            </div>
        );
    }
    return (
        <div data-game-id={match.id} className={cn(
            'flex min-w-0 items-center rounded-xl border bg-(--pb-card)',
            size === 'lg' ? 'gap-4 px-4 py-3' : size === 'md' ? 'gap-3 px-3 py-2' : 'gap-2.5 px-2.5 py-1',
            isLive ? 'pb-live-card border-(--pb-live)' : 'border-(--pb-border)',
        )}>
            <span className={cn(
                'flex shrink-0 items-center justify-center rounded-lg font-black',
                size === 'lg' ? 'h-10 w-10 text-[18px]' : size === 'md' ? 'h-8 w-8 text-[15px]' : 'h-7 w-7 text-[13px]',
                isLive ? 'bg-(--pb-live) text-white' : isDone ? 'bg-(--pb-card-raised) text-(--pb-text-faint)' : 'bg-(--pb-accent-bg) text-(--pb-accent)',
            )}>
                {isLive ? <span className="pb-live-dot">{court}</span> : court}
            </span>
            <div className={cn('flex min-w-0 flex-1 flex-col', size === 'lg' ? 'gap-1.5' : 'gap-0.5')}>
                {line('team_a')}
                {line('team_b')}
            </div>
            {isTie && <TieLabel />}
        </div>
    );
}
