import React from 'react';
import { cn } from '@/lib/utils';

type RankNumeralProps = {
    children: React.ReactNode;
    /** The column's width: a group's one digit fits `w-6`; a twenty-player table's two need `w-9`. */
    widthClass: string;
    /** Past four rows a card goes denser, and the numeral with it. */
    dense: boolean;
    /** A qualifying (or podium) row: the numeral takes the highlight. */
    highlight: boolean;
};

/** A table row's place on the venue screen, in the body face — the same in every table card. */
export function RankNumeral({ children, widthClass, dense, highlight }: RankNumeralProps): React.ReactElement {
    return (
        <span
            aria-hidden
            className={cn(
                widthClass,
                'shrink-0 text-center text-2xl font-black',
                dense && 'text-xl',
                // `leading-none` must land AFTER the dense size override, not before: twMerge
                // resolves a same-group class conflict by keeping whichever class comes LAST in
                // the merged string, so putting `leading-none` first here got it silently
                // dropped whenever `dense` added `text-xl` after it.
                'leading-none',
                highlight ? 'text-(--pb-highlight)' : 'text-(--pb-text-faint)',
            )}
        >
            {children}
        </span>
    );
}
