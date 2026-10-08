import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { FitText } from './FitText';
import { RatingChip } from './RatingChip';
import { GROUP_ACCENTS } from './GroupsView';
import { TvCard, TvCardColumns } from './TvCard';
import { RankNumeral } from './RankNumeral';
import { playerFullName } from '../utils';
import type { PublicStanding } from '../types';

type AmericanoLeaderboardTVProps = {
    standings: PublicStanding[];
    /**
     * Mark where the final round would seat each player — only while the evening has a final
     * round that is not drawn yet. Once drawn, the Final tab shows the real seating.
     */
    finalBands: boolean;
};

/** One court of the final round seats four players; the table splits its columns on that step. */
const BAND = 4;

/**
 * Row index → the court whose band line goes above it: the first row the API seats on each court
 * (`projected_final_court`, rally-api 2026-10-04). Empty unless `finalBands` and the API says who
 * sits where — an older API sends no courts, and the table then shows no bands rather than guessed
 * ones.
 */
function finalBandStarts(standings: PublicStanding[], finalBands: boolean): Map<number, number> {
    const starts = new Map<number, number>();
    if (!finalBands) return starts;
    const seen = new Set<number>();
    standings.forEach((s, i) => {
        const court = s.projected_final_court;
        if (court == null || seen.has(court)) return;
        seen.add(court);
        starts.set(i, court);
    });
    return starts;
}

/**
 * The venue screen's table for an Americano, in the group card's frame, rank numerals and column
 * labels (TvCard, RankNumeral): the numbers tight beside the name. Past ten players the
 * table splits into two cards side by side, so sixteen players read from across a hall instead of
 * one thin list stretched over the whole screen.
 */
export function AmericanoLeaderboardTV({ standings, finalBands }: AmericanoLeaderboardTVProps): React.ReactElement {
    const { t } = useTranslation();
    // Same rule as the group card: until a game is played the order is registration order, so
    // nothing is highlighted as leading.
    const ranked = standings.some(s => (s.matches_played ?? 0) > 0);
    const columns = splitColumns(standings);
    // Rows keep one height and the cards sit centred: four players are four rows in the middle of
    // the screen, not four rows stretched over all of it. Past nine rows a column goes denser so
    // twenty-odd players still fit the canvas.
    const dense = Math.max(...columns.map(c => c.rows.length)) > 9;
    const bandStarts = finalBandStarts(standings, finalBands);
    const showBands = bandStarts.size > 0;

    return (
        <div className={cn('grid h-full content-center gap-5 px-8 pb-5', columns.length > 1 ? 'grid-cols-2' : 'mx-auto w-full max-w-3xl grid-cols-1')}>
            {columns.map(col => (
                <TvCard
                    key={col.from}
                    header={(
                        <p className="truncate text-[15px] font-extrabold text-(--pb-text)">
                            {t('public_bracket.places_range', { from: col.from, to: col.to, defaultValue: 'Places {{from}}–{{to}}' })}
                        </p>
                    )}
                >
                    <TvCardColumns>
                        <span className="w-9 shrink-0" />
                        <span className="flex-1" />
                        <span className="w-9 shrink-0 text-center">{t('public_bracket.standings_headers.mp', 'MP')}</span>
                        <span className="w-7 shrink-0 text-center">{t('public_bracket.col_wins', 'W')}</span>
                        <span className="w-7 shrink-0 text-center">{t('public_bracket.col_ties', 'T')}</span>
                        <span className="w-7 shrink-0 text-center">{t('public_bracket.col_losses', 'L')}</span>
                        <span className="w-16 shrink-0 text-center">{t('public_bracket.col_points', 'Pts')}</span>
                        <span className="w-11 shrink-0 text-center">+/-</span>
                    </TvCardColumns>
                    <div className="flex flex-col gap-0.5 px-3 pb-2">
                        {col.rows.map((s, i) => {
                            const index = col.from - 1 + i;
                            const bandCourt = bandStarts.get(index);
                            // A disqualified row already says why it is out. A row with no games
                            // yet reads the same as "not drawn yet" (controller ruling, finding
                            // I-1), so only a row that has actually played and was left off says
                            // so while the bands are up.
                            const notInFinal = showBands && s.projected_final_court == null && !s.is_disqualified && (s.matches_played ?? 0) > 0;
                            return (
                                <React.Fragment key={`${s.position}-${s.player_1?.id ?? i}`}>
                                    {bandCourt != null && <BandLine court={bandCourt} />}
                                    <Row standing={s} place={index + 1} ranked={ranked} dense={dense} notInFinal={notInFinal} />
                                </React.Fragment>
                            );
                        })}
                    </div>
                </TvCard>
            ))}
        </div>
    );
}

