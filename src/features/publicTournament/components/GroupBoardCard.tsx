import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PairChip } from './PairChip';
import { FitText } from './FitText';
import { groupGlyph, localizeGroupName, playerFullName } from '../utils';
import type { PublicGroup, PublicPlayer, PublicStanding } from '../types';

type GroupBoardCardProps = { group: PublicGroup; accentClass?: string; qualifyCount?: number };

function standingPlayers(s: PublicStanding): PublicPlayer[] {
    return [s.player_1, s.player_2].filter((p): p is PublicPlayer => Boolean(p));
}

/** One line per player; solo/team entries fall back to a single line. */
function standingNameLines(s: PublicStanding): string[] {
    const players = standingPlayers(s);
    if (players.length > 0) return players.map(playerFullName);
    const label = s.player_name ?? s.team_name ?? '';
    return label ? [label] : [];
}

/** Joined form, used only as a stable React key — display is line-per-player. */
function standingLabel(s: PublicStanding): string {
    return standingNameLines(s).join(' / ');
}

/**
 * One group's standings, filling its whole card.
 *
 * The games moved to the «משחקים» lanes, and the space they used to take is spent on type size:
 * this table is read from across a hall, and the previous version's paged games zone meant a
 * viewer could wait ~40s to see one particular game while the table stayed small.
 */
