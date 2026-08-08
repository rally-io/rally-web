import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { GameFaceoffRow } from './GameFaceoffRow';
import { RatingChip } from './RatingChip';
import { PAGE_INTERVAL_MS, useAutoPages } from '../hooks/useAutoPages';
import { activeMatchIndex, groupGlyph, localizeGroupName, playerFullName } from '../utils';
import type { PublicGroup, PublicPlayer, PublicStanding } from '../types';

type GroupBoardCardProps = { group: PublicGroup; accentClass?: string; qualifyCount?: number };

function standingPlayers(s: PublicStanding): PublicPlayer[] {
    return [s.player_1, s.player_2].filter((p): p is PublicPlayer => Boolean(p));
}

/** One standings line: place, the pair with each player's rating, wins, game difference. */
function StandingRow({ standing, place, qualifies, showStats, dense }: {
    standing: PublicStanding;
    place: number;
    qualifies: boolean;
    /** Before the first result every row reads 0 — leave the columns blank instead. */
    showStats: boolean;
    dense: boolean;
}): React.ReactElement {
    const players = standingPlayers(standing);
    const diff = standing.games_won - standing.games_lost;
    return (
        <div className={cn(
            'flex items-center gap-2.5 rounded-xl px-2.5',
            dense ? 'min-h-7 py-0.5' : 'min-h-9 py-0.5',
            qualifies && 'bg-(--pb-winner-bg)',
        )}>
            <span
                aria-hidden
                className={cn(
                    'pb-display w-5 shrink-0 text-center leading-none',
                    dense ? 'text-xl' : 'text-2xl',
                    qualifies ? 'text-(--pb-highlight)' : 'text-(--pb-text-faint)',
                )}
            >
                {place}
            </span>
            <span className={cn('min-w-0 flex-1 truncate font-extrabold text-(--pb-text)', dense ? 'text-[13px]' : 'text-[15px]')}>
                {players.length === 0
                    ? standing.player_name ?? standing.team_name ?? ''
                    : players.map((p, i) => (
                        <React.Fragment key={p.id}>
                            {i > 0 && <span className="font-semibold text-(--pb-text-faint)"> / </span>}
                            {playerFullName(p)}
                            {!dense && <RatingChip rating={p.skill_level} className="ms-1" />}
                        </React.Fragment>
                    ))}
            </span>
            <span className={cn('w-8 shrink-0 text-center font-extrabold tabular-nums text-(--pb-text)', dense ? 'text-sm' : 'text-base')}>
                {showStats ? standing.wins : ''}
            </span>
            <span className={cn(
                'w-9 shrink-0 text-center font-extrabold tabular-nums',
                dense ? 'text-[13px]' : 'text-sm',
                diff > 0 ? 'text-(--pb-highlight)' : 'text-(--pb-text-muted)',
            )}>
                {showStats ? (diff > 0 ? `+${diff}` : diff) : ''}
            </span>
        </div>
    );
}

/**
 * One group as a board: the standings table pinned on top — the thing a player reads in a glance —
 * and the games listed below it.
 *
 * Only the games zone pages. The standings never move, so "where am I" is always answerable on an
 * unattended screen; whatever games don't fit rotate in beneath them.
 */
