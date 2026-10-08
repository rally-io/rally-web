import { Profiler } from 'react';
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

describe('FitText never cuts a name (owner 2026-10-03)', () => {
    it('with wrapAtFloor, a line still too wide at minPx wraps instead of clipping', () => {
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} wrapAtFloor />);
        mockMeasure(screen.getByTitle('first'), 400, 100, 15);
        rerender(<FitText text="an extremely long name" maxPx={15} minPx={9} wrapAtFloor />);
        const el = screen.getByTitle('an extremely long name');
        expect(el.style.fontSize).toBe('9px');
        expect(el.className).toContain('whitespace-normal');
        expect(el.className).not.toContain('overflow-hidden');
    });

    it('without it, the floor still clips (every other caller is unchanged)', () => {
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} />);
        mockMeasure(screen.getByTitle('first'), 400, 100, 15);
        rerender(<FitText text="an extremely long name" maxPx={15} minPx={9} />);
        const el = screen.getByTitle('an extremely long name');
        expect(el.className).toContain('whitespace-nowrap');
        expect(el.className).toContain('overflow-hidden');
    });

    it('a wrapped line goes back to one line when its text changes', () => {
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} wrapAtFloor />);
        const el = screen.getByTitle('first');
        mockMeasure(el, 400, 100, 15);
        rerender(<FitText text="an extremely long name" maxPx={15} minPx={9} wrapAtFloor />);
        expect(el.className).toContain('whitespace-normal');
        Object.defineProperty(el, 'scrollWidth', { configurable: true, get: () => 0 });
        rerender(<FitText text="ok" maxPx={15} minPx={9} wrapAtFloor />);
        expect(screen.getByTitle('ok').className).toContain('whitespace-nowrap');
        expect(screen.getByTitle('ok').style.fontSize).toBe('15px');
    });

    it('refits when a parent narrows its box in a re-render, with no ResizeObserver to say so', () => {
        // jsdom has no ResizeObserver here — the court rail's case: its tiles switch to a fixed
        // width in the same render that re-renders the line, and a background tab may never
        // deliver an observer callback.
        const { rerender } = render(<FitText text="a longer name" maxPx={15} minPx={9} />);
        const el = screen.getByTitle('a longer name');
        mockMeasure(el, 120, 200, 15);
        rerender(<FitText text="a longer name" maxPx={15} minPx={9} />);
        expect(el.style.fontSize).toBe('15px');
        Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => 100 });
        rerender(<FitText text="a longer name" maxPx={15} minPx={9} />);
        expect(el.style.fontSize).toBe('12px');
    });

    it('shows plain spaces in the tooltip when the caller kept names whole', () => {
        render(<FitText text={'Dan\u00A0Levi / Gal\u00A0Cohen'} maxPx={15} minPx={9} />);
        expect(screen.getByTitle('Dan Levi / Gal Cohen')).toBeInTheDocument();
    });
});

describe('FitText tooltip', () => {
    it('reads as typed: plain hyphens and no word joiners from a name kept whole', () => {
        render(<FitText text={'Dan\u00A0Ben\u2011Ami / X\u05BE\u2060Y'} maxPx={15} minPx={9} />);
        expect(screen.getByTitle('Dan Ben-Ami / X\u05BEY')).toBeInTheDocument();
    });
});

