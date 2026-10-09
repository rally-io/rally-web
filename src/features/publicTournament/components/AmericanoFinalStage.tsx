import React from 'react';
import { useTranslation } from 'react-i18next';
import { Medal, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FitText } from './FitText';
import { MatchCard } from './MatchCard';
import { GameLine } from './GameLine';
import { GROUP_ACCENTS } from './GroupsView';
import { courtTier, playerFullName, roundStateOf } from '../utils';
import type { CourtTier } from '../utils';
import type { PublicAmericanoFinalSection, PublicMatch, PublicRound, PublicStanding } from '../types';

/** `courtTier`'s three buckets, named for this stage's own three layouts (2026-10-04 review). */
const FINAL_LAYOUT: Record<CourtTier, 'cards' | 'lines' | 'grid'> = { few: 'cards', several: 'lines', many: 'grid' };

type AmericanoFinalStageProps = {
    rounds: PublicRound[];
    standings: PublicStanding[];
    /** Phone: one column. TV: court 1 centre stage, the other courts beside it. */
    compact: boolean;
    roundNote?: (round: PublicRound) => string | null;
    /** The final's sections (rally-api 2026-10-08): each court's name and whether it counts. None = places only. */
    sections?: PublicAmericanoFinalSection[];
};

/**
 * An Americano's final round, staged the way the knockout final is on the venue screen
 * (BracketTreeTV's centre column): the trophy, «הגמר», the top court as the glowing hero card.
 * The other courts sit beside it, each labelled with its section (rally-api 2026-10-08): a named
 * section shows its name ("Plate"), an unnamed one the places in the table its four players came
 * from ("ranked 5–8"). Each court decides its own four places, the winning pair above the losing
 * pair, and a court whose section doesn't count says so. Court 1 keeps its places: the title
 * already says it is the Final.
 *
 * Under it, the evening's leader while the final is on, and a podium once every final game is in.
 * Both read the table the API sends, so they follow whichever rule the API ranks by.
 */
