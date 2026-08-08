import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { planBalancedPages } from '../utils';

export const PAGE_INTERVAL_MS = 7000;

/** Slack against sub-pixel rounding in borders and gaps, so a page never overflows by a hair. */
const SAFETY_MARGIN_PX = 6;

type UseAutoPagesResult = {
    /** Fixed-height clipping box the content has to fit inside. */
    viewportRef: React.RefObject<HTMLDivElement>;
    /** Direct parent of the pageable items — each child is measured as one whole item. */
    stackRef: React.RefObject<HTMLDivElement>;
    /** `null` while measuring: render EVERY item that frame so it can be measured. */
    pages: number[][] | null;
    pageIndex: number;
};

/**
 * Splits a card's game rows across auto-advancing pages so nothing is ever out of reach on a
 * screen no one can scroll. Measures the real rendered heights rather than estimating, because
 * Hebrew/Latin names, set-score columns and the live badge all change row height.
 *
 * Re-measures when `signature` changes (content that affects layout) or the viewport
 * resizes. When everything fits there is a single page and no timer runs, so small
 * tournaments stay completely still.
 */
export function useAutoPages(signature: string, activeItem: number, intervalMs = PAGE_INTERVAL_MS): UseAutoPagesResult {
    const viewportRef = useRef<HTMLDivElement>(null);
    const stackRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<number[][] | null>(null);
    const [pageIndex, setPageIndex] = useState(0);
    /** Viewport height at the last measurement, so the observer only re-runs on a real resize. */
    const measuredHeightRef = useRef(-1);

    useEffect(() => {
        setPages(null);
    }, [signature]);

    useLayoutEffect(() => {
        // Non-null means the current pages are still valid — bail out, or this loops forever.
        if (pages !== null) return;
        const viewport = viewportRef.current;
        const stack = stackRef.current;
        if (!viewport || !stack) return;
        const style = getComputedStyle(stack);
        const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const gap = parseFloat(style.rowGap) || 0;
        measuredHeightRef.current = viewport.clientHeight;
        // Measured via getBoundingClientRect because row heights are fractional (~60.75px) —
        // summing the integer offsetHeight under-counts and lets a page overflow by a pixel or two.
        const rows = stack.querySelectorAll<HTMLElement>('[data-pb-row]');
        const heights = Array.from(rows, row => row.getBoundingClientRect().height);
        const budget = viewport.clientHeight - padding - SAFETY_MARGIN_PX;
        const next = planBalancedPages(heights, budget, gap);
        setPages(next);
        const landing = next.findIndex(page => page.includes(activeItem));
        setPageIndex(landing === -1 ? 0 : landing);
    }, [pages, activeItem]);

    // The display font arrives after first paint and grows the standings glyphs, which shrinks
    // the games viewport underneath them. Measuring before that lands plans pages against a
    // viewport that no longer exists, so the last row on each page ends up clipped.
    useEffect(() => {
        let cancelled = false;
        document.fonts?.ready.then(() => {
            if (!cancelled) setPages(null);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const observer = new ResizeObserver(() => {
            if (Math.abs(viewport.clientHeight - measuredHeightRef.current) > 2) setPages(null);
        });
        observer.observe(viewport);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const pageCount = pages?.length ?? 0;
        if (pageCount <= 1) return;
        const id = setInterval(() => setPageIndex(i => (i + 1) % pageCount), intervalMs);
        return () => clearInterval(id);
    }, [pages, intervalMs]);

    return { viewportRef, stackRef, pages, pageIndex };
}