describe('FitText fits a new text in one pass (W-e)', () => {
    // The 2026-10-04 review's repro: LeaderBar and Podium reuse one FitText instance, so a new
    // leader's name arrives as a text change in place, not a fresh mount.
    it('old text sat exactly at the floor unwrapped; new, longer text fits from maxPx down and wraps at the floor', () => {
        // Old text: 220px at 20px in a 110px box -> floor(20*110/220) = 10 = minPx, 110px at 10px fits exactly.
        const { rerender } = render(<FitText text="first" maxPx={20} minPx={10} wrapAtFloor />);
        const el = screen.getByTitle('first');
        mockMeasure(el, 220, 110, 20);
        rerender(<FitText text="old leader name" maxPx={20} minPx={10} wrapAtFloor />);
        expect(el.style.fontSize).toBe('10px');
        expect(el.className).toContain('whitespace-nowrap');
        // New leader with a longer name: 300px at 20px -> 150px at the 10px floor, still too wide -> wraps AT 10px.
        mockMeasure(el, 300, 110, 20);
        rerender(<FitText text="a new and much longer leader name" maxPx={20} minPx={10} wrapAtFloor />);
        expect(el.style.fontSize).toBe('10px');
        expect(el.className).toContain('whitespace-normal');
    });

    it('commits at most twice per text change, and a poll with the same text adds no commit of its own', () => {
        let commits = 0;
        const count = (): void => { commits += 1; };
        const tree = (text: string): React.ReactElement => (
            <Profiler id="fit" onRender={count}>
                <FitText text={text} maxPx={20} minPx={10} wrapAtFloor />
            </Profiler>
        );
        const { rerender } = render(tree('first'));
        const el = screen.getByTitle('first');
        mockMeasure(el, 300, 110, 20);
        commits = 0;
        rerender(tree('a new and much longer leader name'));
        expect(el.style.fontSize).toBe('10px');
        expect(commits).toBeLessThanOrEqual(2);
        commits = 0;
        rerender(tree('a new and much longer leader name'));
        expect(commits).toBe(1);                // the parent's own re-render, nothing on top of it
        expect(el.style.fontSize).toBe('10px');
    });

    it('a new cap restarts the fit from it, in the same pass', () => {
        const { rerender } = render(<FitText text="a longer name" maxPx={15} minPx={9} />);
        const el = screen.getByTitle('a longer name');
        mockMeasure(el, 120, 100, 15);
        rerender(<FitText text="a longer name" maxPx={15} minPx={9} />);
        expect(el.style.fontSize).toBe('12px');
        // A bigger cap (a board switching size tier): 160px at 20px in the 100px box -> 12px again.
        mockMeasure(el, 160, 100, 20);
        rerender(<FitText text="a longer name" maxPx={20} minPx={9} />);
        expect(el.style.fontSize).toBe('12px');
        // A cap the text fits at outright.
        mockMeasure(el, 40, 100, 5);
        rerender(<FitText text="a longer name" maxPx={5} minPx={4} />);
        expect(el.style.fontSize).toBe('5px');
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

describe('FitText (fix): stays correct across two observer callbacks in the same batch', () => {
    beforeEach(() => {
        StubResizeObserver.instances = [];
        vi.stubGlobal('ResizeObserver', StubResizeObserver);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function latestObserver(): StubResizeObserver {
        const ro = StubResizeObserver.instances[StubResizeObserver.instances.length - 1];
        if (!ro) throw new Error('FitText never constructed a ResizeObserver');
        return ro;
    }

    it('a grow callback then a narrow callback in one batch must not strand the DOM at the grown size', () => {
        // The 2026-10-05 review's repro: `latest.current` was only refreshed by the per-render
        // effect, so a second same-batch callback reads the fit from BEFORE the first callback's
        // write. Here the first callback (grow to 1000) writes 15px straight to the element; the
        // second (narrow to 500) reads a stale `fit.size` of 9, takes the read-only fast path
        // because the (actual, unread-by-it) DOM still shows 15px which fits a 500px box, and
        // commits 9 without ever writing it — so state says 9 while the DOM still says 15.
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} />);
        const el = screen.getByTitle('first');
        mockMeasure(el, 400, 100, 15);
        rerender(<FitText text="long" maxPx={15} minPx={9} />);
        act(() => { latestObserver().callback([{ contentRect: { width: 100 } }]); });
        expect(el.style.fontSize).toBe('9px');

        act(() => {
            setBoxWidth(el, 1000);
            latestObserver().callback([{ contentRect: { width: 1000 } }]);
            setBoxWidth(el, 500);
            latestObserver().callback([{ contentRect: { width: 500 } }]);
        });

        // No observer callback here — a later parent re-render arriving on its own, same box as
        // the one that forced 9px originally. The regression's real symptom: a name frozen at
        // the grown size, over-clipped, because the floor guard trusted the (wrong) state instead
        // of the (correct) DOM.
        setBoxWidth(el, 100);
        rerender(<FitText text="long" maxPx={15} minPx={9} />);
        expect(el.style.fontSize).toBe('9px');
    });

    it('widening the box while wrapped at the floor un-wraps and grows back', () => {
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} wrapAtFloor />);
        const el = screen.getByTitle('first');
        mockMeasure(el, 400, 100, 15);
        rerender(<FitText text="long" maxPx={15} minPx={9} wrapAtFloor />);
        act(() => { latestObserver().callback([{ contentRect: { width: 100 } }]); });
        expect(el.style.fontSize).toBe('9px');
        expect(el.className).toContain('whitespace-normal');

        setBoxWidth(el, 500);
        act(() => { latestObserver().callback([{ contentRect: { width: 500 } }]); });
        expect(el.style.fontSize).toBe('15px');
        expect(el.className).toContain('whitespace-nowrap');
    });
});

describe('FitText restarts on a minPx-only change (the spec requires it)', () => {
    it('a minPx-only change restarts the fit from maxPx, in the same pass', () => {
        const { rerender } = render(<FitText text="first" maxPx={15} minPx={9} />);
        const el = screen.getByTitle('first');
        mockMeasure(el, 400, 100, 15);
        rerender(<FitText text="long" maxPx={15} minPx={9} />);
        expect(el.style.fontSize).toBe('9px');
        rerender(<FitText text="long" maxPx={15} minPx={4} />);
        expect(el.style.fontSize).toBe('4px');
        rerender(<FitText text="long" maxPx={15} minPx={12} />);
        expect(el.style.fontSize).toBe('12px');
    });
});

describe('FitText refits when a webfont finishes loading', () => {
    let addEventListener: ReturnType<typeof vi.fn>;
    let removeEventListener: ReturnType<typeof vi.fn>;
    let fire: (() => void) | undefined;

    beforeEach(() => {
        fire = undefined;
        addEventListener = vi.fn((type: string, fn: () => void) => {
            if (type === 'loadingdone') fire = fn;
        });
        removeEventListener = vi.fn();
        Object.defineProperty(document, 'fonts', {
            configurable: true,
            value: { addEventListener, removeEventListener },
        });
    });

    afterEach(() => {
        delete (document as { fonts?: unknown }).fonts;
    });

    it('re-measures against the real face once document.fonts reports loadingdone', () => {
        const { rerender, unmount } = render(<FitText text="first" maxPx={15} minPx={9} />);
        const el = screen.getByTitle('first');
        mockMeasure(el, 90, 100, 15);
        rerender(<FitText text="first" maxPx={15} minPx={9} />);
        expect(el.style.fontSize).toBe('15px');

        mockMeasure(el, 120, 100, 15);
        act(() => { fire?.(); });
        expect(el.style.fontSize).toBe('12px');

        const addedFn = addEventListener.mock.calls[0]?.[1];
        unmount();
        expect(removeEventListener).toHaveBeenCalledWith('loadingdone', addedFn);
    });
});
