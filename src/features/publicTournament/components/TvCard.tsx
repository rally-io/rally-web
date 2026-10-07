import React from 'react';
import { cn } from '@/lib/utils';

/** A round card's state on the venue screen: played, on court, called next, or still to come. */
export type TvCardState = 'done' | 'live' | 'next' | 'upcoming';

/**
 * The one card frame on the venue screen: group tables, Americano round cards and the Americano
 * table all sit in it, so they read as one board. Content-sized (owner 2026-10-04): a card takes
 * its rows' height and the grid around it centres the cards.
 */
const FRAME = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-(--pb-border) border-t-[3px] bg-(--pb-card) [border-top-color:var(--pb-ga,var(--pb-highlight))]';

/** After FRAME in `cn()`, so twMerge lets each override the frame's border and top-edge colours. */
const STATE_CLASS: Record<TvCardState, string> = {
    live: 'border-(--pb-live)/60 [border-top-color:var(--pb-live)] shadow-[0_0_22px_color-mix(in_srgb,var(--pb-live)_22%,transparent)]',
    next: '[border-top-color:var(--pb-accent)]',
    // The same recede as a finished lane card (LaneMatchCard): played rounds stay legible.
    done: '[border-top-color:var(--pb-highlight)] opacity-80',
    upcoming: '[border-top-color:var(--pb-border)]',
};

/**
 * The state's own colour, exposed as a `--pb-tone` custom property on the card — the same idea
 * as `--pb-ga`. A header-slot consumer (a round's glyph, its status pill) reads `var(--pb-tone)`
 * instead of keeping its own state-to-colour ternary, so the mapping lives in exactly one place
 * instead of three (here, the glyph, the pill).
 */
const TONE_VAR: Record<TvCardState, string> = {
    live: 'var(--pb-live)',
    next: 'var(--pb-accent)',
    done: 'var(--pb-highlight)',
    upcoming: 'var(--pb-text-faint)',
};

type TvCardProps = {
    /** A round's state. Omitted: the plain frame, its top edge in the card's accent (`--pb-ga`) or the highlight. */
    state?: TvCardState;
    /** A `pb-ga-N` class (GroupsView's GROUP_ACCENTS): the accent the top edge and the header glyph take. */
    accentClass?: string;
    /** The header row's content: a glyph, the title, a status pill. */
    header: React.ReactNode;
    children: React.ReactNode;
};

export function TvCard({ state, accentClass, header, children }: TvCardProps): React.ReactElement {
    return (
        <div
            data-card-state={state}
            className={cn(FRAME, state && STATE_CLASS[state], accentClass)}
            // Only set when a state exists: a group card (no `state`) gets no `--pb-tone` at
            // all, same as before this existed — it never reads it, so nothing changes for it.
            style={state ? ({ '--pb-tone': TONE_VAR[state] } as React.CSSProperties) : undefined}
        >
            <header className="flex shrink-0 items-center gap-2.5 border-b border-(--pb-border) bg-(--pb-card-header) px-4 py-1.5">
                {header}
            </header>
            {children}
        </div>
    );
}

/**
 * A table card's column labels. The gap must match the rows' own gap (`gap-1.5`) or the labels
 * drift off the numbers under them.
 */
export function TvCardColumns({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
        <div className="flex shrink-0 items-center gap-1.5 px-6 pt-1 text-[10px] font-black uppercase tracking-wider text-(--pb-text-faint)">
            {children}
        </div>
    );
}
