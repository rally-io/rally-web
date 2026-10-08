import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { GroupLane } from './GroupLane';
import {
    activeRoundNumber,
    groupMatchesByRound,
    roundStateLabel,
    roundStateOf,
    visibleRoundWindow,
} from '../utils';
import type { MatchRound } from '../utils';
import type { PublicGroup, PublicMatch } from '../types';

type LanesViewProps = { groups: PublicGroup[]; accents: string[] };

/** Columns beyond this squeeze the cards past readability; more rounds show a window instead. */
const MAX_ROUND_COLUMNS = 4;

/**
 * One round's matches across every group, for the axis label's state (`roundStateOf`).
 *
 * The `?? 0` fallback must match `groupMatchesByRound`'s bucketing exactly — that function is
 * the source of truth for which column a null-round match lands in (bucket 0, the unlabeled
 * trailing column), and disagreeing here would let a null-round live match make a real round's
 * label lie (e.g. "Round 1 · In progress" while round 1's own cards all read "Final").
 */
function roundMatches(groups: PublicGroup[], roundNumber: number): PublicMatch[] {
    return groups.flatMap(g => g.matches.filter(m => (m.round_number ?? 0) === roundNumber));
}

/**
 * The «משחקים» screen: one lane per group under a single shared round axis.
 *
 * The axis is the reason this scales — the round label and its status are stated once per column
 * rather than on each of thirty-six cards, so the density a player actually reads is one lane.
 */
export function LanesView({ groups, accents }: LanesViewProps): React.ReactElement {
    const { t } = useTranslation();

    const grouped = groups.map(g => groupMatchesByRound(g.matches));
    const hasRealRounds = grouped.some(r => r.hasRealRounds);

    // CORRECTION A: groupMatchesByRound parks any match whose round_number is null into a bucket
    // keyed 0 alongside a group's real (>=1) round numbers, so the match stays visible instead of
    // being dropped (see that function's doc comment). "Round 0" would be a meaningless label on
    // a public scoreboard, so bucket 0 never enters `realRounds` — the set that drives the
    // labelled/windowed axis, the active-round calculation, and the "of N" total below. Its
    // matches are NOT dropped, though: `laneRoundNumbers` (further down) appends one extra,
    // unlabelled trailing column for them whenever any group actually has one.
    const realRounds = [...new Set(grouped.flatMap(r => r.rounds.map(x => x.roundNumber)))]
        .filter(n => n > 0)
        .sort((a, b) => a - b);
    const hasUnlabeledMatches = grouped.some(r => r.rounds.some(x => x.roundNumber === 0 && x.matches.length > 0));

    // CORRECTION B: the brief derived the active round from `grouped[0]` alone, so a group that
    // finishes first would pin the window to ITS last round while every other group is still
    // mid-tournament. Instead, merge all groups' matches into round buckets keyed by the shared
    // round number, then hand that union to the existing `activeRoundNumber` helper (unchanged) —
    // it finds the earliest round that still has a live or unfinished match ACROSS ALL GROUPS, so
    // the window follows the tournament rather than whichever group happens to be listed first.
    const mergedRounds: MatchRound[] = realRounds.map(roundNumber => ({
        roundNumber,
        matches: grouped.flatMap(g => g.rounds.find(r => r.roundNumber === roundNumber)?.matches ?? []),
    }));
    const active = activeRoundNumber(mergedRounds.length > 0 ? mergedRounds : [{ roundNumber: 1, matches: [] }]);

    const roundNumbers = visibleRoundWindow(realRounds, active, MAX_ROUND_COLUMNS);
    const isWindowed = roundNumbers.length < realRounds.length;
    // The columns actually rendered: the labelled/windowed real rounds, plus one trailing
    // unlabelled column carrying bucket-0 matches when any group has them (Correction A). Both
    // the axis header below and every GroupLane are driven off this SAME array, so the unlabelled
    // column still lines up under the shared axis exactly like a real round column would.
    const laneRoundNumbers = hasUnlabeledMatches ? [...roundNumbers, 0] : roundNumbers;

    return (
        <div className="flex h-full min-h-0 flex-col">
            {hasRealRounds && (
                <div
                    className="grid shrink-0 items-end gap-2.5 px-8 pb-1"
                    style={{ gridTemplateColumns: `190px repeat(${laneRoundNumbers.length}, minmax(0, 1fr))` }}
                >
                    <span className="truncate text-[10px] font-black uppercase tracking-wider text-(--pb-text-faint)">
                        {isWindowed && t('public_bracket.round_window', {
                            from: roundNumbers[0],
                            to: roundNumbers[roundNumbers.length - 1],
                            total: realRounds.length,
                            defaultValue: `Rounds ${roundNumbers[0]}–${roundNumbers[roundNumbers.length - 1]} of ${realRounds.length}`,
                        })}
                    </span>
                    {laneRoundNumbers.map(n => {
                        if (n === 0) {
                            // CORRECTION A: bucket 0 is not a real round, so this cell carries no
                            // text at all — not "Round 0", not a blank number where one belongs.
                            // It's an unlabelled structural column, the same way the 190px name
                            // gutter to its left carries no round label either.
                            return <span key="unrounded" aria-hidden />;
                        }
                        const state = roundStateOf(roundMatches(groups, n));
                        return (
                            <span key={n} className="truncate text-center text-[10px] font-black uppercase tracking-wider text-(--pb-text-faint)">
                                {t('public_bracket.rounds.round_n', { num: n, defaultValue: `Round ${n}` })}
                                <span className={cn('ms-1.5 tracking-normal', state === 'live' ? 'text-(--pb-live)' : 'text-(--pb-text-faint)')}>
                                    {roundStateLabel(state, t)}
                                </span>
                            </span>
                        );
                    })}
                </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col gap-2 px-8 pb-3">
                {groups.map((g, i) => (
                    <GroupLane
                        key={g.group_name}
                        group={g}
                        accentClass={accents[i % accents.length]}
                        roundNumbers={laneRoundNumbers}
                    />
                ))}
            </div>
        </div>
    );
}