/** A row's own small badge — "Not in the final" and "Disqualified" repeated this one class string. */
function RowBadge({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-(--pb-text-faint) ring-1 ring-(--pb-border)">
            {children}
        </span>
    );
}

function BandLine({ court }: { court: number }): React.ReactElement {
    const { t } = useTranslation();
    return (
        <p className={cn(
            "flex shrink-0 items-center gap-2 px-3 pt-1 text-[12px] font-black uppercase tracking-wider [color:var(--pb-ga)] after:h-px after:flex-1 after:border-t after:border-dashed after:[border-color:var(--pb-ga)] after:opacity-60 after:content-['']",
            GROUP_ACCENTS[(court - 1) % GROUP_ACCENTS.length],
        )}>
            {t('public_bracket.final_court_band', { num: court, defaultValue: 'Final · court {{num}}' })}
        </p>
    );
}

function Row({ standing: s, place, ranked, dense, notInFinal }: {
    standing: PublicStanding;
    place: number;
    ranked: boolean;
    dense: boolean;
    notInFinal: boolean;
}): React.ReactElement {
    const { t } = useTranslation();
    const dq = s.is_disqualified === true;
    const diff = s.points_diff ?? 0;
    const leader = ranked && !dq && place === 1;
    const podium = ranked && !dq && place <= 3;
    const name = s.player_1 ? playerFullName(s.player_1) : (s.player_name ?? '');
    return (
        <div className={cn(
            // gap-1.5, as TvCardColumns: the column labels have to sit over these cells.
            'flex shrink-0 items-center gap-1.5 rounded-xl px-3',
            dense ? 'min-h-10' : 'min-h-[54px]',
            // The group card's qualifier-row treatment: the tint, and no ring of its own.
            leader && 'bg-(--pb-winner-bg)',
            dq && 'opacity-60',
        )}>
            <RankNumeral widthClass="w-9" dense={dense} highlight={podium}>
                {dq ? '—' : place}
            </RankNumeral>
            <span className="flex min-w-0 flex-1 items-center gap-2">
                <FitText
                    text={name}
                    maxPx={dense ? 17 : 20}
                    minPx={11}
                    wrapAtFloor
                    className={cn('min-w-0 font-extrabold', dq ? 'text-(--pb-text-muted) line-through' : 'text-(--pb-text)')}
                />
                <RatingChip rating={s.player_1?.skill_level} />
                {notInFinal && <RowBadge>{t('public_bracket.not_in_final', 'Not in the final')}</RowBadge>}
                {/* Same badge as the phone table and the group card: a struck-through name alone
                    does not say why. */}
                {dq && <RowBadge>{t('public_bracket.disqualified', 'Disqualified')}</RowBadge>}
            </span>
            <span className="w-9 shrink-0 text-center text-[16px] font-bold tabular-nums text-(--pb-text-muted)">{s.matches_played ?? 0}</span>
            <span className="w-7 shrink-0 text-center text-[16px] font-extrabold tabular-nums text-(--pb-text)">{s.wins}</span>
            <span className="w-7 shrink-0 text-center text-[16px] font-bold tabular-nums text-(--pb-text-muted)">{s.ties ?? 0}</span>
            <span className="w-7 shrink-0 text-center text-[16px] font-bold tabular-nums text-(--pb-text-muted)">{s.losses}</span>
            <span className={cn(
                'w-16 shrink-0 rounded-lg py-0.5 text-center font-black tabular-nums',
                dense ? 'text-[20px]' : 'text-[24px]',
                leader ? 'text-(--pb-highlight)' : 'bg-(--pb-card-raised) text-(--pb-text)',
            )}>
                {s.points ?? 0}
            </span>
            <span dir="ltr" className={cn(
                'w-11 shrink-0 text-center text-[15px] font-extrabold tabular-nums',
                diff === 0 ? 'text-(--pb-text-muted)' : diff > 0 ? 'text-(--pb-won)' : 'text-(--pb-lost)',
            )}>
                {diff > 0 ? `+${diff}` : diff}
            </span>
        </div>
    );
}

type Column = { from: number; to: number; rows: PublicStanding[] };

/** One card up to ten players; past that two, split on a multiple of four so no final group straddles them. */
function splitColumns(standings: PublicStanding[]): Column[] {
    if (standings.length <= 10) return [{ from: 1, to: Math.max(standings.length, 1), rows: standings }];
    const first = Math.ceil(standings.length / 2 / BAND) * BAND;
    return [
        { from: 1, to: first, rows: standings.slice(0, first) },
        { from: first + 1, to: standings.length, rows: standings.slice(first) },
    ];
}
