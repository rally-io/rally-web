import { useEffect, useMemo, useState } from 'react';
import type { PublicBracketData } from '../types';

export type ViewMode = 'groups' | 'games' | 'standings' | 'knockout' | 'plate' | 'video';

/** Which stage of a group-then-knockout tournament auto-rotate should follow. */
export type RotationPhase = 'group' | 'knockout';

/** One tab must be readable before the next arrives: six standings tables take longer than 5s. */
export const ROTATE_MS = 12000;

function knockoutHasPlayers(bracket: PublicBracketData): boolean {
    return bracket.knockout_rounds.some(r => r.matches.some(m => m.team_a?.player_1 || m.team_b?.player_1));
}

/**
 * The auto-rotate phase for a bracket. Reuses `knockoutHasPlayers` — the same signal
 * that already picks the default view — as "the knockout stage has started", rather
 * than inventing a second notion of phase.
 */
export function getRotationPhase(bracket: PublicBracketData | null): RotationPhase {
    return bracket && knockoutHasPlayers(bracket) ? 'knockout' : 'group';
}

/**
 * Ordered list of views to cycle through for a given phase.
 *
 * The group phase has two screens — the standings tables and the match lanes — because each does
 * one job at a size readable across a hall. Both are worth rotating between from the moment the
 * draw exists: before the first result the tables still answer "which pairs are in my group",
 * which is the question the hall is asking while it waits. `GroupBoardCard` holds back the
 * numerals, the cutoff line and the stat columns until a result earns them, so a pre-start
 * rotation shows names — never an order no game has produced.
 *
 * This gates on the draw rather than on results because a bracket with no groups drawn yet has
 * two empty screens to alternate between, and a toggle that swaps one blank for another is the
 * "lights up and rotates nothing" case `canAutoRotate` exists to prevent. A single-entry list
 * makes `canAutoRotate` false, so no toggle is offered and no interval starts.
 */
export function getRotationViews(phase: RotationPhase, showPlate: boolean, hasGroups: boolean): ViewMode[] {
    if (phase === 'knockout') {
        return showPlate ? ['knockout', 'plate', 'groups'] : ['knockout', 'groups'];
    }
    return hasGroups ? ['groups', 'games'] : ['games'];
}

type UseViewModeResult = {
    view: ViewMode;
    selectView: (v: ViewMode) => void;
    isAutoRotate: boolean;
    toggleAutoRotate: () => void;
    showTabs: boolean;
    showPlate: boolean;
    showVideo: boolean;
    /**
     * False when the phase has a single view, or when the bracket's structure isn't
     * group_then_knockout (rotation only exists on that structure's branch of `view`
     * below) — hide the toggle rather than let it light up and rotate nothing.
     */
    canAutoRotate: boolean;
};

export function useViewMode(bracket: PublicBracketData | null, isBigScreen = false): UseViewModeResult {
    const [manual, setManual] = useState<ViewMode | null>(null);
    // On an unattended venue screen both tabs have to be seen without anyone touching anything,
    // so rotation starts on. A phone is read by one person who chooses; it starts off.
    // Initial state only: a window resized across the breakpoint after mount will not retro-start.
    const [isAutoRotate, setIsAutoRotate] = useState(isBigScreen);
    const [rotateIndex, setRotateIndex] = useState(0);

    const showPlate = (bracket?.plate_rounds.length ?? 0) > 0;
    const showVideo = (bracket?.videos.length ?? 0) > 0;
    const phase = useMemo(() => getRotationPhase(bracket), [bracket]);
    const hasGroups = (bracket?.groups?.length ?? 0) > 0;
    const rotationViews = useMemo(
        () => getRotationViews(phase, showPlate, hasGroups),
        [phase, showPlate, hasGroups],
    );

    // A phase flip (group stage finishing, knockout starting, or vice versa) makes
    // whatever index we were on stale — it may point outside the new pair's meaning
    // entirely. Snap to the new pair's first view instead of carrying it over.
    useEffect(() => {
        setRotateIndex(0);
    }, [phase]);

    useEffect(() => {
        // Nothing to rotate to (no groups drawn yet, or a single-view phase) — don't spin up
        // a no-op interval that ticks every 12s and never changes anything observable.
        if (!isAutoRotate || rotationViews.length <= 1) return;
        const id = setInterval(() => {
            setRotateIndex(i => (i + 1) % rotationViews.length);
        }, ROTATE_MS);
        return () => clearInterval(id);
    }, [isAutoRotate, rotationViews.length]);

    const rotateView = rotationViews[rotateIndex % rotationViews.length];

    const view = useMemo<ViewMode>(() => {
        if (!bracket) return 'knockout';
        if (bracket.structure !== 'group_then_knockout') {
            // A manual Video pick has to survive here too — this is the branch every
            // single-elimination and league tournament takes.
            if (manual === 'video' && showVideo) return 'video';
            // 'standings' rather than 'groups' for a league so the tab highlight matches
            // the label. Inert for rendering: the page's isLeague branch ignores which
            // of the two it is.
            return bracket.structure === 'round_robin_league' ? 'standings' : 'knockout';
        }
        if (isAutoRotate) return rotateView;
        // Where the screen lands with nothing selected — and where a manual
        // selection falls back to when its view disappears. Same rule either way:
        // a plate disabled mid-view during the finals must not drop the venue TV
        // onto the group tables while the main final is on court. Mirrors the CRM
        // dashboard's `effectiveView`.
        const stageDefault: ViewMode = knockoutHasPlayers(bracket) ? 'knockout' : 'groups';
        if (manual) {
            if (manual === 'plate' && !showPlate) return stageDefault;
            if (manual === 'video' && !showVideo) return stageDefault;
            return manual;
        }
        return stageDefault;
    }, [bracket, manual, isAutoRotate, rotateView, showPlate, showVideo]);

    return {
        view,
        selectView: (v: ViewMode): void => {
            setIsAutoRotate(false);
            setManual(v);
        },
        isAutoRotate,
        toggleAutoRotate: (): void => setIsAutoRotate(v => !v),
        // Tabs used to exist only for group+knockout. A tournament with videos needs
        // them whatever its structure, or the Video view is unreachable.
        showTabs: bracket?.structure === 'group_then_knockout' || showVideo,
        showPlate,
        showVideo,
        // Rotation is only possible on group_then_knockout: it's the only structure whose
        // branch of the `view` memo above ever reads `isAutoRotate`/`rotateView`. Every other
        // structure returns early without consulting them, so offering the toggle there would
        // light up and rotate nothing — a visible lie on a venue TV.
        canAutoRotate: bracket?.structure === 'group_then_knockout' && rotationViews.length > 1,
    };
}
