import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { MatchCard } from './MatchCard';
import { StandingsTable } from './StandingsTable';
import { GroupBoardCard } from './GroupBoardCard';
import { localizeGroupName } from '../utils';
import { largestGroup, tvGroupPages } from '../tvPages';
import type { ViewMode } from '../hooks/useViewMode';
import type { PublicGroup } from '../types';

type GroupsViewProps = {
    groups: PublicGroup[];
    view: ViewMode;
    isBigScreen: boolean;
    qualifyCount?: number;
    /** Which page of a group stage too big for one TV screen (../tvPages.ts); the TV only. */
    page?: number;
};

/**
 * Column count tuned so every group fits on one screen without scrolling.
 *
 * The rule is "never more than two rows". The canvas is 1600×900 and the board gets ~644px of it
 * after the header, tabs and footer; a group of four pairs needs ~275px of card (header, column
 * labels, four two-line rows, the cutoff line), so two rows fit with room to spare and a third
 * does not — at three rows each card got 193px and clipped its last two pairs off the bottom of
 * an unattended screen, which is how an eight-group tournament shipped showing two pairs per group.
 *
 * Four groups sit 2×2 rather than in one row of four. A single row gave each card 369×625 —
 * starving it of the width the pair names need while wasting more than half its height. At 2×2
 * the card is roughly 758×302: the names get about four times the room, and the empty space
 * disappears because the card is finally the shape of its contents.
 *
 * Seven and eight groups go four across (369px per card, the width `GroupBoardCard`'s column
 * chrome is pared for). Measured at 8×4 pairs: every card fits with ~28px spare, and the longest
 * realistic pair name bottoms out at FitText's 9px floor without clipping.
 *
 * Nine groups break "never more than two rows": two rows of nine would be five across, which
 * leaves ~30px for a name. A third row gives each card 195px, and a four-pair table with a line
 * per player needs 278px of it, so a three-row board also turns on `compactGroupCards` — one
 * line per pair. Chosen over a second page because a hall should not wait a page to see its group,
 * the reason the games left this card (owner 2026-10-04). A nine-group tournament (2026-10-22)
 * showed two pairs per group before this. Nine go 3×3 (499px cards). Measured: four pairs fit with
 * every realistic name at full size and the longest at 12px; five pairs fit.
 *
 * A board never gets more than nine: a bigger group stage is split into pages of layouts measured
 * here (../tvPages.ts), and so is nine groups of six pairs, which overflows 3×3 by 14px. Ten to
 * twelve on three rows of four were tried and dropped — their names fell to 9–11px and a
 * disqualified pair's row overflowed its card by 20px.
 *
 * Literal class strings on purpose: Tailwind v4 only emits utilities it finds written out in
 * source, so a `grid-cols-${n}` assembled at runtime is silently absent from the stylesheet
 * and the grid falls back to one column.
 *
 * `oneRow` is a second mode for a caller that already capped its own count at a handful and
 * wants every one of them on a single row instead of this function's own "never more than two
 * rows" grid — the Americano rounds board's 5–16-court tiers, whose window already holds at
 * most 4 (or 2) rounds. One card still centres; two or three go straight across; four — the
 * window's own ceiling — also goes straight across. The TV board uses it too, for groups of seven
 * or more pairs, which overflow any two-row grid and come four to a page.
 */
// eslint-disable-next-line react-refresh/only-export-components -- layout rule, not a component; the /preview.html harness renders the same grid
export function tvGridCols(count: number, oneRow = false): string {
    if (count <= 1) return 'mx-auto w-full max-w-2xl grid-cols-1';
    if (oneRow) return count === 2 ? 'grid-cols-2' : count === 3 ? 'grid-cols-3' : 'grid-cols-4';
    if (count === 2) return 'grid-cols-2';
    if (count === 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    if (count === 9) return 'grid-cols-3';
    return 'grid-cols-4';
}

/**
 * Whether the TV group cards put each pair on one line: past eight groups the board has a third
 * row of cards, so each card has 195px instead of ~300px. See `tvGridCols` for the measurements.
 */
// eslint-disable-next-line react-refresh/only-export-components -- layout rule, not a component; the /preview.html harness renders the same grid
export function compactGroupCards(count: number): boolean {
    return count > 8;
}

/** Rotating per-group accent hue, defined per theme in themes.css. Shared by both group views. */
// eslint-disable-next-line react-refresh/only-export-components -- shared constant, not a component; consumed by LanesView on the games tab
export const GROUP_ACCENTS = ['pb-ga-0', 'pb-ga-1', 'pb-ga-2', 'pb-ga-3'];

export function GroupsView({ groups, view, isBigScreen, qualifyCount, page = 0 }: GroupsViewProps): React.ReactElement {
    const { t } = useTranslation();
    const [activeIdx, setActiveIdx] = useState(0);

    // The TV board carries its own standings, so there is no separate standings view here —
    // a rotation that still lands on 'standings' falls through to the same board. Past what one
    // screen holds, a page of it; a group keeps its accent on whichever page it lands.
    if (isBigScreen) {
        const pages = tvGroupPages(groups, 'board');
        const shown = pages[page % pages.length];
        return (
            <div className={cn('grid h-full content-center gap-5 px-8 pb-6', tvGridCols(shown.length, largestGroup(groups) > 6))}>
                {shown.map(i => (
                    <GroupBoardCard
                        key={groups[i].group_name}
                        group={groups[i]}
                        accentClass={GROUP_ACCENTS[i % GROUP_ACCENTS.length]}
                        qualifyCount={qualifyCount}
                        compact={compactGroupCards(shown.length)}
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
