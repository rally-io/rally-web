import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import { FitText } from '../components/FitText';

/**
 * jsdom does no text layout — scrollWidth/clientWidth are always 0, so FitText naturally
 * stays at maxPx there (which is also why no OTHER component test needs mocking). These
 * tests install getters modelling a text run whose width scales linearly with the current
 * font-size — exactly the relationship the fitting step relies on.
 */
function mockMeasure(el: HTMLElement, widthAtMax: number, boxWidth: number, maxPx: number): void {
    Object.defineProperty(el, 'scrollWidth', {
        configurable: true,
        get: () => Math.round(widthAtMax * (parseFloat(el.style.fontSize) / maxPx)),
    });
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => boxWidth });
}

describe('FitText', () => {
    it('renders at maxPx with the full text and a title attribute when it fits', () => {
        render(<FitText text="short" maxPx={15} minPx={9} />);
        const el = screen.getByTitle('short');
        expect(el.textContent).toBe('short');
        expect(el.style.fontSize).toBe('15px');
        expect(el.className).not.toContain('truncate');
    });

    it('shrinks an overflowing line until it fits', () => {
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} />);
        // 120px wide at 15px, in a 100px box → floor(15 × 100/120) = 12px, which fits (96px).
        mockMeasure(screen.getByTitle('first'), 120, 100, 15);
        rerender(<FitText text="a longer name" maxPx={15} minPx={9} />);
        expect(screen.getByTitle('a longer name').style.fontSize).toBe('12px');
    });

    it('never goes below minPx even when the text still overflows there', () => {
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} />);
        mockMeasure(screen.getByTitle('first'), 400, 100, 15);
        rerender(<FitText text="an extremely long name" maxPx={15} minPx={9} />);
        expect(screen.getByTitle('an extremely long name').style.fontSize).toBe('9px');
    });

    it('re-grows when the text changes to something that fits', () => {
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} />);
        const el = screen.getByTitle('first');
        mockMeasure(el, 400, 100, 15);
        rerender(<FitText text="an extremely long name" maxPx={15} minPx={9} />);
        expect(screen.getByTitle('an extremely long name').style.fontSize).toBe('9px');
        // Back to jsdom's "everything fits" default, then swap in short text.
        Object.defineProperty(el, 'scrollWidth', { configurable: true, get: () => 0 });
        rerender(<FitText text="ok" maxPx={15} minPx={9} />);
        expect(screen.getByTitle('ok').style.fontSize).toBe('15px');
    });
});

/** Overwrite just the box width, leaving the font-size-linked scrollWidth from mockMeasure. */
function setBoxWidth(el: HTMLElement, boxWidth: number): void {
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => boxWidth });
}

type FakeEntry = { contentRect: { width: number } };

/**
 * jsdom has no ResizeObserver, so the real one's branch never ran in CI. This stub records
 * its instances and fires only when a test says so — never automatically — which keeps the
 * width sequence explicit. It is installed per-test via `vi.stubGlobal` inside this describe
 * only: the suites above (and `BracketTreeTV`, which constructs a ResizeObserver unguarded)
 * depend on the global staying undefined.
 */
class StubResizeObserver {
    static instances: StubResizeObserver[] = [];
    readonly callback: (entries: FakeEntry[]) => void;
    disconnected = false;

    constructor(callback: (entries: FakeEntry[]) => void) {
        this.callback = callback;
        StubResizeObserver.instances.push(this);
    }

    observe(): void {}
    unobserve(): void {}
    disconnect(): void { this.disconnected = true; }
}

describe('FitText container resizing', () => {
    beforeEach(() => {
        StubResizeObserver.instances = [];
        vi.stubGlobal('ResizeObserver', StubResizeObserver);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    /** The observer FitText installed on its own element in the render under test. */
    function latestObserver(): StubResizeObserver {
        const ro = StubResizeObserver.instances[StubResizeObserver.instances.length - 1];
        if (!ro) throw new Error('FitText never constructed a ResizeObserver');
        return ro;
    }

    /** Report a new container width, the way a real observer would after a layout change. */
    function resizeTo(width: number): void {
        const ro = latestObserver();
        act(() => { ro.callback([{ contentRect: { width } }]); });
    }

    /**
     * A line that has already shrunk: "a longer name" is 8px of text per 1px of font, so at
     * maxPx 15 it runs 120px inside a 100px box and settles at 12px (96px).
     */
    function renderShrunkLine(): HTMLElement {
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} />);
        mockMeasure(screen.getByTitle('first'), 120, 100, 15);
        rerender(<FitText text="a longer name" maxPx={15} minPx={9} />);
        const line = screen.getByTitle('a longer name');
        expect(line.style.fontSize).toBe('12px');
        // First notification of a real width (from the -1 sentinel) counts as "room appeared":
        // back to maxPx, then straight back down to 12px because the 100px box is unchanged.
        resizeTo(200);
        expect(line.style.fontSize).toBe('12px');
        return line;
    }

    it('grows a shrunk line back toward maxPx when the container gets wider', () => {
        const line = renderShrunkLine();
        // The box that forced 12px is gone — at 200px wide the full 15px line (120px) fits.
        setBoxWidth(line, 200);
        resizeTo(400);
        expect(line.style.fontSize).toBe('15px');
    });

    it('re-fits downward when the container narrows, rather than resetting to maxPx', () => {
        const line = renderShrunkLine();
        // 12px renders 96px of text; an 80px box overflows, so it must step down again.
        setBoxWidth(line, 80);
        resizeTo(120);
        // floor(12 × 80/96) = 10, and 10px (80px of text) fits exactly. Neither 15px (a reset
        // to maxPx) nor 12px (a guard that ignored every shrink) is an acceptable answer here.
        expect(line.style.fontSize).toBe('10px');
    });

    it('leaves the size alone when a narrower container still fits the current line', () => {
        const line = renderShrunkLine();
        // Plenty of room at 12px now, but the box got narrower than it was. Resetting to maxPx
        // here is the move that can bounce reset → overflow → shrink → reset on a content-sized
        // element, and it would settle at 15px instead of the 12px this asserts.
        setBoxWidth(line, 1000);
        resizeTo(150);
        expect(line.style.fontSize).toBe('12px');
    });

    it('does not re-set the size when repeated callbacks report the same width', () => {
        const line = renderShrunkLine();
        setBoxWidth(line, 1000);
        // Same width as the notification renderShrunkLine already delivered: nothing about the
        // layout changed, so nothing about the size may either — even though there is now room
        // to grow, which only a genuine widening is allowed to claim.
        resizeTo(200);
        expect(line.style.fontSize).toBe('12px');
        resizeTo(200);
        resizeTo(200);
        expect(line.style.fontSize).toBe('12px');
    });

    it('stops at minPx when a narrowing container leaves no room', () => {
        const line = renderShrunkLine();
        setBoxWidth(line, 20);
        resizeTo(30);
        expect(line.style.fontSize).toBe('9px');
    });

    it('disconnects the observer on unmount', () => {
        const { unmount } = render(<FitText text="short" maxPx={15} minPx={9} />);
        const ro = latestObserver();
        expect(ro.disconnected).toBe(false);
        unmount();
        expect(ro.disconnected).toBe(true);
    });
});