export function GroupBoardCard({ group, accentClass, qualifyCount }: GroupBoardCardProps): React.ReactElement {
    const { t } = useTranslation();
    const glyph = groupGlyph(group.group_name);
    const standings = group.standings;
    const playedCount = group.matches.filter(m => m.sets.length > 0 || m.status === 'walkover').length;
    // Past four pairs, a fifth/sixth row no longer fits this card's fixed share of the 1600×900
    // canvas at full size — there is no scroll on an unattended screen, so an unshrunk row would
    // silently clip off the bottom instead. `cn()`'s conflict resolution (twMerge) means every
    // `dense && '…'` class below only ever overrides its non-dense sibling when dense is true; at
    // four pairs or fewer, `dense` is false and each className resolves to exactly the same string
    // as if the `dense && '…'` clause were never there.
    const dense = standings.length > 4;

    return (
        <div className={cn(
            'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-(--pb-border) border-t-[3px] bg-(--pb-card) [border-top-color:var(--pb-ga,var(--pb-highlight))]',
            accentClass,
        )}>
            <header className="flex shrink-0 items-center gap-2.5 border-b border-(--pb-border) bg-(--pb-card-header) px-4 py-1.5">
                {glyph && (
                    <span aria-hidden className="pb-display text-[26px] leading-none [color:var(--pb-ga,var(--pb-highlight))]">
                        {glyph}
                    </span>
                )}
                <p className="truncate text-[15px] font-extrabold text-(--pb-text)">{localizeGroupName(group.group_name, t)}</p>
                <span className="ms-auto shrink-0 rounded-md bg-(--pb-card-raised) px-2 py-0.5 text-[11px] font-bold text-(--pb-text-muted)">
                    <b className="text-(--pb-text)">{playedCount}/{group.matches.length}</b> {t('public_bracket.group_matches', 'Matches')}
                </span>
            </header>

            {/* The columns are up from the draw onward, reading 0 until they fill in. Held back
                until the first result, the board was emptier before the tournament than during
                it — the opposite of what a hall arriving to find its group expects, and a card
                that then changed shape under them the moment a score landed.

                Column widths are pared to what the numbers actually need, and the gap with them:
                on the 4-across TV grid the card is ~369px, and every pixel of chrome here is
                subtracted straight out of the name. At the previous widths a long pair name
                bottomed out at FitText's floor and then clipped mid-word — the one thing this
                screen must never do. `w-14` stays as-is because the «משחקונים» label, not the
                score under it, is what sets that column's floor. */}
            <div className="flex shrink-0 items-center gap-1.5 px-6 pt-1 text-[10px] font-black uppercase tracking-wider text-(--pb-text-faint)">
                <span className="w-6 shrink-0" />
                <span className="flex-1" />
                <span className="w-6 shrink-0 text-center">{t('public_bracket.standings_headers.mp', 'MP')}</span>
                <span className="w-6 shrink-0 text-center">{t('public_bracket.col_wins', 'W')}</span>
                <span className="w-14 shrink-0 text-center">{t('public_bracket.standings_headers.games', 'Games')}</span>
                <span className="w-8 shrink-0 text-center">+/-</span>
            </div>

            {/* A tight cluster seated directly under the column header, NOT justify-evenly (which
                spread four rows across the whole card and read as four islands) and NOT
                justify-center (which stranded the header 176px above the first row, because the
                header sits outside this box and only the rows got centred). Spare height collects
                at the bottom, where it reads as room for more rather than as a hole in the table —
                and if a group ever outgrows the card it now clips only the last row, instead of
                taking the leader's row off the top at the same time. */}
            <div
                data-testid="standings-list"
                className={cn(
                    'flex min-h-0 flex-1 flex-col justify-start gap-1 px-3 pb-2',
                    // Six dense rows plus the cutoff line need 261px against the 241px this box
                    // gets in a 3-across grid (5+ groups halve the card's height), so dense also
                    // buys height back from the gaps — measured, not guessed.
                    dense && 'gap-0.5',
                )}
            >
                {standings.map((s, i) => {
                    const dq = s.is_disqualified === true;
                    const qualifies = qualifyCount != null && i < qualifyCount && !dq;
                    const diff = s.games_won - s.games_lost;
                    const played = s.wins + s.losses;
                    const nameLines = standingNameLines(s);
                    return (
                        <React.Fragment key={`${s.position}-${standingLabel(s) || i}`}>
                            <div className={cn(
                                'flex items-center gap-1.5 rounded-xl px-3 py-1',
                                dense && 'py-px',
                                qualifies && 'bg-(--pb-winner-bg)',
                                dq && 'opacity-60',
                            )}>
                                <span
                                    aria-hidden
                                    className={cn(
                                        'w-6 shrink-0 text-center text-2xl font-black',
                                        dense && 'text-xl',
                                        // `leading-none` must land AFTER the dense size override, not
                                        // before: Tailwind's named text-size utilities (text-xl,
                                        // text-2xl, …) bundle their own default line-height, which
                                        // wins over an EARLIER `leading-none` in the real cascade
                                        // regardless of class-attribute order. twMerge mirrors that —
                                        // putting `leading-none` first here got it silently dropped by
                                        // twMerge whenever `dense` added `text-xl` after it, and the
                                        // real browser would have discarded it the same way.
                                        'leading-none',
                                        qualifies ? 'text-(--pb-highlight)' : 'text-(--pb-text-faint)',
                                    )}
                                >
                                    {dq ? '—' : i + 1}
                                </span>
                                <PairChip pair={s} className="h-5 w-5 rounded-md text-[9px]" />
                                <span className="flex min-w-0 flex-1 flex-col justify-center">
                                    {/* One player per line, full name always — FitText shrinks a
                                        genuinely long single name instead of ellipsizing it. */}
                                    {/* Keyed by index too, not by the line alone: `playerFullName`
                                        returns '' when both name fields are null (the schema allows
                                        it for guests), so a pair of two unnamed guests would give
                                        two children the same '' key. */}
                                    {nameLines.map((line, li) => (
                                        <span key={`${li}-${line}`} className="flex min-w-0 items-center gap-1">
                                            {/* The badge rides the first name line instead of taking
                                                one of its own. On its own line it made a disqualified
                                                row a whole line taller than every other row, and in a
                                                six-pair group that pushed the last row off the bottom
                                                of the card — on a screen with no scrollbar and nobody
                                                watching it. */}
                                            {dq && li === 0 && (
                                                <span className="shrink-0 rounded px-1 py-px text-[8px] font-black uppercase tracking-widest text-(--pb-text-faint) ring-1 ring-(--pb-border)">
                                                    {t('public_bracket.disqualified', 'Disqualified')}
                                                </span>
                                            )}
                                            <FitText
                                                text={line}
                                                maxPx={dense ? 12 : 15}
                                                minPx={9}
                                                className={cn(
                                                    'min-w-0 flex-1 font-extrabold leading-tight',
                                                    dq ? 'text-(--pb-text-muted) line-through' : 'text-(--pb-text)',
                                                )}
                                            />
                                        </span>
                                    ))}
                                </span>
                                <span className={cn(
                                    'w-6 shrink-0 text-center text-[15px] font-extrabold tabular-nums text-(--pb-text-muted)',
                                    dense && 'text-[13px]',
                                )}>
                                    {dq ? '—' : played}
                                </span>
                                <span className={cn(
                                    'w-6 shrink-0 text-center text-[15px] font-extrabold tabular-nums text-(--pb-text)',
                                    dense && 'text-[13px]',
                                )}>
                                    {dq ? '—' : s.wins}
                                </span>
                                {/* Won/lost as separate elements inside dir="ltr": a joined
                                    "20-10" would mirror in RTL — the dash is a bidi joiner,
                                    same reason the set scores are never assembled into a
                                    string. Own games always green, opponents' always red. */}
                                <span
                                    dir="ltr"
                                    className={cn(
                                        'flex w-14 shrink-0 items-center justify-center gap-px text-[15px] font-extrabold tabular-nums',
                                        dense && 'text-[13px]',
                                    )}
                                >
                                    {dq ? (
                                        <span className="text-(--pb-text-muted)">—</span>
                                    ) : (
                                        <>
                                            <span className="text-(--pb-won)">{s.games_won}</span>
                                            <span className="font-normal text-(--pb-text-faint)">–</span>
                                            <span className="text-(--pb-lost)">{s.games_lost}</span>
                                        </>
                                    )}
                                </span>
                                <span
                                    dir="ltr"
                                    className={cn(
                                        'w-8 shrink-0 text-center text-[13px] font-extrabold tabular-nums',
                                        dense && 'text-[11px]',
                                        dq || diff === 0 ? 'text-(--pb-text-muted)'
                                            : diff > 0 ? 'text-(--pb-won)' : 'text-(--pb-lost)',
                                    )}
                                >
                                    {dq ? '—' : diff > 0 ? `+${diff}` : diff}
                                </span>
                            </div>
                            {/* The cutoff line belongs AT the cutoff — between the last qualifying
                                row and the first that misses out — not under the whole table. */}
                            {qualifyCount != null && i === qualifyCount - 1 && i < standings.length - 1 && (
                                <p className={cn("flex items-center gap-2 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-(--pb-highlight) before:h-px before:flex-1 before:border-t before:border-dashed before:border-(--pb-highlight)/50 before:content-[''] after:h-px after:flex-1 after:border-t after:border-dashed after:border-(--pb-highlight)/50 after:content-['']", dense && 'py-0')}>
                                    {t('public_bracket.top_qualify', { count: qualifyCount, defaultValue: `Top ${qualifyCount} advance` })}
                                </p>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
