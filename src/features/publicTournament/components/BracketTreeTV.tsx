import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchCard } from './MatchCard';
import { ChampionBar } from './ChampionBar';
import { buildSegments, getRelRect, type Segment } from '../bracketConnectors';
import { buildColumns, COMPACT_MIN_ROUNDS, fitScale } from '../bracketLayout';
import { getRoundName } from '../utils';
import type { PublicMatch, PublicRound } from '../types';

type BracketTreeTVProps = {
    rounds: PublicRound[];
    thirdPlaceMatch?: PublicMatch | null;
    /** Show the champion bar under the final match. Leave off for brackets with no overall champion (e.g. the plate). */
    showChampion?: boolean;
};

export function BracketTreeTV({ rounds, thirdPlaceMatch, showChampion }: BracketTreeTVProps): React.ReactElement {
    const { t } = useTranslation();
    const boxRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [segments, setSegments] = useState<Segment[]>([]);
    const [scale, setScale] = useState(1);

    const columns = buildColumns(rounds);
    const compact = rounds.length >= COMPACT_MIN_ROUNDS;
    const finalMatch = columns.find(c => c.side === 'center')?.slots[0] ?? null;
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

    // Shrink the whole tree, connectors included, until it fits the screen: on a canvas with no
    // scrollbar anything wider or taller is simply cut off. `transform` rather than `zoom`, so the
    // offset* geometry the connectors are measured from stays unscaled; and writing the scale moves
    // nothing either box measures, so it cannot feed back into another resize. A layout effect, as
    // in TvCanvas, so the first paint is already scaled rather than clipped for a frame.
    useLayoutEffect(() => {
        const box = boxRef.current;
        const tree = containerRef.current;
        if (!box || !tree) return;
        const update = (): void => {
            setScale(fitScale(
                { width: box.clientWidth, height: box.clientHeight },
                { width: tree.offsetWidth, height: tree.offsetHeight },
            ));
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(box);
        observer.observe(tree);
        return () => observer.disconnect();
    }, []);

    const setNodeRef = (id: string) => (el: HTMLDivElement | null): void => {
        if (el) nodeRefs.current.set(id, el);
        else nodeRefs.current.delete(id);
    };

    return (
        <div ref={boxRef} className="flex h-full w-full items-start justify-center overflow-hidden">
            <div
                ref={containerRef}
                className={cn(
                    'relative flex w-max shrink-0 items-stretch',
                    compact ? 'min-h-full gap-3 px-4 pb-3' : 'min-h-[440px] gap-8 px-8 pb-8',
                )}
                style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
            >
                {columns.map(col => (
                    <div key={col.key} className={cn('flex shrink-0 flex-col pt-2', col.side === 'center' ? 'px-2' : compact ? 'w-[136px]' : 'min-w-[190px]', col.side === 'center' && !compact && 'min-w-[190px]')}>
                        {col.side === 'center' ? (
                            <div className={cn('flex flex-1 flex-col items-center justify-center gap-2.5', compact ? 'pb-6' : 'pb-12')}>
                                <Trophy size={28} className="text-(--pb-highlight)" />
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-(--pb-highlight)">
                                    {col.roundName.toLowerCase().includes('plate')
                                        ? getRoundName(col.roundName, t)
                                        : t('public_bracket.the_final', 'The Final')}
                                </p>
                                {finalMatch && (
                                    <div ref={setNodeRef(finalMatch.id)}>
                                        <MatchCard match={finalMatch} variant="hero" className={compact ? 'w-56' : 'w-64 2xl:w-72'} />
                                    </div>
                                )}
                                {finalTime && (
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-(--pb-text-faint)">{finalTime}</p>
                                )}
                                {showChampion && <ChampionBar match={finalMatch} className={cn('mt-1', compact ? 'w-56' : 'w-64 2xl:w-72')} />}
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
                                <p className={cn('text-center text-[9px] font-black uppercase tracking-[0.2em] text-(--pb-text-faint)', compact ? 'mb-1' : 'mb-3')}>
                                    {getRoundName(col.roundName, t)}
                                </p>
                                {/* Equal rows, card centred in each: a round with half the matches has rows
                                    twice as tall, so every card sits exactly level between the two it is
                                    fed by — and an empty row (a bye left out) keeps that true. `flex-auto`,
                                    not `flex-1`: a zero basis sizes `minmax(0, 1fr)` rows from their 0
                                    minimum, so the tree never grew to its tallest column and the scale-to-fit
                                    measured a box the cards spilled out of. */}
                                <div className="grid flex-auto" style={{ gridTemplateRows: `repeat(${col.slots.length}, minmax(0, 1fr))` }}>
                                    {col.slots.map((m, i) => (
                                        <div key={m?.id ?? `empty-${i}`} className={cn('flex flex-col justify-center', compact ? 'py-1' : 'py-3')}>
                                            {m && (
                                                <div ref={setNodeRef(m.id)}>
                                                    <MatchCard match={m} variant={compact ? 'compact' : 'node'} />
                                                </div>
                                            )}
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
        </div>
    );
}
