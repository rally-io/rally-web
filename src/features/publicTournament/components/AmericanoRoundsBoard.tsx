import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { tvGridCols } from './GroupsView';
import { TvCard, type TvCardState } from './TvCard';
import { GameLine, type GameLineSize } from './GameLine';
import { activeRoundIndex, courtTier, getRoundName, groupGlyph, nextRoundWindow, roundStateLabel, roundStateOf, upNextRoundIndex, visibleRoundWindow } from '../utils';
import type { CourtTier } from '../utils';
import type { PublicRound } from '../types';

type AmericanoRoundsBoardProps = {
    rounds: PublicRound[];
    /** One line under a round's games — who sits it out. */
    roundNote?: (round: PublicRound) => string | null;
};

/**
 * How the board lays out, by its widest round's `courtTier` (owner 2026-10-04: every game on
 * screen, up to the API's 16 courts). A card never holds more games than fit it; the window holds
 * fewer rounds.
 *
 * | tier    | widest round | rounds on screen | layout                                   |
 * |---------|--------------|------------------|-------------------------------------------|
 * | few     | ≤ 4 games    | up to 8          | the group grid (4×2 at seven or eight)   |
 * | several | 5–8 games    | up to 4          | one row, compact rows (`sm`)             |
 * | many    | 9–16 games   | up to 2          | one row, each card's games in 2 columns  |
 */
type BoardTier = { maxRounds: number; oneRow: boolean; twoColumnGames: boolean };

const BOARD_TIER: Record<CourtTier, BoardTier> = {
    few: { maxRounds: 8, oneRow: false, twoColumnGames: false },
    several: { maxRounds: 4, oneRow: true, twoColumnGames: false },
    many: { maxRounds: 2, oneRow: true, twoColumnGames: true },
};

/**
 * The venue screen's games for an Americano: every round on screen at once, one card per round,
 * laid out exactly like the group cards (owner 2026-10-03: "treat the rounds like groups — the
 * manager won't switch tabs for each round"). Nobody touches the screen: the round on court
 * burns, the next one is called out, the played ones recede.
 *
 * Eight rounds of up to four games fit the 1600×900 canvas (the group grid's 4×2). More rounds, or
 * wider rounds (`courtTier`, through `BOARD_TIER`), show a window around the round being played instead.
 */
export function AmericanoRoundsBoard({ rounds, roundNote }: AmericanoRoundsBoardProps): React.ReactElement {
    const active = activeRoundIndex(rounds);
    const tier = BOARD_TIER[courtTier(Math.max(1, ...rounds.map(r => r.matches.length)))];
    // One round called next, never two: the live rounds burn, and the first not-done round after
    // them is the one the hall is waiting for.
    const states = rounds.map(r => roundStateOf(r.matches));
    const next = upNextRoundIndex(states);
    const roundNumbers = rounds.map(r => r.round_number);
    // The window must be built around the SAME round `next` names, not a second,
    // independently-computed one: `active` is the FIRST live (or unfinished) round, `next` is the
    // round after the LAST live one, and anchoring on `active` could window `next` off screen
    // entirely, leaving no card marked "next" at all. With a next round, pull the window towards it
    // (`nextRoundWindow` keeps the live rounds right before it on screen too, and never drops one —
    // see its own doc comment). With no next round — everything's played, or the evening's last
    // round is the one still live — there is nothing ahead to pull towards, so fall back to
    // `visibleRoundWindow`, anchored on the last live round. Its `active` fallback (no live round at
    // all) is reached only once every round is done — nothing left to call live OR next — which is
    // exactly when `active` is already the evening's last round, not a separate case to reason about.
    const lastLiveIndex = states.lastIndexOf('live');
    const numbers = next !== -1
        ? nextRoundWindow(roundNumbers, states, next, tier.maxRounds)
        : visibleRoundWindow(roundNumbers, rounds[lastLiveIndex !== -1 ? lastLiveIndex : active]?.round_number ?? 1, tier.maxRounds);
    const onScreen = rounds
        .map((round, i): { round: PublicRound; state: TvCardState } => ({ round, state: i === next ? 'next' : states[i] }))
        .filter(({ round }) => numbers.includes(round.round_number));
    const size: GameLineSize = tier.oneRow ? 'sm' : onScreen.length <= 2 ? 'lg' : onScreen.length <= 4 ? 'md' : 'sm';
    const cols = tvGridCols(onScreen.length, tier.oneRow);

    // Cards take the height of their games and the grid sits centred, so an evening with one round
    // on two courts is a compact card in the middle of the screen — not a full-height frame with
    // two games floating in it.
    return (
        <div className={cn('grid h-full content-center gap-4 px-8 pb-5', cols)}>
            {onScreen.map(({ round, state }) => (
                <RoundCard
                    key={round.round_number}
                    round={round}
                    state={state}
                    note={roundNote?.(round) ?? null}
                    size={size}
                    twoColumns={tier.twoColumnGames}
                />
            ))}
        </div>
    );
}

function RoundCard({ round, state, note, size, twoColumns }: {
    round: PublicRound;
    state: TvCardState;
    note: string | null;
    size: GameLineSize;
    /** Nine or more games: two columns of games, so sixteen courts still fit the card. */
    twoColumns: boolean;
}): React.ReactElement {
    const { t } = useTranslation();
    const label = getRoundName(round.round_name, t);
    const glyph = groupGlyph(round.round_name) ?? '';
    return (
        <TvCard
            state={state}
            header={(
                <>
                    {glyph && (
                        <span aria-hidden className={cn(
                            'pb-display',
                            size === 'lg' ? 'text-[38px]' : 'text-[24px]',
                            'leading-none',
                            '[color:var(--pb-tone)]',
                        )}>
                            {glyph}
                        </span>
                    )}
                    <p className={cn('truncate font-extrabold text-(--pb-text)', size === 'lg' ? 'text-[20px]' : 'text-[15px]', 'leading-tight')}>{label}</p>
                    <span className={cn(
                        'ms-auto flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-black [color:var(--pb-tone)]',
                        // 'next' is the one state with a background on its pill; every other
                        // state's colour comes from the card's own `--pb-tone` alone.
                        state === 'next' && 'bg-(--pb-accent-bg)',
                    )}>
                        {state === 'live' && <span className="pb-live-dot h-1.5 w-1.5 rounded-full bg-(--pb-live)" />}
                        {roundStateLabel(state, t)}
                    </span>
                </>
            )}
        >
            <div className={cn(twoColumns ? 'grid grid-cols-2' : 'flex flex-col', size === 'lg' ? 'gap-2.5 p-3' : 'gap-1.5 p-2')}>
                {round.matches.map(m => <GameLine key={m.id} match={m} size={size} />)}
            </div>
            {/* Wraps rather than truncating: it is a list of player names, and a name is never cut. */}
            {note && <p className="shrink-0 px-3 pb-1.5 text-[11px] font-bold leading-snug text-(--pb-text-muted)">{note}</p>}
        </TvCard>
    );
}
