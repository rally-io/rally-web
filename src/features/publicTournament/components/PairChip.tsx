import React from 'react';
import { cn } from '@/lib/utils';
import { pairChipIndex, pairIdentity, pairInitials, type PairSource } from '../utils';

type PairChipProps = { pair: PairSource | null | undefined; className?: string };

/**
 * Initials tile that identifies a pair by colour wherever they appear — on every card of their
 * lane and on their standings row. The colour comes from `pairIdentity`, never from a position in
 * an array: `standings` is the live ranking and reorders as results land, so an index-derived
 * colour would recolour pairs mid-tournament and destroy the only thing the chip is for.
 *
 * The palette is fixed hex on purpose: these are identity colours, not theme colours, and a pair
 * that changed colour with the theme would be as confusing as one that changed with its rank.
 * White text is legible on all eight.
 */
const CHIP_COLORS = [
    '#0055ff', '#f59e0b', '#16a34a', '#db2777',
    '#7c3aed', '#0891b2', '#ea580c', '#65a30d',
];

export function PairChip({ pair, className }: PairChipProps): React.ReactElement {
    const initials = pairInitials(pair);
    const color = CHIP_COLORS[pairChipIndex(pairIdentity(pair))];
    return (
        <span
            aria-hidden
            className={cn(
                'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-[10px] font-black leading-none text-white',
                className,
            )}
            style={{ backgroundColor: color }}
        >
            {initials}
        </span>
    );
}
