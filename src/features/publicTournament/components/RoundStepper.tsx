import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { getRoundName, isFinishedStatus } from '../utils';
import type { PublicRound } from '../types';

type RoundStepperProps = { rounds: PublicRound[]; activeIndex: number; onSelect: (i: number) => void };

export function RoundStepper({ rounds, activeIndex, onSelect }: RoundStepperProps): React.ReactElement {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-1 overflow-x-auto">
            {rounds.map((round, i) => {
                const isComplete = round.matches.length > 0 && round.matches.every(m => isFinishedStatus(m.status));
                const isActive = i === activeIndex;
                return (
                    <button
                        key={round.round_number}
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
