import { useEffect, useMemo, useState } from 'react';
import { getLiveLayout, type LayoutKind, type ViewMode } from '../liveLayouts';
import type { PublicBracketData } from '../types';

export type { ViewMode } from '../liveLayouts';

/** One tab must be readable before the next arrives: six standings tables take longer than 5s. */
export const ROTATE_MS = 12000;

type UseViewModeResult = {
    view: ViewMode;
    /** Which renderer draws the board (LiveLayoutView). */
    kind: LayoutKind;
    /** The tab bar's tabs, in order; Video always last. */
    tabs: ViewMode[];
    selectView: (v: ViewMode) => void;
    isAutoRotate: boolean;
    toggleAutoRotate: () => void;
    showTabs: boolean;
    showVideo: boolean;
    /**
     * False when the layout has a single view or never rotates — hide the toggle rather than
     * let it light up and rotate nothing.
     */
    canAutoRotate: boolean;
};

/**
 * Which view the live page shows, and its tabs. Every per-tournament-type rule comes from the
 * layout descriptor (../liveLayouts.ts); this hook only holds the viewer's state: the picked tab,
 * the rotation toggle and the rotation clock.
 */
export function useViewMode(bracket: PublicBracketData | null, isBigScreen = false): UseViewModeResult {
    const [manual, setManual] = useState<ViewMode | null>(null);
    // On an unattended venue screen both tabs have to be seen without anyone touching anything,
    // so rotation starts on. A phone is read by one person who chooses; it starts off.
    // Initial state only: a window resized across the breakpoint after mount will not retro-start.
    const [isAutoRotate, setIsAutoRotate] = useState(isBigScreen);
    const [rotateIndex, setRotateIndex] = useState(0);

    const layout = useMemo(() => getLiveLayout(bracket), [bracket]);
    const showVideo = (bracket?.videos.length ?? 0) > 0;
    const rotationCount = layout.rotationViews.length;

    // A new stage (group stage finishing, knockout starting, or vice versa) makes whatever index
    // we were on stale — it may point outside the new list's meaning entirely. Snap to the new
    // list's first view instead of carrying it over. A primitive dep: a poll hands a new bracket
    // object every 10 s, and the stage must not count as changed when only the object did.
    useEffect(() => {
        setRotateIndex(0);
    }, [layout.stage]);

    // A takeover view appearing (the evening's last stage) starts the rotation on it and drops a
    // tab someone picked earlier, so every screen jumps to it (owner 2026-10-03). Also a
    // primitive dep, for the same reason.
    useEffect(() => {
        if (!layout.takeover) return;
        setRotateIndex(0);
        setManual(null);
    }, [layout.takeover]);

    useEffect(() => {
        // Nothing to rotate to (no groups drawn yet, or a single-view layout) — don't spin up
        // a no-op interval that ticks every 12s and never changes anything observable.
        if (!isAutoRotate || rotationCount <= 1) return;
        const id = setInterval(() => {
            setRotateIndex(i => (i + 1) % rotationCount);
        }, ROTATE_MS);
        return () => clearInterval(id);
    }, [isAutoRotate, rotationCount]);

    const view = useMemo<ViewMode>(() => {
        if (isAutoRotate && rotationCount > 0) return layout.rotationViews[rotateIndex % rotationCount];
        // A manual Video pick survives on every layout — whenever there are videos to show.
        if (manual === 'video') return showVideo ? 'video' : layout.defaultView;
        if (manual && layout.accepts(manual)) return manual;
        return layout.defaultView;
    }, [layout, manual, isAutoRotate, rotateIndex, rotationCount, showVideo]);

    const tabs = useMemo<ViewMode[]>(() => {
        const list = layout.tabs(isBigScreen);
        // Video is always last, so adding it never moves a tab a regular visitor already knows.
        return showVideo ? [...list, 'video'] : list;
    }, [layout, isBigScreen, showVideo]);

    return {
        view,
        kind: layout.kind,
        tabs,
        selectView: (v: ViewMode): void => {
            setIsAutoRotate(false);
            setManual(v);
        },
        isAutoRotate,
        toggleAutoRotate: (): void => setIsAutoRotate(v => !v),
        // A tournament with videos needs tabs whatever its layout, or the Video view is unreachable.
        showTabs: layout.showTabs || showVideo,
        showVideo,
        canAutoRotate: layout.canAutoRotate,
    };
}
