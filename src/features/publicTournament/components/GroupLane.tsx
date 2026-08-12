import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { LaneMatchCard } from './LaneMatchCard';
import { activeMatchIndex, groupGlyph, groupMatchesByRound, localizeGroupName } from '../utils';
import type { PublicGroup } from '../types';

type GroupLaneProps = {
    group: PublicGroup;
    accentClass?: string;
    /** Round numbers to render as columns, shared by every lane so the axis above lines up. */
    roundNumbers: number[];
};

/**
 * One group as a horizontal timeline: the group's name, then one column per round reading
 * played → live → upcoming. The round labels live once in the axis above the lanes, not on every
 * card, which is most of what keeps six lanes of cards calm enough to read from across a hall.
 */
export function GroupLane({ group, accentClass, roundNumbers }: GroupLaneProps): React.ReactElement {
    const { t } = useTranslation();
    const glyph = groupGlyph(group.group_name);
    const { rounds } = groupMatchesByRound(group.matches);
    // Only ONE card is called out as next, per group — the game that group plays next. Marking
    // every unplayed card blue would call out nothing.
    const nextMatchId = group.matches[activeMatchIndex(group.matches)]?.id ?? null;
    const columns = roundNumbers.map(roundNumber => ({
        roundNumber,
        matches: rounds.find(r => r.roundNumber === roundNumber)?.matches ?? [],
    }));
    // The round window is shared across every lane in LanesView. A group whose own rounds all
    // fall outside it (e.g. it finished early, or it's flat/legacy and only ever bucketed under
    // round 1) would otherwise render zero cards here — on an unattended TV a blank row reads as
    // "this group has no games at all", which isn't true. Say so instead of showing nothing.
    const hasVisibleMatches = columns.some(c => c.matches.length > 0);

    return (
        <div
            className="grid min-h-0 flex-1 gap-2.5"
            style={{ gridTemplateColumns: `190px repeat(${roundNumbers.length}, minmax(0, 1fr))` }}
        >
            <div className={cn(
                'flex min-w-0 items-center gap-2.5 rounded-2xl border border-(--pb-border) bg-(--pb-card) px-4 [border-inline-start:3px_solid_var(--pb-ga,var(--pb-highlight))]',
                accentClass,
            )}>
                {glyph && (
                    <span aria-hidden className="pb-display text-3xl leading-none [color:var(--pb-ga,var(--pb-highlight))]">
                        {glyph}
                    </span>
                )}
                <span className="truncate text-[15px] font-extrabold text-(--pb-text)">
                    {localizeGroupName(group.group_name, t)}
                </span>
            </div>

            {hasVisibleMatches ? (
                columns.map(({ roundNumber, matches }) => (
                    <div key={roundNumber} className="grid min-w-0 gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(matches.length, 1)}, minmax(0, 1fr))` }}>
                        {matches.map(m => (
                            <LaneMatchCard key={m.id} match={m} isNext={m.id === nextMatchId} />
                        ))}
                    </div>
                ))
            ) : (
                <div
                    className="flex min-w-0 items-center justify-center text-[12px] font-semibold text-(--pb-text-faint)"
                    style={{ gridColumn: `2 / span ${roundNumbers.length}` }}
                >
                    {t('public_bracket.lane_no_matches_in_window', 'No matches in this round window')}
                </div>
            )}
        </div>
    );
}
