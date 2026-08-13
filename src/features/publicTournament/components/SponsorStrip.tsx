import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicSponsor } from '../types';

type SponsorStripProps = { sponsors: PublicSponsor[] };

/**
 * Footer sponsor board for the TV/big-screen live view. Each logo sits on its
 * own white tile (like the QR panel) so it reads on every bracket theme.
 * Only sponsors that carry a logo image are shown; renders nothing when empty.
 *
 * Sized to be legible from across a hall rather than merely present: at the previous
 * 24px the logo was the smallest thing on a board read from twenty metres, which is a
 * poor return for the people paying for the tournament. The tile tracks the logo so the
 * white card stays a frame around it and not a margin.
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
                        className="flex h-[68px] items-center rounded-xl border border-(--pb-border) bg-white px-4"
                    >
                        {/* Bounded on BOTH axes. Height alone lets a wide wordmark set its own
                            width — a 3:1 logo at 44px tall is 132px, and three of those take
                            560px out of a 1600px footer, squeezing the court rail until it
                            scrolls on a four-court club that has nothing to hide. object-contain
                            keeps the aspect ratio inside the box rather than distorting it. */}
                        <img
                            src={sponsor.image_url ?? ''}
                            alt={sponsor.name}
                            className="h-11 w-auto max-w-[104px] object-contain"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