export function AmericanoFinalStage({ rounds, standings, compact, roundNote, sections = [] }: AmericanoFinalStageProps): React.ReactElement {
    const { t } = useTranslation();
    const round = rounds[0];
    // A court's section, by its seat: group k is final court k + 1.
    const sectionOf = (group: number) => sections.find(s => s.courts.includes(group + 1));
    // Each game's group is its seat in the round (0-based), never its index in the list: a
    // cancelled game is dropped before it gets here (toLiveBoard), and the courts after it must keep
    // the places they were seated with. An API without seats falls back to the order it sends,
    // which is seating order.
    const seated = (round?.matches ?? [])
        .map((match, i) => ({ match, group: (match.position_in_round ?? i + 1) - 1 }))
        .sort((a, b) => a.group - b.group);
    const matches = seated.map(s => s.match);
    // Each player's place in the table when the final was drawn, read off the seating: group k
    // plays places 4k+1 & 4k+4 against 4k+2 & 4k+3 (rally-api engine.final_round_courts). Not the
    // live table — once final games land it reorders, and "#8" on the top court would read as a
    // mistake. (A manager's swap inside the final would make this stale; the API could send seeds.)
    const seeds = new Map<string, number>();
    seated.forEach(({ match: m, group }) => {
        const base = 4 * group;
        const slots: [string | undefined, number][] = [
            [m.team_a?.player_1?.id, base + 1], [m.team_a?.player_2?.id, base + 4],
            [m.team_b?.player_1?.id, base + 2], [m.team_b?.player_2?.id, base + 3],
        ];
        slots.forEach(([id, seed]) => { if (id) seeds.set(id, seed); });
    });
    const done = roundStateOf(matches) === 'done';
    const contenders = standings.filter(s => !s.is_disqualified && s.player_1);
    const note = round && roundNote ? roundNote(round) : null;
    // The lowest seat still on the board is the hero, under its own label: with court 1 cancelled,
    // court 2's game takes the stage as "ranked 5–8", or under its section's name when it has one.
    const [hero, ...rest] = seated;

    const title = (
        <div className="flex items-center justify-center gap-3">
            <Trophy size={compact ? 22 : 30} className="text-(--pb-highlight)" />
            {/* leading-none after the size: twMerge drops a line-height that precedes a font size. */}
            <h2 className={cn('pb-display text-(--pb-highlight)', compact ? 'text-[34px]' : 'text-[52px]', 'leading-none')}>
                {t('public_bracket.the_final', 'The Final')}
            </h2>
            <Trophy size={compact ? 22 : 30} className="text-(--pb-highlight)" />
        </div>
    );

    const outcome = done
        ? <Podium rows={contenders.slice(0, 3)} compact={compact} />
        : <LeaderBar row={contenders[0]} compact={compact} />;

    if (compact) {
        return (
            <div className="flex flex-col gap-4 px-4 pb-8">
                {title}
                {outcome}
                {note && <p data-testid="round-note" className="text-xs font-bold text-(--pb-text-muted)">{note}</p>}
                {seated.map(({ match, group }, k) => (
                    <CourtBlock key={match.id} match={match} group={group} seeds={seeds} section={sectionOf(group)} variant={k === 0 ? 'hero' : 'default'} />
                ))}
            </div>
        );
    }

    // Every court on screen, up to the API's 16 (owner 2026-10-04). The title and the leader bar
    // (or podium) are fixed rows; the courts take what is left. Up to four courts: the hero and a
    // row of cards. Five to eight: the hero and four-across rows of game lines. Nine to sixteen: no
    // hero, every court a game line in one four-across grid. The four-court final keeps today's
    // even split of the free height (`justify-evenly`); the denser tiers group their courts
    // around the middle instead (`justify-center`).
    const courts = FINAL_LAYOUT[courtTier(seated.length)];
    return (
        <div className="flex h-full min-h-0 flex-col items-center gap-3 px-8 pb-4">
            <div className="shrink-0">{title}</div>
            <div className={cn('flex min-h-0 w-full flex-1 flex-col items-center gap-4', courts === 'cards' ? 'justify-evenly' : 'justify-center')}>
                {courts !== 'grid' && hero && (
                    <div className="w-[620px] shrink-0">
                        <CourtBlock match={hero.match} group={hero.group} seeds={seeds} section={sectionOf(hero.group)} variant="stage" />
                    </div>
                )}
                {courts === 'cards' && rest.length > 0 && (
                    <div className={cn('grid w-full shrink-0 gap-4', rest.length >= 3 ? 'grid-cols-3' : rest.length === 2 ? 'max-w-5xl grid-cols-2' : 'max-w-md grid-cols-1')}>
                        {rest.map(({ match, group }) => (
                            <CourtBlock key={match.id} match={match} group={group} seeds={seeds} section={sectionOf(group)} variant="default" />
                        ))}
                    </div>
                )}
                {courts !== 'cards' && (
                    <div className="grid w-full shrink-0 grid-cols-4 gap-3">
                        {(courts === 'grid' ? seated : rest).map(({ match, group }) => (
                            <CourtBlock key={match.id} match={match} group={group} seeds={seeds} section={sectionOf(group)} variant="line" />
                        ))}
                    </div>
                )}
            </div>
            {note && <p data-testid="round-note" className="shrink-0 text-center text-sm font-bold text-(--pb-text-muted)">{note}</p>}
            <div className="w-full max-w-3xl shrink-0">{outcome}</div>
        </div>
    );
}

function CourtBlock({ match, group, seeds, section, variant }: {
    match: PublicMatch;
    /** 0-based seat: the final seats group k (places 4k+1…4k+4 at the draw) on seat k+1. */
    group: number;
    seeds: ReadonlyMap<string, number>;
    /** `line`: the rounds board's compact game line, for finals too wide for cards. It shows no seed badges; the label carries the places, or the section's name. */
    variant: 'stage' | 'hero' | 'default' | 'line';
    /** This court's section; undefined from an API before sections, or for a court no section seats. */
    section?: PublicAmericanoFinalSection;
}): React.ReactElement {
    const { t } = useTranslation();
    const from = group * 4 + 1;
    const places = t('public_bracket.seeded_range', { from, to: from + 3, defaultValue: 'Ranked {{from}}–{{to}}' });
    // Court 1 keeps its places: the stage's title already says it is the Final.
    const title = group > 0 && section?.name ? section.name : places;
    const friendly = section && !section.counts ? t('public_bracket.final_friendly', "Doesn't count") : null;
    return (
        <div className={cn('flex flex-col gap-1.5', GROUP_ACCENTS[group % GROUP_ACCENTS.length])}>
            <p className={cn(
                'flex items-center gap-2 font-black uppercase tracking-wider [color:var(--pb-ga)]',
                variant === 'stage' ? 'text-[15px]' : 'text-[11px]',
            )}>
                <span className="h-2 w-2 rounded-full [background:var(--pb-ga)]" />
                {[match.court_name, title, friendly].filter(Boolean).join(' · ')}
            </p>
            {variant === 'line' ? <GameLine match={match} size="sm" /> : <MatchCard match={match} variant={variant} seeds={seeds} />}
        </div>
    );
}

