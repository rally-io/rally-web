import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scoreSummary, teamLabel } from '../utils';
import type { PublicMatch } from '../types';

const STORAGE_KEY = 'pb-live-strip-collapsed';

type LiveNowStripProps = { matches: PublicMatch[] };

export function LiveNowStrip({ matches }: LiveNowStripProps): React.ReactElement | null {
    const { t } = useTranslation();
    const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
    if (matches.length === 0) return null;

    function toggle(): void {
        setIsCollapsed(prev => {
            localStorage.setItem(STORAGE_KEY, prev ? '0' : '1');
            return !prev;
        });
    }

    return (
        <section className="px-4 pt-3">
            <button onClick={toggle} className="flex w-full items-center justify-between" aria-expanded={!isCollapsed}>
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-(--pb-live)">
                    <span className="pb-live-dot h-1.5 w-1.5 rounded-full bg-(--pb-live)" />
                    {t('public_bracket.happening_now', 'Happening now')}
                </span>
                <ChevronDown size={14} className={cn('text-(--pb-text-faint) transition-transform', isCollapsed && '-rotate-90 rtl:rotate-90')} />
            </button>
            {!isCollapsed && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {matches.map(m => (
                        <div key={m.id} className="shrink-0 rounded-lg border border-(--pb-live)/40 border-s-[3px] border-s-(--pb-live) bg-(--pb-card) px-3 py-2">
                            {m.court_name && (
                                <p className="text-[9px] font-extrabold uppercase tracking-wider text-(--pb-text-muted)">{m.court_name}</p>
                            )}
                            <p className="mt-0.5 text-[11px] font-bold text-(--pb-text)">
                                {teamLabel(m.team_a)} · {teamLabel(m.team_b)}{' '}
                                <span className="font-black text-(--pb-highlight)">{scoreSummary(m)}</span>
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
