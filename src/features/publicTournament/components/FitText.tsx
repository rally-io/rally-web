import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { plainNames } from '../utils';

type FitTextProps = {
    text: string;
    /** Starting and maximum font size, px. */
    maxPx: number;
    /** Floor, px — at this size the text clips rather than shrinking further (see `wrapAtFloor`). */
    minPx: number;
    className?: string;
    /**
     * At the floor and still too wide: wrap onto more lines instead of clipping. For player names,
     * which are never cut (owner 2026-10-03) — the row grows a line instead.
     */
    wrapAtFloor?: boolean;
};

type Fit = { size: number; wrapped: boolean };

/**
 * The largest size from `from` down to `minPx` at which `el` fits on one line, and whether it has
 * to wrap there. `shown` is what the element shows now: when that is already `from` on one line
 * and it fits, a plain read answers — the common case (every mount, every new text that fits)
 * writes nothing. Otherwise it measures by writing the font size straight onto the element — one
 * line, clipped, so `scrollWidth` reports the whole run even while the committed state is
 * wrapped — and leaves the element showing the answer, which is what React renders once the
 * answer is committed. Text width scales ~linearly with font size, so one ratio step usually
 * lands it.
 */
function measureFit(el: HTMLElement, from: number, minPx: number, wrapAtFloor: boolean, shown: Fit): Fit {
    if (shown.size === from && !shown.wrapped && el.scrollWidth <= el.clientWidth) return { size: from, wrapped: false };
    el.style.whiteSpace = 'nowrap';
    el.style.overflow = 'hidden';
    let size = from;
    el.style.fontSize = `${size}px`;
    while (el.scrollWidth > el.clientWidth && size > minPx) {
        size = Math.max(minPx, Math.min(Math.floor(size * (el.clientWidth / el.scrollWidth)), size - 1));
        el.style.fontSize = `${size}px`;
    }
    const overflows = el.scrollWidth > el.clientWidth;
    el.style.whiteSpace = '';
    el.style.overflow = '';
    return { size, wrapped: overflows && wrapAtFloor };
}

/**
 * A single line that never ellipsizes: on overflow the font steps down until the text fits
 * or hits `minPx`. Measures the real rendered element (scrollWidth vs clientWidth), so the
 * loaded webfonts are what get measured; the TV canvas's transform scale affects neither
 * metric, so fitting works in canvas coordinates. In jsdom both metrics are 0, so the text
 * simply stays at maxPx — component tests need no mocking.
 *
 * One pass per change: the steps happen on the element, and the result is committed once — a new
 * text never shows at an intermediate size, and it costs at most one extra render.
 */
export function FitText({ text, maxPx, minPx, className, wrapAtFloor = false }: FitTextProps): React.ReactElement {
    const ref = useRef<HTMLSpanElement>(null);
    const [fit, setFit] = useState<Fit>({ size: maxPx, wrapped: false });
    // For the observer and font callbacks below, which outlive the render that made them.
    const latest = useRef({ fit, maxPx, minPx, wrapAtFloor });
    const fittedFor = useRef<{ text: string; maxPx: number; minPx: number } | null>(null);
    const lastWidth = useRef(-1);

    /**
     * Commit a measured fit — no state change, so no render, when it is what is already shown.
     * Updates `latest.current.fit` synchronously, before React re-renders: two observer/font
     * callbacks can run back to back in the same batch, and the second must see what the first
     * just wrote to the element, not the fit from before either ran.
     */
    const commit = (next: Fit): void => {
        latest.current = { ...latest.current, fit: next };
        setFit(prev => (prev.size === next.size && prev.wrapped === next.wrapped ? prev : next));
    };

    // Every render, not only when the text changes: a parent can narrow this box in the same render
    // that re-renders it (the court rail switching its tiles to a fixed width once it starts
    // scrolling), and the ResizeObserver below is the only other trigger — one a throttled
    // background tab may never deliver. The common case — same text, still fits — only reads.
    useLayoutEffect(() => {
        latest.current = { fit, maxPx, minPx, wrapAtFloor };
        const el = ref.current;
        if (!el) return;
        const last = fittedFor.current;
        const restart = !last || last.text !== text || last.maxPx !== maxPx || last.minPx !== minPx;
        fittedFor.current = { text, maxPx, minPx };
        if (!restart) {
            // A wrapped line is already at the floor; it re-fits only when its text or box changes.
            if (fit.wrapped) return;
            if (el.scrollWidth <= el.clientWidth) return;
            // Clipped at the floor, which is what a caller without wrapAtFloor asked for.
            if (fit.size <= minPx && !wrapAtFloor) return;
        }
        // New text or a new cap starts again at maxPx, unwrapped, in this same pass; a box that
        // narrowed under the same text steps down from where it is.
        commit(measureFit(el, restart ? maxPx : fit.size, minPx, wrapAtFloor, fit));
    });

    // The first fit can run before the webfont arrives; the real face is wider, and nothing about
    // the box changes when it swaps in, so without this a name fitted against the fallback font
    // stays a few pixels too wide — clipped — until the next resize.
    useLayoutEffect(() => {
        const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
        if (!fonts?.addEventListener) return;
        const refit = (): void => {
            const el = ref.current;
            if (!el) return;
            const now = latest.current;
            commit(measureFit(el, now.maxPx, now.minPx, now.wrapAtFloor, now.fit));
        };
        fonts.addEventListener('loadingdone', refit);
        return () => fonts.removeEventListener('loadingdone', refit);
    }, []);

    // Refit when the container's WIDTH changes — viewport resize or a rotated screen. NOT the
    // TV canvas rescale: `TvCanvas` scales with a CSS transform, which leaves `contentRect`
    // (and scrollWidth/clientWidth) in untouched canvas coordinates.
    //
    // Height is deliberately ignored: shrinking the font changes the element's own height, and
    // a height-sensitive observer would loop reset → shrink → reset forever. Width gets the
    // same treatment by direction, because at a content-sized call site (`flex: 0 1 auto`) the
    // observed box is the text's own: only a WIDENING box means new room worth re-growing into.
    // A NARROWING one is re-fitted from the current size — monotonically downward, so it
    // converges — never from `maxPx`, which is what could bounce reset → shrink → reset.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect.width ?? 0;
            if (w === lastWidth.current) return;
            const grew = w > lastWidth.current;
            lastWidth.current = w;
            const now = latest.current;
            commit(measureFit(el, grew ? now.maxPx : now.fit.size, now.minPx, now.wrapAtFloor, now.fit));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <span
            ref={ref}
            // The tooltip in plain text even when the caller kept names whole: plainNames
            // is keepNamesWhole's inverse.
            title={plainNames(text)}
            className={cn('block max-w-full', fit.wrapped ? 'whitespace-normal break-words' : 'overflow-hidden whitespace-nowrap', className)}
            style={{ fontSize: `${fit.size}px` }}
        >
            {text}
        </span>
    );
}