export function GroupBoardCard({ group, accentClass, qualifyCount }: GroupBoardCardProps): React.ReactElement {
    const { t } = useTranslation();
    const glyph = groupGlyph(group.group_name);
    const matches = group.matches;
    const standings = group.standings;
    const dense = standings.length > 4;
    const hasResults = matches.some(m => m.sets.length > 0 || m.status === 'walkover');
    // Re-measure when something that changes a row's height changes: set count widens a row's
    // score columns, and status flips the live treatment on and off.
    const signature = matches.map(m => `${m.id}:${m.status}:${m.sets.length}`).join('|');
    const { viewportRef, stackRef, pages, pageIndex } = useAutoPages(signature, activeMatchIndex(matches));

    const pageCount = pages?.length ?? 1;
    const isPaged = pageCount > 1;
    // No pages yet = the measuring frame: render every row so it can be measured.
    const page = pages?.[pageIndex] ?? matches.map((_, i) => i);
    const visible = page.map(i => matches[i]).filter(Boolean);

    return (
        <div className={cn(
            'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-(--pb-border) border-t-[3px] bg-(--pb-card) [border-top-color:var(--pb-ga,var(--pb-highlight))]',
            accentClass,
        )}>
            <header className="flex shrink-0 items-center gap-2.5 border-b border-(--pb-border) bg-(--pb-card-header) px-4 py-1.5">
                {glyph ? (
                    <span aria-hidden className="pb-display text-[26px] leading-none [color:var(--pb-ga,var(--pb-highlight))]">
                        {glyph}
                    </span>
                ) : null}
                <p className="truncate text-[15px] font-extrabold text-(--pb-text)">{localizeGroupName(group.group_name, t)}</p>
            </header>

            <div className="shrink-0 px-1.5 pt-1">
                {hasResults && (
                    <div className="flex items-center gap-2.5 px-2.5 pb-0.5 text-[9px] font-black uppercase tracking-wider text-(--pb-text-faint)">
                        <span className="w-5 shrink-0" />
                        <span className="flex-1" />
                        <span className="w-8 shrink-0 text-center">{t('public_bracket.col_wins', 'W')}</span>
                        <span className="w-9 shrink-0 text-center">+/-</span>
                    </div>
                )}
                {standings.map((s, i) => (
                    <StandingRow
                        key={`${s.position}-${playerFullName(s.player_1) || s.team_name || i}`}
                        standing={s}
                        place={i + 1}
                        qualifies={hasResults && qualifyCount != null && i < qualifyCount}
                        showStats={hasResults}
                        dense={dense}
                    />
                ))}
                {qualifyCount != null && standings.length > qualifyCount && (
                    <p className="flex items-center gap-2 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-(--pb-highlight) before:h-px before:flex-1 before:border-t before:border-dashed before:border-(--pb-highlight)/50 before:content-[''] after:h-px after:flex-1 after:border-t after:border-dashed after:border-(--pb-highlight)/50 after:content-['']">
                        {t('public_bracket.top_qualify', { count: qualifyCount, defaultValue: `Top ${qualifyCount} advance` })}
                    </p>
                )}
            </div>

            <div ref={viewportRef} className="min-h-0 flex-1 overflow-hidden">
                <div
                    ref={stackRef}
                    key={pageIndex}
                    className={cn('flex h-full flex-col justify-evenly gap-1 px-1.5 pb-1.5', isPaged && 'pb-page-in')}
                >
                    {/* Every row carries its own separator and padding — no `first:` exception.
                        Which game is first changes with the page, so a first-child rule would make
                        a row measure one height and render another, and the page would overflow. */}
                    {visible.map(m => (
                        <div key={m.id} data-pb-row className="shrink-0 border-t border-(--pb-border) pt-0.5">
                            <GameFaceoffRow match={m} />
                        </div>
                    ))}
                </div>
            </div>
            {/* Always rendered, and merely hidden when there is a single page. The pager and its
                progress bar sit inside the same fixed-height box either way, so the games viewport
                measures the same before and after the paging decision. Rendering them only when
                paged made the card measure a taller viewport, decide to page, then shrink by the
                pager's own height — and the rows it had just fitted no longer fit. */}
            <div className={cn('shrink-0', !isPaged && 'invisible')} aria-hidden={!isPaged}>
                <div className="flex items-center justify-between gap-2 px-4 pb-1.5 text-[9px] font-black uppercase tracking-wider text-(--pb-text-faint)">
                    <span className="truncate">
                        {t('public_bracket.games_page', {
                            shown: visible.length,
                            total: matches.length,
                            defaultValue: `${visible.length} of ${matches.length} games`,
                        })}
                    </span>
                    <span className="flex shrink-0 gap-1">
                        {Array.from({ length: pageCount }, (_, i) => (
                            <span
                                key={i}
                                className={cn(
                                    'h-1.5 w-1.5 rounded-full',
                                    i === pageIndex ? '[background:var(--pb-ga,var(--pb-highlight))]' : 'bg-(--pb-border)',
                                )}
                            />
                        ))}
                    </span>
                </div>
                <div className="h-[3px] bg-(--pb-border)">
                    <span
                        key={pageIndex}
                        className="pb-page-bar block h-full [background:var(--pb-ga,var(--pb-highlight))]"
                        style={{ animationDuration: `${PAGE_INTERVAL_MS}ms` }}
                    />
                </div>
            </div>
        </div>
    );
}