function LeaderBar({ row, compact }: { row: PublicStanding | undefined; compact: boolean }): React.ReactElement | null {
    const { t } = useTranslation();
    if (!row?.player_1) return null;
    return (
        <div className="flex items-center justify-center gap-3 rounded-full border border-(--pb-highlight)/50 bg-(--pb-winner-bg) px-5 py-2">
            <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.25em] text-(--pb-text-faint)">
                {t('public_bracket.evening_leader', 'Leading the evening')}
            </span>
            <FitText text={playerFullName(row.player_1)} maxPx={compact ? 15 : 20} minPx={10} className="min-w-0 font-black text-(--pb-highlight)" wrapAtFloor />
            <span className="shrink-0 rounded-md bg-(--pb-card-raised) px-2 py-0.5 text-sm font-black tabular-nums text-(--pb-text)">
                {row.points ?? 0} {t('public_bracket.col_points', 'Pts')}
            </span>
        </div>
    );
}

/** Second and third place: per-skin tokens (themes.css), each at least 3:1 on the card. */
const MEDAL_TINT: Record<2 | 3, string> = { 2: 'text-(--pb-medal-silver)', 3: 'text-(--pb-medal-bronze)' };

function Podium({ rows, compact }: { rows: PublicStanding[]; compact: boolean }): React.ReactElement {
    const { t } = useTranslation();
    // 2 · 1 · 3 — the champion in the middle, raised.
    const order = [rows[1], rows[0], rows[2]].map((r, i) => ({ r, place: [2, 1, 3][i] }));
    return (
        <div className="flex flex-col items-center gap-1.5">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-(--pb-highlight)">
                {t('public_bracket.evening_champion', 'Champion of the evening')}
            </p>
            <div className="flex w-full items-end justify-center gap-3">
                {order.map(({ r, place }) => r?.player_1 ? (
                    <div
                        key={place}
                        className={cn(
                            'flex min-w-0 items-center gap-2 rounded-2xl border px-3',
                            compact && 'flex-col gap-1',
                            place === 1
                                ? 'flex-[1.3] -translate-y-1 border-(--pb-highlight)/60 bg-(--pb-winner-bg) py-2.5 shadow-[0_0_24px_var(--pb-glow)]'
                                : 'flex-1 border-(--pb-border) bg-(--pb-card) py-1.5',
                        )}
                    >
                        {/* The champion's trophy is the highlight, like every other trophy on the board. */}
                        {place === 1
                            ? <Trophy size={compact ? 20 : 26} className="shrink-0 text-(--pb-highlight)" />
                            : <Medal size={compact ? 16 : 20} className={cn('shrink-0', MEDAL_TINT[place === 2 ? 2 : 3])} />}
                        <FitText
                            text={playerFullName(r.player_1)}
                            maxPx={place === 1 ? (compact ? 16 : 22) : (compact ? 13 : 16)}
                            minPx={10}
                            wrapAtFloor
                            className={cn('min-w-0 flex-1 font-black', compact && 'w-full text-center', place === 1 ? 'text-(--pb-highlight)' : 'text-(--pb-text)')}
                        />
                        <span className="shrink-0 text-xs font-black tabular-nums text-(--pb-text-muted)">
                            {r.points ?? 0} {t('public_bracket.col_points', 'Pts')}
                        </span>
                    </div>
                ) : null)}
            </div>
        </div>
    );
}
