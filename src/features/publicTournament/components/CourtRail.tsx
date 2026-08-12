import React from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { FitText } from './FitText';
import { courtSlots, teamLabel, type CourtSlot } from '../utils';
import type { PublicBracketData, PublicMatch } from '../types';

type CourtRailProps = { bracket: PublicBracketData };

/** Tiles wider than this many courts start truncating names past readability on the fixed canvas. */
const MAX_COURT_TILES = 6;

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
 * The tiles worth a spot in a footer that can only fit a handful.
 *
 * A court with neither a live match nor a next one has nothing to report — the panel's whole
 * point is "what's happening now", so it gets no tile. Beyond that, above `MAX_COURT_TILES` a
 * live match (the thing people are actually watching) outranks a merely-upcoming one; ties within
 * each group keep the natural court order `slots` already arrived in, rather than being
 * re-sorted, so "Court 10" still lands after "Court 9".
 */
function courtTiles(slots: CourtSlot[]): CourtSlot[] {
    const occupied = slots.filter(s => s.live !== null || s.next !== null);
    if (occupied.length <= MAX_COURT_TILES) return occupied;
    const live = occupied.filter(s => s.live);
    const nextOnly = occupied.filter(s => !s.live);
    const keep = new Set([...live, ...nextOnly].slice(0, MAX_COURT_TILES).map(s => s.court));
    return occupied.filter(s => keep.has(s.court));
}

/**
 * What is on each court right now, and what follows it — held still in the footer.
 *
 * Replaces the scrolling ticker: a player who wants their court had to stand and wait for a
 * marquee to loop back round, which is the opposite of what an unattended board is for. Renders
 * nothing when no match carries a court name, rather than an empty row of tiles.
 */
export function CourtRail({ bracket }: CourtRailProps): React.ReactElement | null {
    const { t } = useTranslation();
    const slots = courtTiles(courtSlots(bracket));
    if (slots.length === 0) return null;

    return (
        <div className="flex min-w-0 flex-1 gap-2.5">
            {slots.map(({ court, live, next }) => {
                const match = live ?? next;
                return (
                    <div
                        key={court}
                        className={cn(
                            'flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl border bg-(--pb-card) px-3 py-1.5',
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
            })}
        </div>
    );
}
