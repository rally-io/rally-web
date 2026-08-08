import React from 'react';
import { cn } from '@/lib/utils';

type RatingChipProps = { rating: number | null | undefined; className?: string };

/**
 * Player skill rating shown after the name. Deliberately quiet — a boxed/bright
 * treatment reads as a match score on the live screen, so this stays a faint
 * small numeral that never competes with actual results.
 */
export function RatingChip({ rating, className }: RatingChipProps): React.ReactElement | null {
    if (rating == null) return null;
    return (
        <span className={cn('shrink-0 text-[10px] font-bold leading-none text-(--pb-text-faint) tabular-nums', className)}>
            {rating.toFixed(1)}
        </span>
    );
}
