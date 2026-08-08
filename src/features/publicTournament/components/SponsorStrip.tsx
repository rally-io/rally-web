import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicSponsor } from '../types';

type SponsorStripProps = { sponsors: PublicSponsor[] };

/**
 * Footer sponsor board for the TV/big-screen live view. Each logo sits on its
 * own white tile (like the QR panel) so it reads on every bracket theme.
 * Only sponsors that carry a logo image are shown; renders nothing when empty.
 */
export function SponsorStrip({ sponsors }: SponsorStripProps): React.ReactElement | null {
    const { t } = useTranslation();
    const withLogo = sponsors.filter(sponsor => Boolean(sponsor.image_url));
    if (withLogo.length === 0) return null;

    return (
        <div className="flex shrink-0 items-center gap-3">
            <span className="max-w-[4rem] text-[10px] font-black uppercase leading-tight tracking-[0.2em] text-(--pb-text-faint)">
                {t('public_bracket.sponsored_by', 'Sponsored by')}
            </span>
            <div className="flex items-center gap-2">
                {withLogo.map(sponsor => (
                    <div
                        key={`${sponsor.name}-${sponsor.image_url}`}
                        title={sponsor.name}
                        className="flex h-12 items-center rounded-xl border border-(--pb-border) bg-white px-3"
                    >
                        <img src={sponsor.image_url ?? ''} alt={sponsor.name} className="h-6 w-auto" />
                    </div>
                ))}
            </div>
        </div>
    );
}
