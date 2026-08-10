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
    /**
     * Exactly which tabs to render, in order. The page computes it because tab
     * visibility depends on things only the page knows (screen size) as well as on
     * the bracket — a list beats one boolean prop per tab, which is what this was.
     */
    tabs: ViewMode[];
};

const TAB_LABELS: Record<ViewMode, { labelKey: string; fallback: string }> = {
    groups: { labelKey: 'public_bracket.view_groups', fallback: 'Groups' },
    standings: { labelKey: 'public_bracket.view_standings', fallback: 'Standings' },
    knockout: { labelKey: 'public_bracket.view_finals', fallback: 'Finals' },
    plate: { labelKey: 'public_bracket.view_plate', fallback: 'Plate' },
    video: { labelKey: 'public_bracket.view_video', fallback: 'Video' },
};

export function ViewTabs({ view, onSelect, isAutoRotate, onToggleAutoRotate, showAutoRotate, tabs }: ViewTabsProps): React.ReactElement {
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
                {tabs.map(mode => (
                    <button
                        key={mode}
                        onClick={() => onSelect(mode)}
                        className={cn(
                            'flex-1 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors',
                            view === mode
                                ? 'bg-(--pb-accent-bg) text-(--pb-accent)'
                                : 'text-(--pb-text-faint) hover:text-(--pb-text-muted)',
                        )}
                    >
                        {t(TAB_LABELS[mode].labelKey, TAB_LABELS[mode].fallback)}
                    </button>
                ))}
            </div>
        </div>
    );
}
