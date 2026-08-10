import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicVideo } from '../types';

type VideoViewProps = {
    videos: PublicVideo[];
    isBigScreen: boolean;
};

/**
 * Renders whatever the server said is embeddable. There is no provider logic here on
 * purpose: `embed_url` arrives already correct for its host, so adding a new video
 * host is a database row and needs no change to this file and no app release.
 */
export function VideoView({ videos, isBigScreen }: VideoViewProps): React.ReactElement | null {
    const { t } = useTranslation();
    // An empty embed_url means the server could not render that provider's template.
    const playable = videos.filter(v => v.embed_url);
    const [activeId, setActiveId] = useState<string | null>(null);
    const active = playable.find(v => v.id === activeId) ?? playable[0];

    if (!active) return null;

    return (
        <div className={cn('flex flex-col gap-3', isBigScreen ? 'h-full px-8 pb-6' : 'px-4 pb-8')}>
            {playable.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {playable.map(v => (
                        <button
                            key={v.id}
                            onClick={() => setActiveId(v.id)}
                            className={cn(
                                'rounded-lg border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors',
                                v.id === active.id
                                    ? 'border-(--pb-accent) bg-(--pb-accent-bg) text-(--pb-accent)'
                                    : 'border-(--pb-border) bg-(--pb-card) text-(--pb-text-faint) hover:text-(--pb-text-muted)',
                            )}
                        >
                            {v.label || v.provider}
                        </button>
                    ))}
                </div>
            )}
            <div
                className={cn(
                    'relative w-full overflow-hidden rounded-2xl border border-(--pb-border) bg-black',
                    isBigScreen ? 'min-h-0 flex-1' : 'aspect-video',
                )}
            >
                <iframe
                    // Keyed by id so switching tears the previous player down rather than
                    // leaving a hidden one playing audio.
                    key={active.id}
                    src={active.embed_url}
                    title={active.label || active.provider}
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 h-full w-full"
                />
            </div>
            {active.url && (
                <a
                    href={active.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 self-start text-[11px] font-bold text-(--pb-text-faint) hover:text-(--pb-accent)"
                >
                    <ExternalLink size={12} />
                    {/* Load-bearing, not a nicety: hosts block embedding per video and a
                        cross-origin iframe cannot tell us it happened, so the way out has
                        to be visible before anything goes wrong. */}
                    {t('public_bracket.open_on_provider', 'Watch on {{provider}}', { provider: active.provider })}
                </a>
            )}
        </div>
    );
}
