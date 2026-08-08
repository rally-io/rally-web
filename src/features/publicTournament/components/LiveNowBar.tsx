import React from 'react';
import { useTranslation } from 'react-i18next';
import { teamLabel } from '../utils';
import type { PublicMatch } from '../types';

type LiveNowBarProps = { matches: PublicMatch[] };

/**
 * The games on court right now, held at full size above the group boards. In the board itself a
 * live game is only one tinted row — too small for the thing everyone in the room is watching.
 * Renders nothing when no game is live, so the boards get the whole screen back.
 */
export function LiveNowBar({ matches }: LiveNowBarProps): React.ReactElement | null {
    const { t } = useTranslation();
    if (matches.length === 0) return null;
    return (
        <div className="mx-8 mb-2 flex shrink-0 items-center gap-5 rounded-2xl border border-(--pb-live)/50 bg-(--pb-card) px-5 py-2">
            <span className="flex shrink-0 items-center gap-2 text-[11px] font-black uppercase tracking-wider text-(--pb-live)">
                <span className="pb-live-dot h-2.5 w-2.5 rounded-full bg-(--pb-live)" />
                {t('public_bracket.live_now', 'Live now')}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-7">
                {matches.map(m => (
                    <div key={m.id} className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="min-w-0 flex-1 truncate text-end text-[17px] font-extrabold text-(--pb-text)">
                            {teamLabel(m.team_a)}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-2xl font-black tabular-nums text-(--pb-live)">
                            {m.sets.length === 0
                                ? '—'
                                : m.sets.map((s, i) => (
                                    // Each set is its own element so RTL keeps team A's number on team A's side.
                                    <span key={i} className="flex items-center">
                                        <span>{s.team_a_score}</span>
                                        <span className="px-0.5 text-(--pb-text-faint)">:</span>
                                        <span>{s.team_b_score}</span>
                                    </span>
                                ))}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[17px] font-extrabold text-(--pb-text)">
                            {teamLabel(m.team_b)}
                        </span>
                        {m.court_name && (
                            <span className="shrink-0 text-[11px] font-bold text-(--pb-text-muted)">{m.court_name}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
