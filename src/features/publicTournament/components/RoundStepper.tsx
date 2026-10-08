import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { getRoundName, roundStateOf } from '../utils';
import type { PublicRound } from '../types';

type RoundStepperProps = { rounds: PublicRound[]; activeIndex: number; onSelect: (i: number) => void };

export function RoundStepper({ rounds, activeIndex, onSelect }: RoundStepperProps): React.ReactElement {
    const { t } = useTranslation();
    const stripRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLButtonElement>(null);

    // Five rounds already overflow a phone's strip, so the round on screen can sit outside it.
    // Scroll the STRIP sideways by the overhang — physical coordinates, so RTL needs no branch.
    // Not scrollIntoView: the stepper sits below the table, and that would scroll the page too.
    useEffect(() => {
        const strip = stripRef.current;
        const pill = activeRef.current;
        if (!strip || !pill) return;
        const r = pill.getBoundingClientRect();
        const b = strip.getBoundingClientRect();
        const delta = r.left < b.left ? r.left - b.left : r.right > b.right ? r.right - b.right : 0;
        if (delta) strip.scrollBy?.({ left: delta });
    }, [activeIndex]);

    return (
        <div ref={stripRef} className="flex items-center gap-1 overflow-x-auto">
            {rounds.map((round, i) => {
                const isComplete = roundStateOf(round.matches) === 'done';
                const isActive = i === activeIndex;
                return (
                    <button
                        key={round.round_number}
                        ref={isActive ? activeRef : undefined}
                        onClick={() => onSelect(i)}
                        className={cn(
                            'flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors',
                            isActive
                                ? 'bg-(--pb-highlight) text-(--pb-highlight-contrast)'
                                : 'text-(--pb-text-faint) hover:text-(--pb-text-muted)',
                        )}
                    >
                        {getRoundName(round.round_name, t)}
                        {isComplete && !isActive ? ' ✓' : ''}
                    </button>
                );
            })}
        </div>
    );
}
