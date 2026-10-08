import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import '../themes.css';
import { usePublicBracket } from '../hooks/usePublicBracket';
import { useTheme } from '../hooks/useTheme';
import { ROTATE_MS, useViewMode } from '../hooks/useViewMode';
import { BIG_SCREEN_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { PublicHeader } from '../components/PublicHeader';
import { LiveNowStrip } from '../components/LiveNowStrip';
import { TvCanvas } from '../components/TvCanvas';
import { ViewTabs } from '../components/ViewTabs';
import { LiveLayoutView } from '../components/LiveLayoutView';
import { CourtRail } from '../components/CourtRail';
import { QrPanel } from '../components/QrPanel';
import { SponsorStrip } from '../components/SponsorStrip';
import { VideoView } from '../components/VideoView';
import { ErrorScreen, LoadingScreen } from '../components/PageStates';
import { detectDir, liveMatches } from '../utils';

export default function PublicTournamentPage(): React.ReactElement | null {
    const { i18n } = useTranslation();
    const { token } = useParams<{ token: string }>();
    const { bracket, isLoading, isExpired, isHardError, isReconnecting, updatedAt } = usePublicBracket(token);
    const { theme, cycleTheme } = useTheme();
    const isBigScreen = useMediaQuery(BIG_SCREEN_QUERY);
    const { view, kind, tabs, selectView, isAutoRotate, toggleAutoRotate, showTabs, canAutoRotate } = useViewMode(bracket, isBigScreen);

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
                        tabs={tabs}
                        rotateMs={ROTATE_MS}
                    />
                </div>
            )}
            <main className={cn(isBigScreen ? 'min-h-0 flex-1 overflow-hidden' : showTabs ? '' : 'pt-4')}>
                {view === 'video'
                    ? <VideoView videos={bracket.videos} isBigScreen={isBigScreen} />
                    : <LiveLayoutView kind={kind} view={view} bracket={bracket} isBigScreen={isBigScreen} dir={dir} />}
            </main>
            {isBigScreen && (
                <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-(--pb-border) bg-(--pb-card-header) px-8 pb-3 pt-2">
                    <QrPanel />
                    {/* On every view, including the lanes. This used to be hidden on 'games' on the
                        grounds that a lane card already names its court — but a finished card shows
                        only "Final" with no court at all, and finding what is on court by scanning
                        two dozen lane cards for a red border is not the question the rail answers.

                        The cost of hiding it was a footer that emptied to just the QR panel on one
                        tab out of the set, which is now a band of dead space appearing and
                        disappearing every 12 seconds as the board rotates. Same tiles, same place,
                        all evening. */}
                    <CourtRail bracket={bracket} />
                    <SponsorStrip sponsors={bracket.sponsors} />
                </footer>
            )}
        </>,
    );
}
