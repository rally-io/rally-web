import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { MatchCard } from './MatchCard';
import { StandingsTable } from './StandingsTable';
import { GroupBoardCard } from './GroupBoardCard';
import { localizeGroupName } from '../utils';
import type { ViewMode } from '../hooks/useViewMode';
import type { PublicGroup } from '../types';

type GroupsViewProps = {
    groups: PublicGroup[];
    view: ViewMode;
    isBigScreen: boolean;
    qualifyCount?: number;
};

/**
 * Column count tuned so every group fits on one screen without scrolling.
 *
 * Four groups sit 2×2 rather than in one row of four. The canvas is 1600×900 and a group of
 * four pairs is about 280px tall, so a single row gave each card 369×625 — starving it of the
 * width the pair names need while wasting more than half its height. Measured at 2×2 the card
 * is roughly 758×302: the names get about four times the room, and the empty space disappears
 * because the card is finally the shape of its contents.
 */
function tvGridCols(count: number): string {
    if (count <= 1) return 'mx-auto w-full max-w-2xl grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 4) return 'grid-cols-2';
    return 'grid-cols-3';
}

/** Rotating per-group accent hue, defined per theme in themes.css. Shared by both group views. */
// eslint-disable-next-line react-refresh/only-export-components -- shared constant, not a component; consumed by LanesView on the games tab
export const GROUP_ACCENTS = ['pb-ga-0', 'pb-ga-1', 'pb-ga-2', 'pb-ga-3'];

export function GroupsView({ groups, view, isBigScreen, qualifyCount }: GroupsViewProps): React.ReactElement {
    const { t } = useTranslation();
    const [activeIdx, setActiveIdx] = useState(0);

    // The TV board carries its own standings, so there is no separate standings view here —
    // a rotation that still lands on 'standings' falls through to the same board.
    if (isBigScreen) {
        return (
            <div className={cn('grid h-full items-stretch gap-5 px-8 pb-6', tvGridCols(groups.length))}>
                {groups.map((g, i) => (
                    <GroupBoardCard
                        key={g.group_name}
                        group={g}
                        accentClass={GROUP_ACCENTS[i % GROUP_ACCENTS.length]}
                        qualifyCount={qualifyCount}
                    />
                ))}
            </div>
        );
    }

    if (view === 'standings') {
        return (
            <div className="flex flex-col gap-3 px-4 pb-8">
                {groups.map(g => (
                    <StandingsTable key={g.group_name} title={localizeGroupName(g.group_name, t)} standings={g.standings} qualifyCount={qualifyCount} />
                ))}
            </div>
        );
    }

    const active = groups[Math.min(activeIdx, groups.length - 1)];
    return (
        <div className="flex flex-col gap-3 px-4 pb-8">
            <div className="flex gap-1.5 overflow-x-auto">
                {groups.map((g, i) => (
                    <button
                        key={g.group_name}
                        onClick={() => setActiveIdx(i)}
                        className={cn(
                            'flex-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors',
                            i === Math.min(activeIdx, groups.length - 1)
                                ? 'border-(--pb-highlight) bg-(--pb-highlight) text-(--pb-highlight-contrast)'
                                : 'border-(--pb-border) bg-(--pb-card) text-(--pb-text-muted)',
                        )}
                    >
                        {localizeGroupName(g.group_name, t)}
                    </button>
                ))}
            </div>
            {active && (
                <>
                    <StandingsTable title={localizeGroupName(active.group_name, t)} standings={active.standings} qualifyCount={qualifyCount} />
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-(--pb-text-faint)">
                        {t('public_bracket.group_matches', 'Matches')}
                    </p>
                    {active.matches.map(m => <MatchCard key={m.id} match={m} />)}
                </>
            )}
        </div>
    );
}
