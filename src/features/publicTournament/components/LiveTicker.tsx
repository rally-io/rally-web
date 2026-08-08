import React from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { localizeTeamPlaceholder, scoreSummary, teamLabel } from '../utils';
import type { PublicMatch } from '../types';

type LiveTickerProps = { live: PublicMatch[]; upcoming: PublicMatch[] };

export function LiveTicker({ live, upcoming }: LiveTickerProps): React.ReactElement | null {
    const { t } = useTranslation();
    const label = (team: PublicMatch['team_a']): string => localizeTeamPlaceholder(teamLabel(team), t);
    const items: string[] = [
        ...live.map(m =>
            [m.court_name, `${label(m.team_a)} · ${scoreSummary(m)} · ${label(m.team_b)}`].filter(Boolean).join(' — '),
        ),
        ...upcoming.map(m => {
            const time = m.scheduled_at ? format(parseISO(m.scheduled_at), 'HH:mm') : '';
            return `${t('public_bracket.up_next', 'Up next')} ${time}: ${label(m.team_a)} · ${label(m.team_b)}`;
        }),
    ];
    if (items.length === 0) return null;
    const loop = [...items, ...items];
    return (
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-(--pb-border) bg-(--pb-card) py-3">
            <div className="pb-ticker-track gap-10 ps-10">
                {loop.map((text, i) => (
                    <span key={i} className="text-xs font-bold text-(--pb-text-muted)">
                        <span className="me-2 font-black text-(--pb-live)">●</span>
                        {text}
                    </span>
                ))}
            </div>
        </div>
    );
}
