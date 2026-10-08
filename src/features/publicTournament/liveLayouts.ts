import { getFinalRoundNumber, isAmericanoLive } from './americano';
import { usesLeagueLayout } from './utils';
import type { PublicBracketData } from './types';

export type ViewMode = 'groups' | 'games' | 'standings' | 'knockout' | 'plate' | 'video' | 'final';

/** How the live page draws a tournament. A new tournament type adds a kind here and a renderer in LiveLayoutView. */
export type LayoutKind = 'knockout' | 'groups' | 'league' | 'americano';

/** Which stage of a group-then-knockout tournament auto-rotate should follow. */
export type RotationPhase = 'group' | 'knockout';

/**
 * Everything the view hook and the page need to know about one kind of live layout. The hook and
 * the page read only this — neither branches on `structure` — so a new tournament type is one
 * more descriptor here, not another branch in each of them.
 */
export type LiveLayout = {
    kind: LayoutKind;
    /** A tab bar even without videos (the hook adds one whenever there are videos). */
    showTabs: boolean;
    /** The views a venue TV cycles through, in order. Empty: this layout never rotates. */
    rotationViews: ViewMode[];
    /** More than one view to cycle through, so the TV offers the rotate toggle. */
    canAutoRotate: boolean;
    /** The tabs, in order, without Video (the hook appends it). The lanes are a TV layout, so screen size decides one. */
    tabs: (isBigScreen: boolean) => ViewMode[];
    /** Where the screen lands with nothing picked, and where a pick that no longer applies falls back to. */
    defaultView: ViewMode;
    /** Whether a viewer's pick is still on offer. Video is the hook's call: it exists whenever there are videos. */
    accepts: (view: ViewMode) => boolean;
    /** A change restarts the rotation at its first view: the tournament moved to a new stage. */
    stage: string;
    /** A view that, once it appears, takes every screen to it and drops an earlier pick. */
    takeover: ViewMode | null;
};

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

/**
 * An Americano's rotation (owner 2026-10-03): the games and the table; once the final round is
 * drawn, the final and the table. The stage being played comes first, as in group+knockout's
 * phase flip.
 */
export function getAmericanoRotationViews(finalDrawn: boolean): ViewMode[] {
    return finalDrawn ? ['final', 'standings'] : ['games', 'standings'];
}

/** A layout with one screen and no rotation: a knockout's bracket, or a league's table and rounds. */
function singleViewLayout(kind: 'knockout' | 'league', view: ViewMode): LiveLayout {
    return {
        kind,
        showTabs: false,
        rotationViews: [],
        canAutoRotate: false,
        tabs: () => [view],
        defaultView: view,
        accepts: () => false,
        stage: kind,
        takeover: null,
    };
}

function groupsLayout(bracket: PublicBracketData): LiveLayout {
    const phase = getRotationPhase(bracket);
    const showPlate = bracket.plate_rounds.length > 0;
    const rotationViews = getRotationViews(phase, showPlate, (bracket.groups?.length ?? 0) > 0);
    return {
        kind: 'groups',
        showTabs: true,
        rotationViews,
        canAutoRotate: rotationViews.length > 1,
        tabs: isBigScreen => {
            // The lanes are a TV layout; the phone keeps its standings tab instead.
            const tabs: ViewMode[] = ['groups', isBigScreen ? 'games' : 'standings', 'knockout'];
            if (showPlate) tabs.push('plate');
            return tabs;
        },
        // Where the screen lands with nothing selected, and where a manual selection falls back
        // to when its view disappears. Same rule either way: a plate disabled mid-view during the
        // finals must not drop the venue TV onto the group tables while the main final is on
        // court. Mirrors the CRM dashboard's `effectiveView`.
        defaultView: phase === 'knockout' ? 'knockout' : 'groups',
        accepts: view => view !== 'plate' || showPlate,
        stage: phase,
        takeover: null,
    };
}

function americanoLayout(bracket: PublicBracketData): LiveLayout {
    const finalDrawn = getFinalRoundNumber(bracket) != null;
    const rotationViews = getAmericanoRotationViews(finalDrawn);
    return {
        kind: 'americano',
        showTabs: true,
        rotationViews,
        canAutoRotate: rotationViews.length > 1,
        tabs: () => (finalDrawn ? ['standings', 'games', 'final'] : ['standings', 'games']),
        defaultView: finalDrawn ? 'final' : 'standings',
        accepts: view => view === 'standings' || view === 'games' || (view === 'final' && finalDrawn),
        stage: 'americano',
        // The final round appearing is the evening's last stage: every screen jumps to it and a
        // tab someone picked earlier is dropped (owner 2026-10-03).
        takeover: finalDrawn ? 'final' : null,
    };
}

/**
 * The live layout for a bracket.
 *
 * An Americano gets its own tabs once its schedule is out (owner 2026-10-03). Before that — or a
 * league — it is the league's one-screen layout: `toLiveBoard` (./americano.ts) has put an
 * Americano's rounds and table where a league keeps them, and with no games yet the page shows the
 * empty board a league shows before its draw.
 */
export function getLiveLayout(bracket: PublicBracketData | null): LiveLayout {
    if (!bracket) return singleViewLayout('knockout', 'knockout');
    if (isAmericanoLive(bracket)) return americanoLayout(bracket);
    if (bracket.structure === 'group_then_knockout') return groupsLayout(bracket);
    // 'standings' rather than 'groups' for a league, so the tab highlight matches the label.
    if (usesLeagueLayout(bracket.structure)) return singleViewLayout('league', 'standings');
    return singleViewLayout('knockout', 'knockout');
}
