import React from 'react';
import { useTranslation } from 'react-i18next';
import { Repeat2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewMode } from '../hooks/useViewMode';

type ViewTabsProps = {
    view: ViewMode;
    onSelect: (v: ViewMode) => void;
    isAutoRotate: boolean;
    onToggleAutoRotate: () => void;
    showAutoRotate: boolean;
    showPlate: boolean;
    /** The TV board embeds its standings, so that tab exists on the phone only. */
    showStandings: boolean;
};

const TABS: { mode: ViewMode; labelKey: string; fallback: string }[] = [
    { mode: 'groups', labelKey: 'public_bracket.view_groups', fallback: 'Groups' },
    { mode: 'standings', labelKey: 'public_bracket.view_standings', fallback: 'Standings' },
    { mode: 'knockout', labelKey: 'public_bracket.view_finals', fallback: 'Finals' },
    { mode: 'plate', labelKey: 'public_bracket.view_plate', fallback: 'Plate' },
];

export function ViewTabs({ view, onSelect, isAutoRotate, onToggleAutoRotate, showAutoRotate, showPlate, showStandings }: ViewTabsProps): React.ReactElement {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-2">
            {showAutoRotate && (
                <button
                    onClick={onToggleAutoRotate}
                    aria-label={t('public_bracket.auto_rotate', 'Auto rotate')}
                    className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                        isAutoRotate
                            ? 'border-(--pb-accent) bg-(--pb-accent-bg) text-(--pb-accent)'
                            : 'border-(--pb-border) bg-(--pb-card) text-(--pb-text-faint)',
                    )}
                >
                    <Repeat2 size={14} />
                </button>
            )}
            <div className="flex flex-1 gap-1 rounded-xl border border-(--pb-border) bg-(--pb-card) p-1">
                {TABS
                    .filter(tab => (tab.mode !== 'plate' || showPlate) && (tab.mode !== 'standings' || showStandings))
                    .map(tab => (
                    <button
                        key={tab.mode}
                        onClick={() => onSelect(tab.mode)}
                        className={cn(
                            'flex-1 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors',
                            view === tab.mode
                                ? 'bg-(--pb-accent-bg) text-(--pb-accent)'
                                : 'text-(--pb-text-faint) hover:text-(--pb-text-muted)',
                        )}
                    >
                        {t(tab.labelKey, tab.fallback)}
                    </button>
                ))}
            </div>
        </div>
    );
}
