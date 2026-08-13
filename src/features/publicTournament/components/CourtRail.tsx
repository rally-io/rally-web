import React, { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { FitText } from './FitText';
import { courtSlots, teamLabel, type CourtSlot } from '../utils';
import type { PublicBracketData, PublicMatch } from '../types';

type CourtRailProps = { bracket: PublicBracketData };

/** Tile width once the rail scrolls, and the gap between tiles (`gap-2.5`). Both in px, because
 *  the overflow test below is arithmetic against a measured container width. */
const TILE_PX = 208;
const GAP_PX = 10;

/** Seconds a single tile takes to cross, so a 16-court rail travels at the same speed as a 9-court
 *  one instead of becoming a blur. */
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
 * The courts worth a tile: one with neither a live match nor a next one has nothing to report,
 * and the panel's whole point is "what's happening now".
 *
 * There is deliberately no cap. There used to be one at six tiles, which quietly suited the
 * tournaments nobody checked: two clubs in the database run 11 and 16 courts, so ten of them were
 * dropped with nothing on screen to say they existed, and a player on Court 12 never once saw
 * their match. Everything that does not fit now scrolls into view instead of vanishing.
 */
function occupiedCourts(slots: CourtSlot[]): CourtSlot[] {
    return slots.filter(s => s.live !== null || s.next !== null);
}

/**
 * What is on each court right now, and what follows it — held still in the footer whenever it
 * fits, and travelling only when it cannot.
 *
 * Movement is information here, not decoration: a rail that scrolls is saying "there is more of
 * this than the screen holds". A four-court club therefore gets a rail that never moves, because
 * nothing is hidden for motion to reveal — and the tiles stay in one place all evening, which is
 * what a player glancing up for their court actually needs. Renders nothing at all when no match
 * names a court, rather than an empty row of tiles.
 */
export function CourtRail({ bracket }: CourtRailProps): React.ReactElement | null {
    const { t } = useTranslation();
    const slots = occupiedCourts(courtSlots(bracket));
    // Callback ref, not useRef: the rail element does not exist while no court is named, so an
    // effect keyed on a plain ref would run once against null and never re-attach when the first
    // court is assigned mid-tournament.
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

    if (slots.length === 0) return null;

    const needed = slots.length * TILE_PX + (slots.length - 1) * GAP_PX;
    // `width` is 0 before the first measurement — and permanently so in jsdom, which does no
    // layout. Treating that as "fits" means the rail can only ever start scrolling on evidence,
    // never on the absence of it.
    const scrolls = width > 0 && needed > width;

    function tile({ court, live, next }: CourtSlot, copy: number): React.ReactElement {
        const match = live ?? next;
        return (
            <div
                key={`${copy}-${court}`}
                // The second copy exists only to make the loop seamless; it must not be read out
                // twice or counted twice by anything walking the tree.
                aria-hidden={copy > 0 || undefined}
                className={cn(
                    'flex min-w-0 flex-col gap-0.5 rounded-xl border bg-(--pb-card) px-3 py-1.5',
                    scrolls ? 'w-[208px] shrink-0' : 'flex-1',
                    live ? 'pb-live-card border-(--pb-live)' : 'border-(--pb-border)',
                )}
            >
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                    <span className="truncate text-(--pb-text-muted)">{court}</span>
                    <span className={cn('ms-auto flex shrink-0 items-center gap-1.5', live ? 'text-(--pb-live)' : 'text-(--pb-accent)')}>
                        {live && <span className="pb-live-dot h-1.5 w-1.5 rounded-full bg-(--pb-live)" />}
                        {live ? t('public_bracket.live_now', 'Live now') : t('public_bracket.court_next', 'Next')}
                    </span>
                </div>
                {/* `match` is always live ?? next here — `slots` was already filtered to tiles
                    that have one or the other, so there is no TBD case left to render. */}
                {match && (
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 flex-1 font-extrabold leading-tight text-(--pb-text)">
                            <FitText text={teamLabel(match.team_a)} maxPx={12} minPx={9} />
                            <FitText text={teamLabel(match.team_b)} maxPx={12} minPx={9} className="text-(--pb-text-muted)" />
                        </span>
                        {live && live.sets.length > 0 ? (
                            // Each set as its own pair of elements — a joined "6:4" mirrors in RTL.
                            <span className="flex shrink-0 gap-1.5">
                                {live.sets.map((s, i) => (
                                    <span key={i} className="flex flex-col text-center text-[15px] font-black leading-tight tabular-nums text-(--pb-live)">
                                        <span>{s.team_a_score}</span>
                                        <span>{s.team_b_score}</span>
                                    </span>
                                ))}
                            </span>
                        ) : (
                            <span className="shrink-0 text-[15px] font-black tabular-nums text-(--pb-accent)">{time(match)}</span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div ref={setRail} data-testid="court-rail" className="flex min-w-0 flex-1 overflow-hidden">
            <div
                className={cn('flex gap-2.5', scrolls ? 'pb-rail-track w-max' : 'flex-1')}
                style={scrolls ? ({
                    '--pb-rail-dur': `${slots.length * SECONDS_PER_TILE}s`,
                    // One discrete jump per tile under prefers-reduced-motion.
                    '--pb-rail-steps': slots.length,
                } as React.CSSProperties) : undefined}
            >
                {slots.map(s => tile(s, 0))}
                {scrolls && slots.map(s => tile(s, 1))}
            </div>
        </div>
    );
}
