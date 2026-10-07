import React from 'react';
import { useTranslation } from 'react-i18next';
import { KnockoutMobile } from './KnockoutMobile';
import { BracketTreeTV } from './BracketTreeTV';
import { GroupsView, GROUP_ACCENTS } from './GroupsView';
import { LanesView } from './LanesView';
import { StandingsTable } from './StandingsTable';
import { AmericanoLayout } from './AmericanoLayout';
import { EmptyBracket } from './PageStates';
import type { LayoutKind, ViewMode } from '../liveLayouts';
import type { PublicBracketData, PublicRound } from '../types';

const GROUP_QUALIFY_COUNT = 2; // product default: top 2 advance from each group

type LayoutContext = {
    bracket: PublicBracketData;
    isBigScreen: boolean;
    dir: 'rtl' | 'ltr';
};

type LiveLayoutViewProps = LayoutContext & { kind: LayoutKind; view: ViewMode };

/** A bracket tree: the TV's centred tree, or the phone's round-by-round stepper. */
function Bracket({ rounds, ctx, finals }: { rounds: PublicRound[]; ctx: LayoutContext; finals: boolean }): React.ReactElement {
    if (rounds.length === 0) return <EmptyBracket />;
    const third = finals ? ctx.bracket.third_place_match : undefined;
    return ctx.isBigScreen
        ? <BracketTreeTV rounds={rounds} thirdPlaceMatch={third} showChampion={finals || undefined} />
        : <KnockoutMobile rounds={rounds} thirdPlaceMatch={third} dir={ctx.dir} showChampion={finals || undefined} />;
}

function GroupsLayout({ view, ctx }: { view: ViewMode; ctx: LayoutContext }): React.ReactElement {
    const { bracket, isBigScreen } = ctx;
    const groups = bracket.groups ?? [];
    if (view === 'knockout') return <Bracket rounds={bracket.knockout_rounds} ctx={ctx} finals />;
    if (view === 'plate') return <Bracket rounds={bracket.plate_rounds} ctx={ctx} finals={false} />;
    if (groups.length === 0) return <EmptyBracket />;
    // The lanes are the TV's games screen; the phone keeps its group tabs.
    if (view === 'games' && isBigScreen) return <LanesView groups={groups} accents={GROUP_ACCENTS} />;
    return <GroupsView groups={groups} view={view} isBigScreen={isBigScreen} qualifyCount={GROUP_QUALIFY_COUNT} />;
}

/** A league: its table beside the round-by-round games. */
function LeagueLayout({ ctx }: { ctx: LayoutContext }): React.ReactElement {
    const { t } = useTranslation();
    const { bracket, isBigScreen, dir } = ctx;
    const standings = bracket.league_standings ?? [];
    if (standings.length === 0 && bracket.knockout_rounds.length === 0) return <EmptyBracket />;
    return (
        <div className={isBigScreen ? 'grid grid-cols-2 gap-6 px-8 pb-8' : 'flex flex-col gap-4 px-4 pb-8'}>
            <StandingsTable title={t('public_bracket.league_table', 'League Table')} standings={standings} large={isBigScreen} mode="games" />
            <div className={isBigScreen ? '' : '-mx-4'}>
                <KnockoutMobile rounds={bracket.knockout_rounds} dir={dir} />
            </div>
        </div>
    );
}

/**
 * One renderer per layout kind (../liveLayouts.ts). A new tournament type adds a kind there and a
 * renderer here; the page itself never branches on the tournament's structure.
 */
const renderers: Record<LayoutKind, (view: ViewMode, ctx: LayoutContext) => React.ReactNode> = {
    knockout: (_view, ctx) => <Bracket rounds={ctx.bracket.knockout_rounds} ctx={ctx} finals />,
    groups: (view, ctx) => <GroupsLayout view={view} ctx={ctx} />,
    league: (_view, ctx) => <LeagueLayout ctx={ctx} />,
    americano: (view, ctx) => <AmericanoLayout view={view} {...ctx} />,
};

export function LiveLayoutView({ kind, view, ...ctx }: LiveLayoutViewProps): React.ReactElement {
    return <>{renderers[kind](view, ctx)}</>;
}
