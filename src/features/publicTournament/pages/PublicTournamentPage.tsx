import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import '../themes.css';
import { usePublicBracket } from '../hooks/usePublicBracket';
import { useTheme } from '../hooks/useTheme';
import { useViewMode } from '../hooks/useViewMode';
import { BIG_SCREEN_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { PublicHeader } from '../components/PublicHeader';
import { LiveNowStrip } from '../components/LiveNowStrip';
import { LiveNowBar } from '../components/LiveNowBar';
import { TvCanvas } from '../components/TvCanvas';
import { ViewTabs } from '../components/ViewTabs';
import { KnockoutMobile } from '../components/KnockoutMobile';
import { BracketTreeTV } from '../components/BracketTreeTV';
import { GroupsView } from '../components/GroupsView';
import { StandingsTable } from '../components/StandingsTable';
import { QrPanel } from '../components/QrPanel';
import { LiveTicker } from '../components/LiveTicker';
import { SponsorStrip } from '../components/SponsorStrip';
import { EmptyBracket, ErrorScreen, LoadingScreen } from '../components/PageStates';
import { detectDir, liveMatches, upcomingMatches } from '../utils';

const GROUP_QUALIFY_COUNT = 2; // product default: top 2 advance from each group

export default function PublicTournamentPage(): React.ReactElement | null {
    const { t, i18n } = useTranslation();
    const { token } = useParams<{ token: string }>();
    const { bracket, isLoading, isExpired, isHardError, isReconnecting, updatedAt } = usePublicBracket(token);
    const { theme, cycleTheme } = useTheme();
    const { view, selectView, isAutoRotate, toggleAutoRotate, showTabs, showPlate, canAutoRotate } = useViewMode(bracket);
    const isBigScreen = useMediaQuery(BIG_SCREEN_QUERY);

    const dir = useMemo(() => {
        if (i18n.language === 'he') return 'rtl';
        return bracket ? detectDir(bracket) : 'ltr';
    }, [bracket, i18n.language]);

    useEffect(() => {
        if (bracket?.tournament_name) document.title = `${bracket.tournament_name} · Rally`;
        return () => {
            document.title = 'Rally';
        };
    }, [bracket?.tournament_name]);

    const live = useMemo(() => (bracket ? liveMatches(bracket) : []), [bracket]);
    const upcoming = useMemo(() => (bracket ? upcomingMatches(bracket, 5) : []), [bracket]);

    const shell = (children: React.ReactNode): React.ReactElement => (
        <div
            dir={dir}
            data-bracket-theme={theme}
            className={cn(
                'text-(--pb-text) [background:var(--pb-surface)]',
                // Big screen = a fixed design canvas scaled to the display, so the board looks the
                // same on any venue screen. Phone stays a normal scrollable document.
                isBigScreen ? 'h-screen overflow-hidden' : 'min-h-screen',
            )}
        >
            {isBigScreen ? <TvCanvas>{children}</TvCanvas> : children}
        </div>
    );

    if (isLoading) return shell(<LoadingScreen />);
    if (isHardError) return shell(<ErrorScreen isExpired={isExpired} />);
    if (!bracket) return null;

    const isGroupKnockout = bracket.structure === 'group_then_knockout';
    const isLeague = bracket.structure === 'round_robin_league';
    const hasKnockout = bracket.knockout_rounds.length > 0;
    const groups = bracket.groups ?? [];

    const knockout = hasKnockout
        ? isBigScreen
            ? <BracketTreeTV rounds={bracket.knockout_rounds} thirdPlaceMatch={bracket.third_place_match} showChampion />
            : <KnockoutMobile rounds={bracket.knockout_rounds} thirdPlaceMatch={bracket.third_place_match} dir={dir} showChampion />
        : <EmptyBracket />;

    const plate = bracket.plate_rounds.length > 0
        ? isBigScreen
            ? <BracketTreeTV rounds={bracket.plate_rounds} />
            : <KnockoutMobile rounds={bracket.plate_rounds} dir={dir} />
        : <EmptyBracket />;

    const groupsContent = groups.length > 0
        ? <GroupsView groups={groups} view={view} isBigScreen={isBigScreen} qualifyCount={isGroupKnockout ? GROUP_QUALIFY_COUNT : undefined} />
        : <EmptyBracket />;

    const leagueStandings = bracket.league_standings ?? [];
    const league = leagueStandings.length === 0 && !hasKnockout
        ? <EmptyBracket />
        : (
            <div className={isBigScreen ? 'grid grid-cols-2 gap-6 px-8 pb-8' : 'flex flex-col gap-4 px-4 pb-8'}>
                <StandingsTable title={t('public_bracket.league_table', 'League Table')} standings={leagueStandings} large={isBigScreen} />
                <div className={isBigScreen ? '' : '-mx-4'}>
                    <KnockoutMobile rounds={bracket.knockout_rounds} dir={dir} />
                </div>
            </div>
        );

    return shell(
        <>
            <PublicHeader
                tournamentName={bracket.tournament_name}
                isReconnecting={isReconnecting}
                updatedAt={updatedAt}
                theme={theme}
                onCycleTheme={cycleTheme}
                isBigScreen={isBigScreen}
                clubLogoUrl={bracket.club_logo_url}
                clubName={bracket.club_name}
            />
            {!isBigScreen && <LiveNowStrip matches={live} />}
            {showTabs && (
                <div className={isBigScreen ? 'mx-auto w-full max-w-md shrink-0 px-4 py-1' : 'px-4 py-3'}>
                    <ViewTabs
                        view={view}
                        onSelect={selectView}
                        isAutoRotate={isAutoRotate}
                        onToggleAutoRotate={toggleAutoRotate}
                        showAutoRotate={isBigScreen && canAutoRotate}
                        showPlate={showPlate}
                        showStandings={!isBigScreen}
                    />
                </div>
            )}
            {isBigScreen && view !== 'knockout' && view !== 'plate' && <LiveNowBar matches={live} />}
            <main className={cn(isBigScreen ? 'min-h-0 flex-1 overflow-hidden' : showTabs ? '' : 'pt-4')}>
                {isLeague ? league : view === 'knockout' ? knockout : view === 'plate' ? plate : groupsContent}
            </main>
            {isBigScreen && (
                <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-(--pb-border) bg-(--pb-card-header) px-8 pb-3 pt-2">
                    <QrPanel />
                    <LiveTicker live={live} upcoming={upcoming} />
                    <SponsorStrip sponsors={bracket.sponsors} />
                </footer>
            )}
        </>,
    );
}
