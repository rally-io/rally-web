import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { cn } from '@/lib/utils';
import { isFinishedStatus, isLiveStatus, localizeTeamPlaceholder, teamLabel } from '../utils';
import type { PublicMatch, PublicTeam } from '../types';

type GameFaceoffRowProps = { match: PublicMatch };
type Side = 'team_a' | 'team_b';

function teamName(team: PublicTeam | null | undefined, t: TFunction): string {
    const label = teamLabel(team);
    if (!label) return t('public_bracket.status.tbd', 'TBD');
    return team?.player_1 ? label : localizeTeamPlaceholder(label, t);
}

/**
 * One game as two stacked lines — pair over pair — with each set's scores in an aligned column
 * beside them. Stacking (rather than `A 6:4 B` on one line) keeps a three-set result readable and
 * puts every number on its own pair's line, so nothing depends on how RTL resolves a score string
 * sitting between two names.
 *
 * No skill ratings here: every player carries theirs once in the standings above, and repeating
 * them on each game is what made the previous board feel noisy.
 */
export function GameFaceoffRow({ match }: GameFaceoffRowProps): React.ReactElement {
    const { t } = useTranslation();
    const isLive = isLiveStatus(match.status);
    const isWalkover = match.status === 'walkover';
    const winner = match.winner_team ?? null;
    const sets = match.sets;
    const isPending = !isLive && !isFinishedStatus(match.status);

    function line(side: Side): React.ReactElement {
        const isWinner = winner === side;
        const isLoser = winner !== null && !isWinner;
        const label = teamName(side === 'team_a' ? match.team_a : match.team_b, t);
        return (
            <span
                className={cn(
                    'flex min-h-[17px] items-center truncate text-[13px] leading-[1.25]',
                    isWinner ? 'font-extrabold text-(--pb-text)'
                        : isLoser || isPending ? 'font-semibold text-(--pb-text-muted)'
                        : 'font-bold text-(--pb-text)',
                )}
                title={label}
            >
                {label}
            </span>
        );
    }

    function score(side: Side, index: number): React.ReactElement {
        const set = sets[index];
        const mine = side === 'team_a' ? set.team_a_score : set.team_b_score;
        const other = side === 'team_a' ? set.team_b_score : set.team_a_score;
        const ahead = isLive ? mine >= other : winner === side;
        return (
            <b
                key={`${side}-${index}`}
                className={cn(
                    'flex min-h-[17px] items-center justify-center text-sm font-extrabold leading-none tabular-nums',
                    isLive ? 'text-(--pb-live)' : ahead ? 'text-(--pb-highlight)' : 'text-(--pb-text-faint)',
                )}
            >
                {mine}
            </b>
        );
    }

    // One column per set keeps both lines' numbers in the same vertical column; the trailing
    // auto column only exists for a walkover, which has no scores to show.
    const columns = `minmax(0,1fr) repeat(${sets.length}, 1.125rem)${isWalkover ? ' auto' : ''}`;

    return (
        <div
            className={cn('relative grid items-center gap-x-2 gap-y-0.5 rounded-lg px-2.5 py-0.5', isLive && 'pb-live-row')}
            style={{ gridTemplateColumns: columns }}
        >
            {isLive && <span className="pb-live-dot absolute start-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-(--pb-live)" />}
            {line('team_a')}
            {sets.map((_, i) => score('team_a', i))}
            {isWalkover && (
                <span className="row-span-2 ps-1 text-[10px] font-black uppercase text-(--pb-highlight)">
                    {t('public_bracket.status.walkover', 'W/O')}
                </span>
            )}
            {line('team_b')}
            {sets.map((_, i) => score('team_b', i))}
        </div>
    );
}
