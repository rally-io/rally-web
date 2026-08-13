import React, { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { FitText } from './FitText';
import { isLiveStatus, teamLabel, upNextMatches } from '../utils';
import type { PublicBracketData, PublicMatch } from '../types';

type CourtRailProps = { bracket: PublicBracketData };

/** Tile width once the rail scrolls, and the gap between tiles (`gap-2.5`). Both in px, because
 *  the overflow test below is arithmetic against a measured container width. */
const TILE_PX = 208;
const GAP_PX = 10;

/** A tile stops growing here. Without it two matches stretch to 635px each and the footer reads
 *  as two balloons with the content pinned to their far edges. */
const TILE_MAX_PX = 272;

/** Seconds a single tile takes to cross, so a ten-match queue travels at the same speed as a
 *  four-match one instead of becoming a blur. */
const SECONDS_PER_TILE = 5;

function time(match: PublicMatch): string {
    if (!match.scheduled_at) return '';
    try {
        return format(parseISO(match.scheduled_at), 'HH:mm');
    } catch {
        // parseISO never throws — a malformed string becomes an Invalid Date — so the throw
        // that lands here comes from format() itself.
        return '';
    }
}

/**
 * The footer queue: what is on court now, and the matches due after it.
 *
 * One tile per MATCH, not per court. Per court — which this replaced — showed each court's
 * immediate next match and nothing behind it, so a round of twelve matches on two courts put two
 * tiles on the board and the other ten had nowhere to appear. Worse, a match with no court
 * assigned was invisible: the whole rail vanished for any club that seeds courts on the night,
 * leaving a footer with nothing in it but the QR panel.
 *
 * The queue scrolls only when it outgrows the rail, which is the same rule as before: movement
 * means "there is more of this than the screen holds", so a board with two matches on shows two
 * tiles and holds still.
 */
export function CourtRail({ bracket }: CourtRailProps): React.ReactElement | null {
    const { t } = useTranslation();
    const matches = upNextMatches(bracket);
    // Callback ref, not useRef: the rail element does not exist while the queue is empty, so an
    // effect keyed on a plain ref would run once against null and never re-attach when the first
    // match is scheduled mid-tournament.
    const [rail, setRail] = useState<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(0);

    useLayoutEffect(() => {
        if (!rail) return;
        // Sub-pixel jitter must not re-render a board that is otherwise idle for hours; the
        // same guard absorbs offsetWidth being integral where contentRect is fractional.
        const measure = (next: number): void => setWidth(prev => (Math.abs(prev - next) < 1 ? prev : next));
        // Measured once here, synchronously, rather than waiting on the observer's first
        // callback. Both report untransformed layout width, so the TvCanvas scale does not
        // enter into it — but a ResizeObserver callback is not guaranteed to arrive promptly
        // (a browser throttling a background tab may not deliver one at all), and a rail that
        // silently never scrolls is exactly the failure this whole change is fixing.
        measure(rail.offsetWidth);
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(entries => measure(entries[0]?.contentRect.width ?? 0));
        observer.observe(rail);
        return () => observer.disconnect();
    }, [rail]);

    if (matches.length === 0) return null;

    const needed = matches.length * TILE_PX + (matches.length - 1) * GAP_PX;
    // `width` is 0 before the first measurement — and permanently so in jsdom, which does no
    // layout. Treating that as "fits" means the rail can only ever start scrolling on evidence,
    // never on the absence of it.
    const scrolls = width > 0 && needed > width;

    function tile(match: PublicMatch, copy: number): React.ReactElement {
        const live = isLiveStatus(match.status);
        const at = time(match);
        return (
            <div
                key={`${copy}-${match.id}`}
                // The second copy exists only to make the loop seamless; it must not be read out
                // twice or counted twice by anything walking the tree.
                aria-hidden={copy > 0 || undefined}
                style={scrolls ? undefined : { maxWidth: TILE_MAX_PX }}
                className={cn(
                    'flex min-w-0 flex-col gap-0.5 rounded-xl border bg-(--pb-card) px-3 py-1.5',
                    scrolls ? 'w-[208px] shrink-0' : 'flex-1',
                    live ? 'pb-live-card border-(--pb-live)' : 'border-(--pb-border)',
                )}
            >
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                    {/* Absent for a match the CRM has not put on a court yet — the tile still
                        belongs in the queue, it just cannot say where. */}
                    {match.court_name && <span className="truncate text-(--pb-text-muted)">{match.court_name}</span>}
                    <span className={cn('ms-auto flex shrink-0 items-center gap-1.5', live ? 'text-(--pb-live)' : 'text-(--pb-accent)')}>
                        {live && <span className="pb-live-dot h-1.5 w-1.5 rounded-full bg-(--pb-live)" />}
                        {live ? t('public_bracket.live_now', 'Live now') : t('public_bracket.court_next', 'Next')}
                    </span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                    <span className="min-w-0 flex-1 font-extrabold leading-tight text-(--pb-text)">
                        <FitText text={teamLabel(match.team_a)} maxPx={12} minPx={9} />
                        <FitText text={teamLabel(match.team_b)} maxPx={12} minPx={9} className="text-(--pb-text-muted)" />
                    </span>
                    {live && match.sets.length > 0 ? (
                        // Each set as its own pair of elements — a joined "6:4" mirrors in RTL.
                        <span className="flex shrink-0 gap-1.5">
                            {match.sets.map((s, i) => (
                                <span key={i} className="flex flex-col text-center text-[15px] font-black leading-tight tabular-nums text-(--pb-live)">
                                    <span>{s.team_a_score}</span>
                                    <span>{s.team_b_score}</span>
                                </span>
                            ))}
                        </span>
                    ) : at ? (
                        <span className="shrink-0 text-[15px] font-black tabular-nums text-(--pb-accent)">{at}</span>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div ref={setRail} data-testid="court-rail" className="flex min-w-0 flex-1 overflow-hidden">
            <div
                className={cn('flex gap-2.5', scrolls ? 'pb-rail-track w-max' : 'flex-1')}
                style={scrolls ? ({
                    '--pb-rail-dur': `${matches.length * SECONDS_PER_TILE}s`,
                    // One discrete jump per tile under prefers-reduced-motion.
                    '--pb-rail-steps': matches.length,
                } as React.CSSProperties) : undefined}
            >
                {matches.map(m => tile(m, 0))}
                {scrolls && matches.map(m => tile(m, 1))}
            </div>
        </div>
    );
}
