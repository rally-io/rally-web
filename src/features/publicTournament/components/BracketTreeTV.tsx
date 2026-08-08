import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchCard } from './MatchCard';
import { ChampionBar } from './ChampionBar';
import { buildSegments, getRelRect, type Segment } from '../bracketConnectors';
import { getRoundName } from '../utils';
import type { PublicMatch, PublicRound } from '../types';

type Side = 'left' | 'right' | 'center';
type Column = { key: string; roundName: string; matches: PublicMatch[]; side: Side };

function splitRounds(rounds: PublicRound[]): Column[] {
    if (rounds.length === 0) return [];
    const finalRound = rounds[rounds.length - 1];
    const earlier = rounds.slice(0, -1);
    const left: Column[] = earlier.map(r => ({
        key: `L${r.round_number}`,
        roundName: r.round_name,
        side: 'left',
        matches: r.matches.slice(0, Math.ceil(r.matches.length / 2)),
    }));
    const right: Column[] = earlier
        .map(r => ({
            key: `R${r.round_number}`,
            roundName: r.round_name,
            side: 'right' as Side,
            matches: r.matches.slice(Math.ceil(r.matches.length / 2)),
        }))
        .reverse();
    const center: Column = { key: 'C', roundName: finalRound.round_name, side: 'center', matches: finalRound.matches };
    return [...left, center, ...right].filter(c => c.matches.length > 0);
}

type BracketTreeTVProps = {
    rounds: PublicRound[];
    thirdPlaceMatch?: PublicMatch | null;
    /** Show the champion bar under the final match. Leave off for brackets with no overall champion (e.g. the plate). */
    showChampion?: boolean;
};

export function BracketTreeTV({ rounds, thirdPlaceMatch, showChampion }: BracketTreeTVProps): React.ReactElement {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [segments, setSegments] = useState<Segment[]>([]);

    const columns = splitRounds(rounds);
    const finalMatch = columns.find(c => c.side === 'center')?.matches[0] ?? null;
    const finalTime = finalMatch?.scheduled_at ? format(parseISO(finalMatch.scheduled_at), 'EEE · HH:mm') : null;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let rafId: number | null = null;

        const recompute = (): void => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                rafId = null;
                const next: Segment[] = [];
                const all = rounds.flatMap(r => r.matches);
                const byId = new Map(all.map(m => [m.id, m]));
                all.forEach(child => {
                    if (!child.next_match_id || !byId.has(child.next_match_id)) return;
                    const childEl = nodeRefs.current.get(child.id);
                    const parentEl = nodeRefs.current.get(child.next_match_id);
                    if (!childEl || !parentEl) return;
                    next.push(...buildSegments(
                        getRelRect(childEl, container),
                        getRelRect(parentEl, container),
                        Boolean(child.winner_team),
                    ));
                });
                setSegments(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
            });
        };

        recompute();

        // Re-measure on layout changes, not only when `rounds` changes — a window resize,
        // sidebar collapse, scrollbar appearing, or font load all change the measured DOM
        // geometry without changing `rounds`. The overlay SVG below is `absolute inset-0`
        // and explicitly sized to 100%/100% of this container, so writing `segments` state
        // (which only edits its <path d> attributes) can never change the container's own
        // box size — this cannot feed back into another resize notification.
        const observer = new ResizeObserver(recompute);
        observer.observe(container);

        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, [rounds]);

    const setNodeRef = (id: string) => (el: HTMLDivElement | null): void => {
        if (el) nodeRefs.current.set(id, el);
        else nodeRefs.current.delete(id);
    };

    return (
        <div ref={containerRef} className="relative flex min-h-[440px] items-stretch justify-center gap-8 overflow-x-auto px-8 pb-8">
            {columns.map(col => (
                <div key={col.key} className={cn('flex min-w-[190px] shrink-0 flex-col pt-2', col.side === 'center' && 'px-2')}>
                    {col.side === 'center' ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 pb-12">
                            <Trophy size={28} className="text-(--pb-highlight)" />
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-(--pb-highlight)">
                                {col.roundName.toLowerCase().includes('plate')
                                    ? getRoundName(col.roundName, t)
                                    : t('public_bracket.the_final', 'The Final')}
                            </p>
                            {finalMatch && (
                                <div ref={setNodeRef(finalMatch.id)}>
                                    <MatchCard match={finalMatch} variant="hero" className="w-64 2xl:w-72" />
                                </div>
                            )}
                            {finalTime && (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-(--pb-text-faint)">{finalTime}</p>
                            )}
                            {showChampion && <ChampionBar match={finalMatch} className="mt-1 w-64 2xl:w-72" />}
                            {thirdPlaceMatch && (
                                <div className="mt-6 flex flex-col items-center gap-1.5">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-(--pb-text-faint)">
                                        {t('public_bracket.third_place', '3rd Place')}
                                    </p>
                                    <MatchCard match={thirdPlaceMatch} variant="node" className="w-48" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <p className="mb-3 text-center text-[9px] font-black uppercase tracking-[0.2em] text-(--pb-text-faint)">
                                {getRoundName(col.roundName, t)}
                            </p>
                            <div className="flex flex-1 flex-col justify-around gap-6">
                                {col.matches.map(m => (
                                    <div key={m.id} ref={setNodeRef(m.id)}>
                                        <MatchCard match={m} variant="node" />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ))}
            {segments.length > 0 && (
                <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" style={{ overflow: 'visible' }}>
                    {segments.map((s, i) => (
                        <path
                            key={i}
                            d={s.d}
                            fill="none"
                            stroke={s.winner ? 'var(--pb-highlight)' : 'var(--pb-border)'}
                            strokeWidth={s.winner ? 2 : 1.5}
                            strokeLinecap="round"
                            opacity={s.winner ? 0.8 : 0.6}
                        />
                    ))}
                </svg>
            )}
        </div>
    );
}
