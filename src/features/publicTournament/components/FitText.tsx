import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type FitTextProps = {
    text: string;
    /** Starting and maximum font size, px. */
    maxPx: number;
    /** Floor, px — at this size the text clips rather than shrinking further. */
    minPx: number;
    className?: string;
};

/**
 * A single line that never ellipsizes: on overflow the font steps down until the text fits
 * or hits `minPx`. Measures the real rendered element (scrollWidth vs clientWidth), so the
 * loaded webfonts are what get measured; the TV canvas's transform scale affects neither
 * metric, so fitting works in canvas coordinates. In jsdom both metrics are 0, so the text
 * simply stays at maxPx — component tests need no mocking.
 */
export function FitText({ text, maxPx, minPx, className }: FitTextProps): React.ReactElement {
    const ref = useRef<HTMLSpanElement>(null);
    const [size, setSize] = useState(maxPx);
    const lastWidth = useRef(-1);

    // New text (or a new cap) starts back at full size and re-fits from there.
    useLayoutEffect(() => { setSize(maxPx); }, [text, maxPx]);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || size <= minPx) return;
        if (el.scrollWidth > el.clientWidth) {
            // Text width scales ~linearly with font-size, so one ratio step usually lands it;
            // the effect re-runs on setSize until it fits or bottoms out at minPx.
            const fitted = Math.floor(size * (el.clientWidth / el.scrollWidth));
            setSize(Math.max(minPx, Math.min(fitted, size - 1)));
        }
    }, [size, minPx, text]);

    // Refit when the container's WIDTH changes — viewport resize or a rotated screen. NOT the
    // TV canvas rescale: `TvCanvas` scales with a CSS transform, which leaves `contentRect`
    // (and scrollWidth/clientWidth) in untouched canvas coordinates.
    //
    // Height is deliberately ignored: shrinking the font changes the element's own height, and
    // a height-sensitive observer would loop reset → shrink → reset forever. Width gets the
    // same treatment by direction, because at a content-sized call site (`flex: 0 1 auto`) the
    // observed box is the text's own: only a WIDENING box means new room worth re-growing into.
    // A NARROWING one is re-fitted from the current size — monotonically downward, so it
    // converges — never reset to `maxPx`, which is what could bounce reset → shrink → reset.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect.width ?? 0;
            if (w === lastWidth.current) return;
            const grew = w > lastWidth.current;
            lastWidth.current = w;
            if (grew) {
                // More room than before: start over at full size, and let the fitting effect
                // step back down if the text still does not fit.
                setSize(maxPx);
                return;
            }
            // Less room: shrink only. Read the DOM once here rather than inside the updater —
            // the updater must stay pure — and step down from whatever size is current, which
            // the callback's closure cannot see (this effect does not re-run per size change).
            if (el.scrollWidth <= el.clientWidth) return;
            const ratio = el.clientWidth / el.scrollWidth;
            setSize(prev => (prev <= minPx
                ? prev
                : Math.max(minPx, Math.min(Math.floor(prev * ratio), prev - 1))));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [maxPx, minPx]);

    return (
        <span
            ref={ref}
            title={text}
            className={cn('block max-w-full overflow-hidden whitespace-nowrap', className)}
            style={{ fontSize: `${size}px` }}
        >
            {text}
        </span>
    );
}
